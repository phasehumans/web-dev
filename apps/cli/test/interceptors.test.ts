import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as configModule from '../src/config'
import { setupAgentInterceptors } from '../src/store/interceptors'

vi.mock('../src/config', () => ({
    loadConfig: vi.fn(),
    saveConfig: vi.fn(),
}))

describe('setupAgentInterceptors', () => {
    let mockAgent: any
    let mockStoreState: any

    beforeEach(() => {
        vi.clearAllMocks()
        mockAgent = {
            operations: { ui: {} },
        }
        mockStoreState = {
            setAuthMode: vi.fn(),
            setPendingQuestions: vi.fn(),
            setPendingToolCall: vi.fn(),
        }
    })

    it('sets up askQuestion interceptor', async () => {
        setupAgentInterceptors(mockAgent, mockStoreState)
        expect(mockAgent.operations.ui.askQuestion).toBeDefined()

        const p = mockAgent.operations.ui.askQuestion(['q1', 'q2'])
        expect(mockStoreState.setAuthMode).toHaveBeenCalledWith('ask_question')
        expect(mockStoreState.setPendingQuestions).toHaveBeenCalledWith(
            expect.objectContaining({ questions: ['q1', 'q2'] })
        )
        const { resolve } = mockStoreState.setPendingQuestions.mock.calls[0][0]
        resolve('answer')
        await expect(p).resolves.toBe('answer')
    })

    describe('requestPermission', () => {
        beforeEach(() => {
            setupAgentInterceptors(mockAgent, mockStoreState)
        })

        it('allows everything if toolPermission is always-proceed', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({
                toolPermission: 'always-proceed',
            } as any)
            const result = await mockAgent.operations.ui.requestPermission({ name: 'run_command' })
            expect(result).toEqual({ block: false })
            expect(mockStoreState.setAuthMode).not.toHaveBeenCalled()
        })

        it('allows non-modifying tools', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({} as any)
            const result = await mockAgent.operations.ui.requestPermission({ name: 'read_file' })
            expect(result).toEqual({ block: false })
            expect(mockStoreState.setAuthMode).not.toHaveBeenCalled()
        })

        it('allows approved commands', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({
                approvedTools: ['npm install'],
            } as any)
            const result = await mockAgent.operations.ui.requestPermission({
                name: 'run_command',
                input: { CommandLine: 'npm install' },
            })
            expect(result).toEqual({ block: false })
            expect(mockStoreState.setAuthMode).not.toHaveBeenCalled()
        })

        it('blocks and requests permission for unknown modifying tools', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({} as any)
            const tc = { name: 'replace_file_content', input: { TargetFile: 'a.txt' } }
            const p = mockAgent.operations.ui.requestPermission(tc)

            await new Promise((r) => setTimeout(r, 10))

            expect(mockStoreState.setAuthMode).toHaveBeenCalledWith('tool_permission')
            expect(mockStoreState.setPendingToolCall).toHaveBeenCalledWith(
                expect.objectContaining({ toolCall: tc })
            )

            const { resolve } = mockStoreState.setPendingToolCall.mock.calls[0][0]
            resolve({ block: false })
            await expect(p).resolves.toEqual({ block: false })
        })

        it('persists session approval when allowAlways is selected', async () => {
            const configObj: any = { approvedTools: [] }
            ;(configModule.loadConfig as any).mockResolvedValue(configObj)
            const tc = { name: 'write_to_file', input: { TargetFile: 'new.ts' } }
            const p = mockAgent.operations.ui.requestPermission(tc)

            await new Promise((r) => setTimeout(r, 10))

            const { resolve } = mockStoreState.setPendingToolCall.mock.calls[0][0]
            resolve({ block: false, allowAlways: true })
            await expect(p).resolves.toEqual({ block: false })

            expect(configModule.saveConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    approvedTools: expect.arrayContaining([
                        'write_to_file',
                        'write_to_file: new.ts',
                    ]),
                })
            )
        })

        it('returns block=true when user denies permission', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({} as any)
            const tc = { name: 'run_command', input: { CommandLine: 'rm -rf /' } }
            const p = mockAgent.operations.ui.requestPermission(tc)

            await new Promise((r) => setTimeout(r, 10))

            const { resolve } = mockStoreState.setPendingToolCall.mock.calls[0][0]
            resolve({ block: true, error: 'User denied permission' })
            await expect(p).resolves.toEqual({ block: true, error: 'User denied permission' })
        })

        it('blocks file operations outside process.cwd() when nonWorkspaceAccess is false', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({ nonWorkspaceAccess: false })
            const toolCall = {
                name: 'view_file',
                input: { AbsolutePath: '/tmp/external/file.ts' },
            }
            const result = await mockAgent.operations.ui.requestPermission(toolCall)
            expect(result).toEqual({
                block: true,
                error: 'Access denied: Non-workspace access is disabled in settings',
            })
        })

        it('allows file operations outside process.cwd() when nonWorkspaceAccess is true', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({
                nonWorkspaceAccess: true,
                toolPermission: 'always-proceed',
            })
            const toolCall = {
                name: 'view_file',
                input: { AbsolutePath: '/tmp/external/file.ts' },
            }
            const result = await mockAgent.operations.ui.requestPermission(toolCall)
            expect(result).toEqual({ block: false })
        })

        it('blocks system root paths and private keys unconditionally via PathGuard', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({
                nonWorkspaceAccess: true,
                toolPermission: 'always-proceed',
            })
            const sysResult = await mockAgent.operations.ui.requestPermission({
                name: 'view_file',
                input: { AbsolutePath: '/etc/passwd' },
            })
            expect(sysResult.block).toBe(true)
            expect(sysResult.error).toContain('PathGuard restricted system or credential path')

            const keyResult = await mockAgent.operations.ui.requestPermission({
                name: 'view_file',
                input: { AbsolutePath: '~/.ssh/id_rsa' },
            })
            expect(keyResult.block).toBe(true)
            expect(keyResult.error).toContain('PathGuard restricted system or credential path')
        })

        it('triggers confirmation dialogue for workspace .env secrets even under always-proceed', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({
                toolPermission: 'always-proceed',
            })
            const toolCall = {
                name: 'view_file',
                input: { AbsolutePath: '.env' },
            }
            const p = mockAgent.operations.ui.requestPermission(toolCall)
            await new Promise((r) => setTimeout(r, 10))

            expect(mockStoreState.setAuthMode).toHaveBeenCalledWith('tool_permission')
            const { resolve } = mockStoreState.setPendingToolCall.mock.calls[0][0]
            resolve({ block: false })
            await expect(p).resolves.toEqual({ block: false })
        })

        it('mandates manual confirmation for destructive commands like rm -rf and git reset --hard', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({
                toolPermission: 'always-proceed',
                approvedTools: ['rm -rf *', 'git reset --hard'],
            })
            const toolCall = {
                name: 'run_command',
                input: { CommandLine: 'rm -rf ./build' },
            }
            const p = mockAgent.operations.ui.requestPermission(toolCall)
            await new Promise((r) => setTimeout(r, 10))

            expect(mockStoreState.setAuthMode).toHaveBeenCalledWith('tool_permission')
            const { resolve } = mockStoreState.setPendingToolCall.mock.calls[0][0]
            resolve({ block: false })
            await expect(p).resolves.toEqual({ block: false })
        })

        it('allows file operations inside process.cwd() when nonWorkspaceAccess is false', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({
                nonWorkspaceAccess: false,
                toolPermission: 'always-proceed',
            })
            const toolCall = {
                name: 'view_file',
                input: { AbsolutePath: `${process.cwd()}/src/index.ts` },
            }
            const result = await mockAgent.operations.ui.requestPermission(toolCall)
            expect(result).toEqual({ block: false })
        })

        it('allows auto-approved MCP tools without prompting', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({
                toolPermission: 'always-ask',
            })
            mockAgent.mcpPool = {
                isAutoApproved: vi.fn(
                    (server, tool) => server === 'github' && tool === 'list_repos'
                ),
            }

            const toolCall = {
                name: 'github__list_repos',
                input: {},
            }
            const result = await mockAgent.operations.ui.requestPermission(toolCall)
            expect(result).toEqual({ block: false })
            expect(mockStoreState.setAuthMode).not.toHaveBeenCalled()
        })

        it('prompts user for non-autoapproved MCP tools when confirmation mode is enabled', async () => {
            ;(configModule.loadConfig as any).mockResolvedValue({
                toolPermission: 'always-ask',
            })
            mockAgent.mcpPool = {
                isAutoApproved: vi.fn(() => false),
            }

            const toolCall = {
                name: 'github__delete_repo',
                input: { repo: 'phasehumans/december' },
            }
            const p = mockAgent.operations.ui.requestPermission(toolCall)

            await new Promise((r) => setTimeout(r, 10))

            expect(mockStoreState.setAuthMode).toHaveBeenCalledWith('tool_permission')
            expect(mockStoreState.setPendingToolCall).toHaveBeenCalledWith(
                expect.objectContaining({ toolCall })
            )

            const { resolve } = mockStoreState.setPendingToolCall.mock.calls[0][0]
            resolve({ block: false })
            await expect(p).resolves.toEqual({ block: false })
        })
    })
})
