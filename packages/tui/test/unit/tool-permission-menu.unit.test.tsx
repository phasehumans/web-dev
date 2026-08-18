import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { ToolPermissionMenu } from '../../src/components/menus/tool-permission-menu'

describe('ToolPermissionMenu Component (Unit)', () => {
    it('renders tool approval options for tool call', () => {
        const onComplete = mock()
        const toolCall = {
            name: 'run_command',
            input: { CommandLine: 'bun run build' },
        }
        const { lastFrame } = render(
            <ToolPermissionMenu toolCall={toolCall} onComplete={onComplete} />
        )
        const output = lastFrame() || ''

        expect(output).toContain('run_command')
        expect(output).toContain('bun run build')
        expect(output).toContain('Approve')
        expect(output).toContain('Reject')
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

    it('rejects instantly on pressing n or escape key', () => {
        const onComplete = mock()
        const toolCall = {
            name: 'run_command',
            input: { CommandLine: 'bun run build' },
        }
        const { stdin } = render(<ToolPermissionMenu toolCall={toolCall} onComplete={onComplete} />)

        stdin.write('n')
        expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ block: true }))
    })
})
