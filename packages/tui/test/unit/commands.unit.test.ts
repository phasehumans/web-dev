import { describe, expect, test, mock } from 'bun:test'

import { COMMANDS } from '../../src/components/command-menu/commands'

describe('/update command action', () => {
    test('should define update command forwarded to chat screen', async () => {
        const updateCmd = COMMANDS.find((c) => c.name === 'update')
        expect(updateCmd).toBeDefined()
        expect(updateCmd?.value).toBe('/update')
        expect(updateCmd?.description).toBe('Update to the latest version')

        const mockContext: any = {
            toast: {
                show: () => {},
            },
            agent: {
                saveContext: mock(async () => {}),
            },
            exit: () => {},
        }

        expect(() => updateCmd?.action(mockContext)).not.toThrow()
    })
})

describe('/clear & /new commands', () => {
    test('clearContext and resetChat are called on /clear', async () => {
        const clearCmd = COMMANDS.find((c) => c.name === 'clear')
        expect(clearCmd).toBeDefined()

        const mockClear = mock(async () => {})
        const mockReset = mock(() => {})
        const toastMsgs: any[] = []

        await clearCmd?.action({
            agent: { clearContext: mockClear },
            resetChat: mockReset,
            toast: { show: (m: any) => toastMsgs.push(m) },
        } as any)

        expect(mockClear).toHaveBeenCalledTimes(1)
        expect(mockReset).toHaveBeenCalledTimes(1)
        expect(toastMsgs[0]?.message).toContain('Cleared conversation')
    })

    test('newContext and resetChat are called on /new', async () => {
        const newCmd = COMMANDS.find((c) => c.name === 'new')
        expect(newCmd).toBeDefined()

        const mockNew = mock(async () => {})
        const mockReset = mock(() => {})
        const toastMsgs: any[] = []

        await newCmd?.action({
            agent: { newContext: mockNew },
            resetChat: mockReset,
            toast: { show: (m: any) => toastMsgs.push(m) },
        } as any)

        expect(mockNew).toHaveBeenCalledTimes(1)
        expect(mockReset).toHaveBeenCalledTimes(1)
        expect(toastMsgs[0]?.message).toContain('Started a new conversation')
    })
})

describe('/fork command', () => {
    test('forkContext is called on /fork', async () => {
        const forkCmd = COMMANDS.find((c) => c.name === 'fork')
        expect(forkCmd).toBeDefined()

        const mockFork = mock(async () => 'session-fork-123')
        const toastMsgs: any[] = []

        await forkCmd?.action({
            agent: { forkContext: mockFork },
            toast: { show: (m: any) => toastMsgs.push(m) },
        } as any)

        expect(mockFork).toHaveBeenCalledTimes(1)
        expect(toastMsgs[0]?.message).toContain('Forked to new session: session-fork-123')
    })
})

describe('/init command action', () => {
    test('scaffolds AGENTS.md in root and rules/skills in .december without headings', async () => {
        const fs = await import('node:fs')
        const path = await import('node:path')
        const os = await import('node:os')

        const initCmd = COMMANDS.find((c) => c.name === 'init')
        expect(initCmd).toBeDefined()

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tui-init-test-'))
        const originalCwd = process.cwd()

        try {
            process.chdir(tmpDir)

            const toastMessages: any[] = []
            const mockContext: any = {
                toast: {
                    show: (msg: any) => toastMessages.push(msg),
                },
            }

            initCmd?.action(mockContext)

            const agentsFile = path.join(tmpDir, 'AGENTS.md')
            const ignoreFile = path.join(tmpDir, '.decemberignore')
            const rulesFile = path.join(tmpDir, '.december', 'rules.md')
            const skillsFile = path.join(tmpDir, '.december', 'skills.md')
            const commandsFile = path.join(tmpDir, '.december', 'commands.json')
            const mcpFile = path.join(tmpDir, '.december', 'mcp.json')
            const settingsFile = path.join(tmpDir, '.december', 'settings.json')

            expect(fs.existsSync(agentsFile)).toBe(true)
            expect(fs.readFileSync(agentsFile, 'utf8')).toContain('Agent Guidelines')

            expect(fs.existsSync(ignoreFile)).toBe(true)
            expect(fs.existsSync(commandsFile)).toBe(true)
            expect(fs.existsSync(mcpFile)).toBe(true)
            expect(fs.existsSync(settingsFile)).toBe(true)

            expect(fs.existsSync(rulesFile)).toBe(true)
            const rulesContent = fs.readFileSync(rulesFile, 'utf8')
            expect(rulesContent).not.toContain('#')
            expect(rulesContent).toBe('Add rules in this file for the agent to use as context.\n')

            expect(fs.existsSync(skillsFile)).toBe(true)
            const skillsContent = fs.readFileSync(skillsFile, 'utf8')
            expect(skillsContent).not.toContain('#')
            expect(skillsContent).toBe('Add skills in this file for the agent to use as context.\n')

            expect(toastMessages[0]).toEqual({
                variant: 'success',
                message: 'Initialized December workspace successfully!',
            })

            // Second invocation
            toastMessages.length = 0
            initCmd?.action(mockContext)
            expect(toastMessages[0]).toEqual({
                message: 'December workspace is already initialized.',
            })
        } finally {
            process.chdir(originalCwd)
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
