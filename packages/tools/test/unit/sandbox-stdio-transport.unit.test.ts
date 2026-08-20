import { describe, expect, it, mock } from 'bun:test'

import { SandboxStdioTransport } from '../../src/mcp/transports/sandbox-stdio'

describe('SandboxStdioTransport (Unit)', () => {
    it('initializes and receives streaming line-delimited JSON-RPC messages from sandbox stdout', async () => {
        let capturedDataCallback: ((chunk: string) => void) | undefined

        const mockOperations: any = {
            bash: {
                exec: mock(async (cmd: string, onData?: (chunk: string) => void) => {
                    capturedDataCallback = onData
                    return { exitCode: 0, output: '', taskId: 'task-sandbox-123' }
                }),
                killTask: mock(async () => true),
            },
        }

        const transport = new SandboxStdioTransport({
            command: 'python',
            args: ['-m', 'mcp_server'],
            env: { DB_PORT: '5432' },
            operations: mockOperations,
            workspaceDir: '/workspace',
        })

        const receivedMessages: any[] = []
        transport.onmessage = (msg) => {
            receivedMessages.push(msg)
        }

        await transport.start()

        expect(mockOperations.bash.exec).toHaveBeenCalled()

        // Simulate streaming json-rpc chunks arriving from sandbox
        capturedDataCallback!('{"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"query"}]}}\n')

        expect(receivedMessages).toEqual([
            {
                jsonrpc: '2.0',
                id: 1,
                result: { tools: [{ name: 'query' }] },
            },
        ])
    })

    it('buffers partial chunks across streaming boundaries', async () => {
        let capturedDataCallback: ((chunk: string) => void) | undefined

        const mockOperations: any = {
            bash: {
                exec: mock(async (cmd: string, onData?: (chunk: string) => void) => {
                    capturedDataCallback = onData
                    return { exitCode: 0, output: '', taskId: 'task-sandbox-456' }
                }),
                killTask: mock(async () => true),
            },
        }

        const transport = new SandboxStdioTransport({
            command: 'node',
            args: ['server.js'],
            operations: mockOperations,
        })

        const receivedMessages: any[] = []
        transport.onmessage = (msg) => {
            receivedMessages.push(msg)
        }

        await transport.start()

        // Chunk 1: half of the json line
        capturedDataCallback!('{"jsonrpc":"2.0",')
        expect(receivedMessages.length).toBe(0)

        // Chunk 2: rest of the json line plus newline
        capturedDataCallback!('"id":2,"result":{"status":"ok"}}\n')
        expect(receivedMessages.length).toBe(1)
        expect(receivedMessages[0]).toEqual({
            jsonrpc: '2.0',
            id: 2,
            result: { status: 'ok' },
        })
    })

    it('sends JSON-RPC messages and closes cleanly', async () => {
        const mockOperations: any = {
            bash: {
                exec: mock(async () => {
                    return { exitCode: 0, output: '', taskId: 'task-sandbox-789' }
                }),
                killTask: mock(async () => true),
            },
        }

        const transport = new SandboxStdioTransport({
            command: 'uvx',
            args: ['mcp-server-sqlite'],
            operations: mockOperations,
        })

        let closed = false
        transport.onclose = () => {
            closed = true
        }

        await transport.start()

        await transport.send({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {},
        } as any)

        await transport.close()

        expect(mockOperations.bash.killTask).toHaveBeenCalledWith('task-sandbox-789')
        expect(closed).toBe(true)
    })
})
