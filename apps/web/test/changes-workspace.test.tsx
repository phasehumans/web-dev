import { describe, it, expect, beforeEach } from 'bun:test'

import { useAppStore } from '../src/app/store'
import { extractSessionFileDiffs } from '../src/features/preview/utils/diffParser'

import type { Message } from '../src/features/chat/types'

describe('Ticket #391: Interactive Changes Workspace', () => {
    beforeEach(() => {
        useAppStore.setState({
            messages: [],
        })
    })

    it('extracts diffs accurately from multiple file_change blocks', () => {
        const messages: Message[] = [
            {
                id: 'm1',
                role: 'assistant',
                content: '',
                blocks: [
                    {
                        type: 'file_change',
                        filePath: 'src/components/Header.tsx',
                        action: 'modified',
                        diff: '@@ -1,3 +1,4 @@\n-import React from "react"\n+import React, { useState } from "react"\n+import { Logo } from "./Logo"',
                    },
                    {
                        type: 'file_change',
                        filePath: 'src/index.css',
                        action: 'modified',
                        diff: '@@ -10,2 +10,3 @@\n-color: red;\n+color: blue;',
                    },
                ],
            },
        ]

        const diffs = extractSessionFileDiffs(messages)
        expect(diffs).toHaveLength(2)
        expect(diffs[0].filePath).toBe('src/components/Header.tsx')
        expect(diffs[0].additions).toBe(2)
        expect(diffs[0].deletions).toBe(1)

        expect(diffs[1].filePath).toBe('src/index.css')
        expect(diffs[1].additions).toBe(1)
        expect(diffs[1].deletions).toBe(1)
    })

    it('extracts diffs from command blocks with replace_file_content and write_to_file', () => {
        const messages: Message[] = [
            {
                id: 'm2',
                role: 'assistant',
                content: '',
                blocks: [
                    {
                        type: 'command',
                        toolCallId: 't1',
                        toolName: 'replace_file_content',
                        toolInput: {
                            TargetFile: 'src/App.tsx',
                            TargetContent: 'const oldVal = 1',
                            ReplacementContent: 'const newVal = 2',
                        },
                        status: 'success',
                    },
                ],
            },
        ]

        const diffs = extractSessionFileDiffs(messages)
        expect(diffs).toHaveLength(1)
        expect(diffs[0].filePath).toBe('src/App.tsx')
        expect(diffs[0].action).toBe('modified')
        expect(diffs[0].diff).toContain('-const oldVal = 1')
        expect(diffs[0].diff).toContain('+const newVal = 2')
    })

    it('extracts diffs from write_file with /workspace prefix and normalizes paths', () => {
        const messages: Message[] = [
            {
                id: 'm3',
                role: 'assistant',
                content: 'Creating main entrypoint',
                blocks: [
                    {
                        type: 'command',
                        toolCallId: 't2',
                        toolName: 'write_file',
                        toolInput: {
                            filePath: '/workspace/src/main.ts',
                            content:
                                'import { createApp } from "./app"\ncreateApp().mount("#root")',
                        },
                        status: 'success',
                    },
                ],
            },
        ]

        const diffs = extractSessionFileDiffs(messages)
        expect(diffs).toHaveLength(1)
        expect(diffs[0].filePath).toBe('/workspace/src/main.ts')
        expect(diffs[0].action).toBe('created')
        expect(diffs[0].additions).toBe(2)
        expect(diffs[0].deletions).toBe(0)
    })
})
