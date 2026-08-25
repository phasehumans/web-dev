import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { describe, it, expect, afterEach } from 'bun:test'
import React from 'react'

import {
    TasksWorkspace,
    parseTasksFromFile,
    findTaskFileContent,
} from '../src/features/preview/components/TasksWorkspace'

import type { Message } from '../src/features/chat/types'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, fireEvent, cleanup } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

describe('Ticket #396 & #400: Automated TASK.md Lifecycle & Dynamic Tasks Workspace', () => {
    it('parses markdown checkbox task items accurately', () => {
        const markdown = `
# Project Plan: Java Icecream Landing Page

## Setup
- [x] Create project structure
- [x] Initialize styles and fonts

## Implementation
- [ ] Build responsive hero section with coffee & ice cream branding
- [ ] Create flavors showcase grid
- [ ] Add contact and opening hours footer

## Verification
- [ ] Run dev server and verify preview
`
        const tasks = parseTasksFromFile(markdown)
        expect(tasks).toHaveLength(6)

        expect(tasks[0].title).toBe('Create project structure')
        expect(tasks[0].completed).toBe(true)

        expect(tasks[1].title).toBe('Initialize styles and fonts')
        expect(tasks[1].completed).toBe(true)

        expect(tasks[2].title).toBe(
            'Build responsive hero section with coffee & ice cream branding'
        )
        expect(tasks[2].completed).toBe(false)

        expect(tasks[3].title).toBe('Create flavors showcase grid')
        expect(tasks[3].completed).toBe(false)

        expect(tasks[4].title).toBe('Add contact and opening hours footer')
        expect(tasks[4].completed).toBe(false)

        expect(tasks[5].title).toBe('Run dev server and verify preview')
        expect(tasks[5].completed).toBe(false)
    })

    it('extracts task file content from generatedFiles with various path formats', () => {
        const generatedFiles1 = {
            'TASK.md': { content: '- [ ] Step 1\n- [x] Step 2' } as any,
        }
        expect(findTaskFileContent(generatedFiles1, [])).toBe('- [ ] Step 1\n- [x] Step 2')

        const generatedFiles2 = {
            '/workspace/TASK.md': '- [ ] Step 1\n- [ ] Step 2' as any,
        }
        expect(findTaskFileContent(generatedFiles2, [])).toBe('- [ ] Step 1\n- [ ] Step 2')
    })

    it('extracts task file content from message command blocks modifying TASK.md', () => {
        const messages: Message[] = [
            {
                id: 'm1',
                role: 'assistant',
                content: 'Creating project tasks',
                blocks: [
                    {
                        type: 'command',
                        toolCallId: 't1',
                        toolName: 'write_file',
                        toolInput: {
                            filePath: '/workspace/TASK.md',
                            content: '- [x] Initial setup\n- [ ] Build UI',
                        },
                        status: 'success',
                    },
                ],
            },
        ]

        const taskContent = findTaskFileContent({}, messages)
        expect(taskContent).toBe('- [x] Initial setup\n- [ ] Build UI')
    })

    it('renders empty state when no tasks are defined in the workspace without mock fallback', () => {
        render(<TasksWorkspace generatedFiles={{}} />)
        expect(screen.getByText('No tasks initialized')).toBeDefined()
        expect(screen.getByText('No task checklist found in the workspace.')).toBeDefined()
        expect(screen.queryByText('Read all current TUI source to scope the migration')).toBeNull()
    })

    it('renders dynamic tasks and updates completed count on checkbox toggle', () => {
        const generatedFiles = {
            'TASK.md': {
                content: '- [ ] First task\n- [x] Second task',
            } as any,
        }

        render(<TasksWorkspace generatedFiles={generatedFiles} />)
        expect(screen.getByText('1/2 tasks completed')).toBeDefined()
        expect(screen.getByText('First task')).toBeDefined()
        expect(screen.getByText('Second task')).toBeDefined()

        const firstTaskText = screen.getByText('First task')
        fireEvent.click(firstTaskText)
        expect(screen.getByText('2/2 tasks completed')).toBeDefined()
    })
})
