import { describe, it, expect, beforeEach, spyOn } from 'bun:test'

import { RemotePlatformAdapter } from '../../src/remote-operations'
import * as runtime from '../../src/runtime'

describe('RemotePlatformAdapter Unit Tests (Mock E2B)', () => {
    let adapter: RemotePlatformAdapter

    beforeEach(() => {
        adapter = new RemotePlatformAdapter('mock-vm-unit-test')
    })

    it('should track modified files in writeFile and normalize /workspace paths', async () => {
        spyOn(runtime, 'executeCommand').mockImplementation(
            async (_vmId: string, _cmd: string, onData?: (chunk: string) => void) => {
                if (onData) onData('')
                return 0
            }
        )

        await adapter.fs.writeFile('/workspace/index.html', '<h1>Hello World</h1>')
        await adapter.fs.writeFile('/workspace/src/App.tsx', 'export const App = () => null')

        const modified = adapter.getModifiedFiles()
        expect(modified['index.html']).toBe('<h1>Hello World</h1>')
        expect(modified['src/App.tsx']).toBe('export const App = () => null')

        adapter.clearModifiedFiles()
        expect(Object.keys(adapter.getModifiedFiles()).length).toBe(0)
    })

    it('should read file content via cat command', async () => {
        spyOn(runtime, 'executeCommand').mockImplementation(
            async (_vmId: string, _cmd: string, onData?: (chunk: string) => void) => {
                const content = 'File content from mock cat'
                if (onData) onData(content)
                return 0
            }
        )

        const content = await adapter.fs.readFile('/workspace/index.html')
        expect(content).toBe('File content from mock cat')
    })

    it('should throw error when reading non-existent file fails exitCode', async () => {
        spyOn(runtime, 'executeCommand').mockImplementation(
            async (_vmId: string, _cmd: string, onData?: (chunk: string) => void) => {
                if (onData) onData('No such file or directory')
                return 1
            }
        )

        expect(adapter.fs.readFile('/workspace/missing.txt')).rejects.toThrow(
            'Failed to read file /workspace/missing.txt'
        )
    })

    it('should execute readdir and parse directory contents', async () => {
        spyOn(runtime, 'executeCommand').mockImplementation(
            async (_vmId: string, _cmd: string, onData?: (chunk: string) => void) => {
                const output = 'src/\nindex.html\npackage.json\n'
                if (onData) onData(output)
                return 0
            }
        )

        const entries = await adapter.fs.readdir('/workspace')
        expect(entries).toEqual(['[DIR ] src', '[FILE] index.html', '[FILE] package.json'])
    })

    it('should execute mkdir with recursive flag', async () => {
        let executedCmd = ''
        spyOn(runtime, 'executeCommand').mockImplementation(async (_vmId: string, cmd: string) => {
            executedCmd = cmd
            return 0
        })

        await adapter.fs.mkdir('/workspace/nested/dir', { recursive: true })
        expect(executedCmd).toBe("mkdir -p '/workspace/nested/dir'")
    })

    it('should check file existence via test command', async () => {
        spyOn(runtime, 'executeCommand').mockImplementation(
            async (_vmId: string, _cmd: string) => 0
        )

        const exists = await adapter.fs.exists('/workspace/index.html')
        expect(exists).toBe(true)
    })

    it('should support search find and grep operations', async () => {
        spyOn(runtime, 'executeCommand').mockImplementation(
            async (_vmId: string, cmd: string, onData?: (chunk: string) => void) => {
                if (cmd.includes('find')) {
                    if (onData) onData('/workspace/src/App.tsx\n')
                } else if (cmd.includes('grep')) {
                    if (onData) onData('/workspace/src/App.tsx:1:export const App\n')
                }
                return 0
            }
        )

        const findRes = await adapter.search.find('/workspace', '*.tsx')
        expect(findRes).toContain('/workspace/src/App.tsx')

        const grepRes = await adapter.search.grep('/workspace', 'export')
        expect(grepRes).toContain('export const App')
    })
})
