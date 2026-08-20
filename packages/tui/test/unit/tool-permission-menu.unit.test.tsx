import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { ToolPermissionMenu } from '../../src/components/menus/tool-permission-menu'

describe('ToolPermissionMenu Component (Unit)', () => {
    it('renders tool approval options and clean diff preview for tool call', () => {
        const onComplete = mock()
        const toolCall = {
            name: 'replace_file_content',
            input: { TargetFile: 'src/index.ts' },
            diff: '--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,2 +1,2 @@\n-const old = 1\n+const updated = 2',
        }
        const { lastFrame } = render(
            <ToolPermissionMenu toolCall={toolCall} onComplete={onComplete} />
        )
        const output = lastFrame() || ''

        expect(output).toContain('replace_file_content: src/index.ts')
        expect(output).toContain('const old = 1')
        expect(output).toContain('const updated = 2')
        expect(output).toContain('[y] Approve')
        expect(output).toContain('[a] Always allow in session')
        expect(output).toContain('[g] Only git-tracked files')
        expect(output).toContain('[d] Deny')
    })

    it('approves instantly on pressing y key', () => {
        const onComplete = mock()
        const toolCall = {
            name: 'run_command',
            input: { CommandLine: 'bun run build' },
        }
        const { stdin } = render(<ToolPermissionMenu toolCall={toolCall} onComplete={onComplete} />)

        stdin.write('y')
        expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ block: false }))
    })

    it('selects always allow in session on pressing a key', () => {
        const onComplete = mock()
        const toolCall = {
            name: 'write_to_file',
            input: { TargetFile: 'src/new.ts' },
        }
        const { stdin } = render(<ToolPermissionMenu toolCall={toolCall} onComplete={onComplete} />)

        stdin.write('a')
        expect(onComplete).toHaveBeenCalledWith(
            expect.objectContaining({ block: false, allowAlways: true })
        )
    })

    it('selects git-tracked only on pressing g key', () => {
        const onComplete = mock()
        const toolCall = {
            name: 'write_to_file',
            input: { TargetFile: 'src/new.ts' },
        }
        const { stdin } = render(<ToolPermissionMenu toolCall={toolCall} onComplete={onComplete} />)

        stdin.write('g')
        expect(onComplete).toHaveBeenCalledWith(
            expect.objectContaining({ block: false, gitTrackedOnly: true })
        )
    })

    it('denies instantly on pressing d or n or escape key', () => {
        const onComplete = mock()
        const toolCall = {
            name: 'run_command',
            input: { CommandLine: 'bun run build' },
        }
        const { stdin } = render(<ToolPermissionMenu toolCall={toolCall} onComplete={onComplete} />)

        stdin.write('d')
        expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ block: true }))
    })
})
