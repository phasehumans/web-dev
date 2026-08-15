import fs from 'fs'
import path from 'path'

import { Box, Text } from 'ink'
import React, { useState, useEffect } from 'react'

export function TaskHUD({ cwd, showTasks = true }: { cwd: string; showTasks?: boolean }) {
    const [taskLines, setTaskLines] = useState<string[]>([])

    useEffect(() => {
        if (!showTasks) return

        const taskPath = path.join(cwd, 'task.md')

        const updateTasks = () => {
            if (fs.existsSync(taskPath)) {
                try {
                    const content = fs.readFileSync(taskPath, 'utf8')
                    const lines = content
                        .split('\n')
                        .filter((l) => l.trim().match(/^- \[( |x|\/|-)\]/))
                    setTaskLines(lines.slice(0, 8)) // show up to 8 tasks
                } catch (e) {
                    // Intentionally swallowed: task.md file read error ignored during concurrent file writes
                }
            } else {
                setTaskLines([])
            }
        }

        updateTasks()
        const interval = setInterval(updateTasks, 2000)
        return () => clearInterval(interval)
    }, [cwd, showTasks])

    if (!showTasks || taskLines.length === 0) return null

    return (
        <Box
            position="absolute"
            top={1}
            right={2}
            flexDirection="column"
            borderStyle="round"
            borderColor="#555555"
            paddingX={1}
            width={40}
        >
            <Text color="#89B4F8" bold>
                Active Plan (task.md)
            </Text>
            {taskLines.map((line, i) => {
                const isDone = line.includes('[x]')
                const isProg = line.includes('[/]')
                const color = isDone ? '#10B981' : isProg ? '#FBBF24' : '#AAAAAA'
                return (
                    <Text key={i} color={color} wrap="truncate">
                        {line.replace(/^- /, '')}
                    </Text>
                )
            })}
        </Box>
    )
}
