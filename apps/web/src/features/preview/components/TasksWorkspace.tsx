import { Circle, CheckCircle2 } from 'lucide-react'
import React, { useState } from 'react'

import { cn } from '@/shared/lib/utils'

interface TaskItem {
    id: string
    title: string
    completed: boolean
}

const DEFAULT_TASKS: TaskItem[] = [
    { id: '1', title: 'Read all current TUI source to scope the migration', completed: false },
    { id: '2', title: 'Generate Devin dotted logo as braille art', completed: false },
    {
        id: '3',
        title: 'Set up Ink: add deps, remove opentui, new entrypoint/renderer',
        completed: false,
    },
    { id: '4', title: 'Greyscale-only theme (no accent colors)', completed: false },
    {
        id: '5',
        title: 'Port providers (theme, dialog, keyboard-layer, toast) to Ink',
        completed: false,
    },
    { id: '6', title: 'Port layouts (root-layout, themed-root)', completed: false },
    {
        id: '7',
        title: 'Port components: logo, header, tips, input-bar, status-bar, spinner, border',
        completed: false,
    },
    { id: '8', title: 'Port command-menu + dialogs + dialog-search-list', completed: false },
    { id: '9', title: 'Port messages (bot/user/error) + session-shell', completed: false },
    { id: '10', title: 'Port screens: home, new-session, session', completed: false },
    { id: '11', title: 'Match Devin CLI layout exactly (no bg, rule, footer)', completed: false },
    { id: '12', title: 'Run lint/typecheck/prettier + render locally to verify', completed: false },
    { id: '13', title: 'Commit, push new branch, open PR', completed: false },
]

export const TasksWorkspace: React.FC = () => {
    const [tasks, setTasks] = useState<TaskItem[]>(DEFAULT_TASKS)

    const completedCount = tasks.filter((t) => t.completed).length

    const toggleTask = (id: string) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#141414] text-[#EDEDEF] font-sans p-6 overflow-y-auto [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:bg-[#2C2C30]">
            <div className="max-w-3xl flex flex-col gap-4">
                {/* Header count */}
                <div className="text-xs text-[#8E8D8C] font-medium select-none">
                    {completedCount}/{tasks.length} tasks completed
                </div>

                {/* Tasks List */}
                <div className="flex flex-col gap-3">
                    {tasks.map((task, idx) => (
                        <div
                            key={task.id}
                            onClick={() => toggleTask(task.id)}
                            className="flex items-start gap-3 group cursor-pointer select-none"
                        >
                            <button
                                type="button"
                                className="mt-0.5 shrink-0 text-[#71717A] group-hover:text-[#A1A1AA] transition-colors outline-none"
                            >
                                {task.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <Circle className="w-4 h-4 stroke-[1.5] border-dashed" />
                                )}
                            </button>

                            <span
                                className={cn(
                                    'text-sm transition-colors leading-snug',
                                    task.completed
                                        ? 'line-through text-[#52525B]'
                                        : idx === 0
                                          ? 'text-[#EDEDED] font-medium'
                                          : 'text-[#A1A1AA] group-hover:text-[#EDEDED]'
                                )}
                            >
                                {task.title}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
