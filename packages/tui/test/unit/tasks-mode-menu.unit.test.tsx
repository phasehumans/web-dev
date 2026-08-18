import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { TasksModeMenu } from '../../src/components/menus/tasks-mode-menu'

describe('TasksModeMenu Component (Unit)', () => {
    it('renders task list with standardized selection indicator', () => {
        const tasksData = [
            { id: 'task-1', status: 'running', command: 'bun test --watch' },
            { id: 'task-2', status: 'completed', command: 'git status' },
        ]
        const { lastFrame } = render(
            <TasksModeMenu
                tasksData={tasksData}
                taskSelectedIndex={0}
                taskViewingId={null}
                taskScrollOffset={0}
            />
        )
        const output = lastFrame() || ''

        expect(output).toContain('Tasks')
        expect(output).toContain('task-1')
        expect(output).toContain('task-2')
        expect(output).toContain('RUNNING')
        expect(output).toContain('COMPLETED')
        expect(output).toContain('❭')
    })

    it('splits multiline task output using regex and renders lines properly without flattening', () => {
        const tasksData = [
            {
                id: 'task-1',
                status: 'completed',
                command: 'echo -e "Line 1\\nLine 2\\nLine 3"',
                output: 'Line 1\nLine 2\r\nLine 3\nLine 4',
            },
        ]
        const { lastFrame } = render(
            <TasksModeMenu
                tasksData={tasksData}
                taskSelectedIndex={0}
                taskViewingId="task-1"
                taskScrollOffset={0}
            />
        )
        const output = lastFrame() || ''

        expect(output).toContain('Line 1')
        expect(output).toContain('Line 2')
        expect(output).toContain('Line 3')
        expect(output).toContain('Line 4')
        expect(output).toContain('Showing lines 1-4 of 4')
    })
})
