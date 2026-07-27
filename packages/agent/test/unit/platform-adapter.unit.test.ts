import { describe, test, expect, mock } from 'bun:test'

import type { PlatformAdapter } from '../../src/platform-adapter'

describe('PlatformAdapter Interface (Unit)', () => {
    test('satisfies PlatformAdapter contract when implemented', async () => {
        const adapter: PlatformAdapter = {
            fs: {
                readFile: mock(async () => 'file content'),
                writeFile: mock(async () => {}),
                readdir: mock(async () => ['file1.txt']),
                mkdir: mock(async () => {}),
                exists: mock(async () => true),
            },
            bash: {
                exec: mock(async (cmd) => ({ exitCode: 0, output: `ran ${cmd}` })),
            },
            search: {
                find: mock(async () => 'found file'),
                grep: mock(async () => 'match line'),
            },
            ui: {
                askQuestion: mock(async () => 'answer'),
                requestPermission: mock(async () => ({ block: false })),
            },
            env: {
                cwd: mock(() => '/workspace'),
                get: mock((key) => (key === 'FOO' ? 'BAR' : undefined)),
            },
        }

        expect(await adapter.fs.readFile('/path')).toBe('file content')
        expect(await adapter.bash.exec('ls')).toEqual({ exitCode: 0, output: 'ran ls' })
        expect(await adapter.search.grep('/path', 'pattern')).toBe('match line')
        expect(await adapter.ui?.askQuestion([])).toBe('answer')
        expect(await adapter.ui?.requestPermission?.({})).toEqual({ block: false })
        expect(adapter.env.cwd()).toBe('/workspace')
        expect(adapter.env.get('FOO')).toBe('BAR')
        expect(adapter.env.get('BAZ')).toBeUndefined()
    })
})
