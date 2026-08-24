import { prisma } from '@december/database'
import { describe, it, expect, beforeEach, mock } from 'bun:test'

import { processGrpcStream } from '../../src/listener'
import { syncWorkspaceFilesToS3 } from '../../src/workspace'

describe('Worker Automated Persistence & S3 Workspace Sync', () => {
    let messageCreateMock: ReturnType<typeof mock>
    let messageFindFirstMock: ReturnType<typeof mock>
    let usageCreateMock: ReturnType<typeof mock>
    let sessionFindUniqueMock: ReturnType<typeof mock>
    let sessionUpdateMock: ReturnType<typeof mock>

    beforeEach(() => {
        messageCreateMock = mock(
            async (args: any) => ({ id: 'msg-created-1', ...args.data }) as any
        )
        messageFindFirstMock = mock(async () => ({ sequence: 1 }) as any)
        usageCreateMock = mock(async (args: any) => ({ id: 'usage-1', ...args.data }) as any)
        sessionFindUniqueMock = mock(async () => ({ userId: 'user-123' }) as any)
        sessionUpdateMock = mock(async () => ({}) as any)

        prisma.message.create = messageCreateMock as any
        prisma.message.findFirst = messageFindFirstMock as any
        prisma.usageEvent.create = usageCreateMock as any
        prisma.session.findUnique = sessionFindUniqueMock as any
        prisma.session.update = sessionUpdateMock as any
        prisma.$transaction = mock(async (cb: any) => cb(prisma)) as any
    })

    it('accumulates stream events and persists assistant Message with structured blocks on TurnEnd', async () => {
        const sessionId = 'test-session-stream-1'

        async function* mockStream() {
            yield {
                data: JSON.stringify({
                    type: 'ThinkingChunk',
                    content: 'Analyzing repository structure...',
                }),
            }
            yield {
                data: JSON.stringify({
                    type: 'ToolCallStart',
                    toolCall: {
                        id: 'tc-bash-1',
                        name: 'bash',
                        input: { command: 'npm list' },
                    },
                }),
            }
            yield {
                data: JSON.stringify({
                    type: 'ToolExecutionUpdate',
                    toolCallId: 'tc-bash-1',
                    chunk: 'project@1.0.0 /workspace\n',
                }),
            }
            yield {
                data: JSON.stringify({
                    type: 'ToolCallResult',
                    result: {
                        toolCallId: 'tc-bash-1',
                        output: 'project@1.0.0 /workspace\n',
                    },
                }),
            }
            yield {
                data: JSON.stringify({
                    type: 'StreamChunk',
                    content: 'Done analyzing dependencies.',
                }),
            }
            yield {
                data: JSON.stringify({
                    type: 'TurnEnd',
                }),
            }
        }

        await processGrpcStream(sessionId, mockStream())

        expect(messageCreateMock).toHaveBeenCalled()
        const createCallArgs = messageCreateMock.mock.calls[0][0]
        expect(createCallArgs.data.sessionId).toBe(sessionId)
        expect(createCallArgs.data.role).toBe('ASSISTANT')
        expect(createCallArgs.data.status).toBe('done')
        expect(createCallArgs.data.sequence).toBe(2)
        expect(createCallArgs.data.content).toBe('Done analyzing dependencies.')

        const blocks = createCallArgs.data.blocks
        expect(blocks).toBeDefined()
        expect(blocks).toHaveLength(3)
        expect(blocks[0]).toEqual({
            type: 'thinking',
            content: 'Analyzing repository structure...',
        })
        expect(blocks[1]).toEqual({
            type: 'command',
            toolCallId: 'tc-bash-1',
            toolName: 'bash',
            toolInput: { command: 'npm list' },
            status: 'success',
            output: 'project@1.0.0 /workspace\n',
        })
        expect(blocks[2]).toEqual({
            type: 'text',
            content: 'Done analyzing dependencies.',
        })
    })

    it('records token usage event metrics on AgentUsage event', async () => {
        const sessionId = 'test-session-usage-1'

        async function* mockUsageStream() {
            yield {
                data: JSON.stringify({
                    type: 'AgentUsage',
                    promptTokens: 450,
                    completionTokens: 120,
                    model: 'gemini-3.6-flash',
                }),
            }
            yield {
                data: JSON.stringify({
                    type: 'AgentEnd',
                }),
            }
        }

        await processGrpcStream(sessionId, mockUsageStream())

        expect(usageCreateMock).toHaveBeenCalled()
        const usageArgs = usageCreateMock.mock.calls[0][0]
        expect(usageArgs.data.sessionId).toBe(sessionId)
        expect(usageArgs.data.userId).toBe('user-123')
        expect(usageArgs.data.inputTokens).toBe(450)
        expect(usageArgs.data.outputTokens).toBe(120)
        expect(usageArgs.data.totalTokens).toBe(570)
        expect(usageArgs.data.model).toBe('gemini-3.6-flash')
    })

    it('syncWorkspaceFilesToS3 batch uploads modified sandbox files', async () => {
        const sessionId = 'test-session-s3-sync'
        const mockSandbox = {
            commands: {
                run: async (cmd: string) => {
                    if (cmd.includes('cat "/workspace/src/App.tsx"')) {
                        return {
                            stdout: Buffer.from('export default function App() {}').toString(
                                'base64'
                            ),
                        }
                    }
                    return { stdout: '' }
                },
            },
        }

        const uploaded = await syncWorkspaceFilesToS3({
            sessionId,
            modifiedFiles: ['src/App.tsx'],
            sandbox: mockSandbox,
        })

        expect(uploaded).toEqual(['src/App.tsx'])
    })
})
