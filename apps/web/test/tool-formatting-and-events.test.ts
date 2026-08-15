import { describe, it, expect, beforeEach } from 'bun:test'

import { useAppStore } from '../src/app/store'
import { getToolSummary, getToolActionLabel } from '../src/features/chat/utils/toolFormatter'
import { parseDiffChunks } from '../src/features/preview/utils/diffParser'

import type { Message } from '../src/features/chat/types'

describe('Ticket #389 & #390: Tool Summaries, Streaming Verbs, Compaction, and Interrupts', () => {
    beforeEach(() => {
        useAppStore.setState({
            messages: [],
            expandCommands: true,
        })
    })

    describe('Canonical Tool Formatting', () => {
        it('formats read tools as Read(path)', () => {
            expect(
                getToolSummary('read_file', JSON.stringify({ AbsolutePath: 'src/App.tsx' }))
            ).toBe('Read(src/App.tsx)')
            expect(getToolSummary('view_file', JSON.stringify({ filePath: 'package.json' }))).toBe(
                'Read(package.json)'
            )
        })

        it('formats write tools as Create(path)', () => {
            expect(
                getToolSummary(
                    'write_to_file',
                    JSON.stringify({ TargetFile: 'src/NewComponent.tsx' })
                )
            ).toBe('Create(src/NewComponent.tsx)')
            expect(getToolSummary('write_file', JSON.stringify({ path: 'README.md' }))).toBe(
                'Create(README.md)'
            )
        })

        it('formats edit tools as Edit(path)', () => {
            expect(
                getToolSummary(
                    'replace_file_content',
                    JSON.stringify({ TargetFile: 'src/index.ts' })
                )
            ).toBe('Edit(src/index.ts)')
            expect(getToolSummary('edit_diff', JSON.stringify({ filePath: 'src/style.css' }))).toBe(
                'Edit(src/style.css)'
            )
        })

        it('formats command execution tools as Bash(cmd)', () => {
            expect(
                getToolSummary('run_command', JSON.stringify({ CommandLine: 'bun install' }))
            ).toBe('Bash(bun install)')
            expect(getToolSummary('bash', JSON.stringify({ command: 'git status' }))).toBe(
                'Bash(git status)'
            )
        })

        it('formats search and directory tools cleanly', () => {
            expect(getToolSummary('grep_search', JSON.stringify({ Query: 'useState' }))).toBe(
                'Search(useState)'
            )
            expect(
                getToolSummary('list_dir', JSON.stringify({ DirectoryPath: 'src/features' }))
            ).toBe('ListDir(src/features)')
            expect(
                getToolSummary('search_web', JSON.stringify({ query: 'bun test documentation' }))
            ).toBe('WebSearch(bun test documentation)')
        })
    })

    describe('Dynamic Tool Action Labels', () => {
        it('maps tool names to active streaming action verbs', () => {
            expect(getToolActionLabel('read_file')).toBe('Reading...')
            expect(getToolActionLabel('write_to_file')).toBe('Writing...')
            expect(getToolActionLabel('replace_file_content')).toBe('Modifying...')
            expect(getToolActionLabel('run_command')).toBe('Executing...')
            expect(getToolActionLabel('grep_search')).toBe('Searching codebase...')
            expect(getToolActionLabel('search_web')).toBe('Searching web...')
            expect(getToolActionLabel('list_dir')).toBe('Listing directory...')
            expect(getToolActionLabel('unknown_tool')).toBe('Working...')
        })
    })

    describe('Compaction and Interrupt Blocks', () => {
        it('appends compaction block to assistant message', () => {
            const msgId = 'test-msg-compaction'
            const msg: Message = { id: msgId, role: 'assistant', content: '', blocks: [] }
            useAppStore.getState().setMessages([msg])

            useAppStore.getState().addCompactionBlock(msgId, 'Previous conversation summarized.')

            const state = useAppStore.getState()
            expect(state.messages[0].blocks).toHaveLength(1)
            expect(state.messages[0].blocks![0]).toEqual({
                type: 'compaction',
                summary: 'Previous conversation summarized.',
            })
        })

        it('appends interrupt block to assistant message', () => {
            const msgId = 'test-msg-interrupt'
            const msg: Message = { id: msgId, role: 'assistant', content: '', blocks: [] }
            useAppStore.getState().setMessages([msg])

            useAppStore.getState().addInterruptBlock(msgId)

            const state = useAppStore.getState()
            expect(state.messages[0].blocks).toHaveLength(1)
            expect(state.messages[0].blocks![0]).toEqual({
                type: 'interrupt',
            })
        })
    })

    describe('Ticket #391: Diff Parser and Changes Workspace Aggregator', () => {
        it('parses target and replacement content into unified diff lines', () => {
            const target = 'const a = 1\nconst b = 2'
            const replacement = 'const a = 1\nconst b = 3\nconst c = 4'

            const diff = parseDiffChunks(target, replacement)
            expect(diff).toContain('-const a = 1')
            expect(diff).toContain('+const a = 1')
            expect(diff).toContain('-const b = 2')
            expect(diff).toContain('+const b = 3')
            expect(diff).toContain('+const c = 4')
        })
    })
})
