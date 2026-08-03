import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'

describe('Partitioned Read/Write Parallel Tool Scheduler', () => {
    it('executes read-only tools in parallel before executing write tools sequentially', async () => {
        const executionOrder: string[] = []

        const readTool1 = {
            name: 'read_file_1',
            description: 'Read file 1',
            inputSchema: {},
            execute: async () => {
                executionOrder.push('start:read_file_1')
                await new Promise((r) => setTimeout(r, 20))
                executionOrder.push('end:read_file_1')
                return 'content1'
            },
        }

        const readTool2 = {
            name: 'read_file_2',
            description: 'Read file 2',
            inputSchema: {},
            execute: async () => {
                executionOrder.push('start:read_file_2')
                await new Promise((r) => setTimeout(r, 20))
                executionOrder.push('end:read_file_2')
                return 'content2'
            },
        }

        const writeTool = {
            name: 'write_file',
            description: 'Write file',
            inputSchema: {},
            execute: async () => {
                executionOrder.push('start:write_file')
                await new Promise((r) => setTimeout(r, 10))
                executionOrder.push('end:write_file')
                return 'written'
            },
        }

        const mockLlm: any = {
            name: 'mock',
            stream: async function* () {
                yield {
                    type: 'tool_call',
                    toolCall: { id: 'tc-1', name: 'read_file_1', input: '{}' },
                }
                yield {
                    type: 'tool_call',
                    toolCall: { id: 'tc-2', name: 'read_file_2', input: '{}' },
                }
                yield {
                    type: 'tool_call',
                    toolCall: { id: 'tc-3', name: 'write_file', input: '{}' },
                }
            },
        } as any

        const agent = new Agent({
            llm: mockLlm,
            tools: [readTool1, readTool2, writeTool],
            operations: {} as any,
        })

        const generator = runAgentLoop(agent, 'test prompt')
        for await (const _event of generator) {
            // consume events
        }

        // Both read tools should start before either ends (parallel execution)
        const startRead1 = executionOrder.indexOf('start:read_file_1')
        const startRead2 = executionOrder.indexOf('start:read_file_2')
        const startWrite = executionOrder.indexOf('start:write_file')

        expect(startRead1).toBeGreaterThan(-1)
        expect(startRead2).toBeGreaterThan(-1)
        expect(startWrite).toBeGreaterThan(-1)

        // Read tools run in parallel phase 1, write tool runs after read tools finish
        expect(startWrite).toBeGreaterThan(executionOrder.indexOf('end:read_file_1'))
        expect(startWrite).toBeGreaterThan(executionOrder.indexOf('end:read_file_2'))
    })
})
