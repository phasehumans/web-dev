import { expect, test, describe } from 'bun:test'

import { getToolSummary } from '../src/utils/formatters'

describe('formatters', () => {
    describe('getToolSummary', () => {
        test('formats read_file', () => {
            expect(getToolSummary('read_file', JSON.stringify({ filePath: 'foo.ts' }))).toBe(
                'Read(foo.ts)'
            )
            expect(getToolSummary('read_file', JSON.stringify({ path: 'bar.ts' }))).toBe(
                'Read(bar.ts)'
            )
        })

        test('formats write_file', () => {
            expect(getToolSummary('write_file', JSON.stringify({ filePath: 'foo.ts' }))).toBe(
                'Create(foo.ts)'
            )
        })

        test('formats edit_file and edit_diff', () => {
            expect(getToolSummary('edit_file', JSON.stringify({ filePath: 'foo.ts' }))).toBe(
                'Edit(foo.ts)'
            )
            expect(getToolSummary('edit_diff', JSON.stringify({ path: 'bar.ts' }))).toBe(
                'Edit(bar.ts)'
            )
        })

        test('formats list_dir', () => {
            expect(getToolSummary('list_dir', JSON.stringify({ dirPath: 'src/' }))).toBe(
                'ListDir(src/)'
            )
        })

        test('formats bash', () => {
            expect(getToolSummary('bash', JSON.stringify({ command: 'ls -la' }))).toBe(
                'Bash(ls -la)'
            )
        })

        test('formats search tools', () => {
            expect(getToolSummary('find_files', JSON.stringify({ pattern: '*.ts' }))).toBe(
                'Search(*.ts)'
            )
            expect(getToolSummary('grep_search', JSON.stringify({ query: 'TODO' }))).toBe(
                'Search(TODO)'
            )
        })

        test('formats python_repl and mcp', () => {
            expect(
                getToolSummary(
                    'python_repl',
                    JSON.stringify({ code: 'import numpy as np\nprint(1)' })
                )
            ).toBe('PythonRepl(import numpy as np)')
            expect(
                getToolSummary('mcp', JSON.stringify({ server: 'github', tool: 'search_repos' }))
            ).toBe('MCP(github:search_repos)')
        })

        test('handles unknown tools', () => {
            expect(getToolSummary('unknown_tool', JSON.stringify({ foo: 'bar' }))).toBe(
                'unknown_tool()'
            )
        })

        test('handles malformed JSON input', () => {
            expect(getToolSummary('read_file', 'malformed {')).toBe('read_file()')
            expect(getToolSummary('bash', undefined as unknown as string)).toBe('Bash()')
        })
    })
})
