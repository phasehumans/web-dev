import { ToolExecuteContext } from '@december/shared'
import { mock } from 'bun:test'

export function createMockContext(): ToolExecuteContext {
    return {
        operations: {
            bash: {
                exec: mock(async () => ({ exitCode: 0, output: '' })),
                getTaskStatus: mock(async () => ({ status: 'running', output: '' })),
                killTask: mock(async () => true),
            },
            fs: {
                readFile: mock(async () => ''),
                writeFile: mock(async () => undefined),
                readdir: mock(async () => []),
            },
            search: {
                find: mock(async () => ''),
                grep: mock(async () => ''),
            },
            env: {
                cwd: mock(() => '/mock/cwd'),
                get: mock((key: string) => undefined),
            },
            ui: {
                askQuestion: mock(async () => ''),
            },
        },
        env: new Map(),
        onStream: mock(),
        spawnSubagent: mock(async () => ''),
    }
}
