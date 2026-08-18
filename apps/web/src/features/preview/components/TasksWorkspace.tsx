import { CheckCircle2 } from 'lucide-react'
import React, { useMemo, useState, useEffect } from 'react'

import type { GeneratedProjectFile } from '@/features/preview/types'

import { useAppStore } from '@/app/store'
import { cn } from '@/shared/lib/utils'

interface TasksWorkspaceProps {
    generatedFiles?: Record<string, GeneratedProjectFile>
}

interface TaskItem {
    id: string
    title: string
    completed: boolean
}

export function extractFileToolParams(input: any): { path: string; content: string } {
    let parsed: any = {}
    if (typeof input === 'string') {
        try {
            parsed = JSON.parse(input)
        } catch {
            // Intentionally swallowed: Fallback for non-JSON input
            parsed = {}
        }
    } else if (input && typeof input === 'object') {
        parsed = input
    }

    const path = (
        parsed.TargetFile ||
        parsed.targetFile ||
        parsed.target_file ||
        parsed.filePath ||
        parsed.filepath ||
        parsed.AbsolutePath ||
        parsed.path ||
        parsed.file ||
        parsed.fileName ||
        ''
    ).toLowerCase()

    const content = parsed.CodeContent ?? parsed.codeContent ?? parsed.content ?? parsed.code ?? ''

    return { path, content }
}

// Find and parse tasks from TASK.md or TASKS.md
export function parseTasksFromFile(content: string): TaskItem[] {
    const lines = content.split('\n')
    const parsed: TaskItem[] = []
    let idCounter = 1

    lines.forEach((line) => {
        const trimmed = line.trim()
        if (
            !trimmed ||
            trimmed.startsWith('#') ||
            trimmed.startsWith('```') ||
            trimmed.startsWith('>')
        ) {
            return
        }

        const checkMatch = trimmed.match(/^([-*]|\d+\.)\s*\[([ xX])\]\s*(.*)$/)
        if (checkMatch) {
            const isCompleted = checkMatch[2].toLowerCase() === 'x'
            const text = checkMatch[3].trim()
            if (text) {
                parsed.push({
                    id: String(idCounter++),
                    title: text,
                    completed: isCompleted,
                })
            }
            return
        }

        const listMatch = trimmed.match(/^([-*]|\d+\.)\s+(.*)$/)
        if (listMatch) {
            const text = listMatch[2].trim()
            if (text) {
                parsed.push({
                    id: String(idCounter++),
                    title: text,
                    completed: false,
                })
            }
        }
    })

    return parsed
}

export function findTaskFileContent(
    generatedFiles?: Record<string, GeneratedProjectFile>,
    messages?: any[]
): string | null {
    if (generatedFiles) {
        for (const [key, file] of Object.entries(generatedFiles)) {
            const normalized = key.toLowerCase().replace(/^\.?\//, '')
            if (
                normalized === 'task.md' ||
                normalized === 'tasks.md' ||
                normalized.endsWith('/task.md') ||
                normalized.endsWith('/tasks.md')
            ) {
                const content = typeof file === 'string' ? file : (file as any)?.content || ''
                if (content.trim()) return content
            }
        }
    }

    if (messages && messages.length > 0) {
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i]

            if (msg.blocks && Array.isArray(msg.blocks)) {
                for (let j = msg.blocks.length - 1; j >= 0; j--) {
                    const block = msg.blocks[j]
                    if (block.type === 'command') {
                        const { path, content } = extractFileToolParams(block.toolInput)
                        if (path.endsWith('task.md') || path.endsWith('tasks.md')) {
                            if (content.trim()) return content
                        }
                    }
                }
            }

            if (msg.tool_calls) {
                for (const tc of msg.tool_calls) {
                    const args = tc.function?.arguments || tc.arguments
                    if (args) {
                        const { path, content } = extractFileToolParams(args)
                        if (path.endsWith('task.md') || path.endsWith('tasks.md')) {
                            if (content.trim()) return content
                        }
                    }
                }
            }
        }
    }

    return null
}

export const TasksWorkspace: React.FC<TasksWorkspaceProps> = ({ generatedFiles }) => {
    const messages = useAppStore((state) => state.messages)

    const rawFileContent = useMemo(
        () => findTaskFileContent(generatedFiles, messages),
        [generatedFiles, messages]
    )

    const initialTasks = useMemo(() => {
        if (rawFileContent) {
            const parsed = parseTasksFromFile(rawFileContent)
            if (parsed.length > 0) return parsed
        }
        return []
    }, [rawFileContent])

    const [tasks, setTasks] = useState<TaskItem[]>(initialTasks)

    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    const completedCount = tasks.filter((t) => t.completed).length
    const firstPendingIndex = tasks.findIndex((t) => !t.completed)

    const toggleTask = (id: string) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
    }

    if (tasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#141414] text-[#71717A] font-sans px-5 py-4 select-none">
                <div className="flex flex-col items-center gap-2 max-w-sm text-center">
                    <CheckCircle2 className="w-6 h-6 text-[#3F3F46]" />
                    <p className="text-[13px] text-[#A1A1AA] font-medium">No tasks initialized</p>
                    <p className="text-[12px] text-[#52525B]">
                        No task checklist found in the workspace.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#141414] text-[#EDEDEF] font-sans px-5 py-4 overflow-y-auto chat-scrollbar select-none">
            <div className="max-w-2xl flex flex-col gap-2.5">
                {/* Header count */}
                <div className="text-[12px] text-[#71717A] font-normal select-none">
                    {completedCount}/{tasks.length} tasks completed
                </div>

                {/* Tasks List */}
                <div className="flex flex-col gap-1.5">
                    {tasks.map((task, idx) => {
                        const isFirstPending = idx === firstPendingIndex

                        return (
                            <div
                                key={task.id}
                                onClick={() => toggleTask(task.id)}
                                className="flex items-start gap-2 group cursor-pointer select-none py-0.5"
                            >
                                <button
                                    type="button"
                                    className="mt-0.5 shrink-0 text-[#71717A] group-hover:text-[#A1A1AA] transition-colors outline-none cursor-pointer"
                                >
                                    {task.completed ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#71717A]" />
                                    ) : (
                                        <svg
                                            viewBox="0 0 16 16"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.3"
                                            strokeDasharray="2 2"
                                            className="w-3.5 h-3.5 text-[#52525B] group-hover:text-[#71717A] transition-colors"
                                        >
                                            <circle cx="8" cy="8" r="6" />
                                        </svg>
                                    )}
                                </button>

                                <span
                                    className={cn(
                                        'text-[12.5px] leading-normal transition-colors',
                                        task.completed
                                            ? 'text-[#52525B]'
                                            : isFirstPending
                                              ? 'text-[#EDEDED] font-medium'
                                              : 'text-[#9CA3AF] group-hover:text-[#EDEDED]'
                                    )}
                                >
                                    {task.title}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
