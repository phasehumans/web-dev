import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { evalTaskSchema } from './schema'

import type { EvalTask } from './types'

export const parseEvalTask = (data: unknown): EvalTask => {
    return evalTaskSchema.parse(data)
}

export const loadTaskFromFile = async (filePath: string): Promise<EvalTask> => {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsedJson = JSON.parse(raw)
    return parseEvalTask(parsedJson)
}

export const loadTasksFromDir = async (dirPath: string): Promise<EvalTask[]> => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const tasks: EvalTask[] = []

    for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.eval.ts'))) {
            try {
                const fullPath = path.join(dirPath, entry.name)
                const task = await loadTaskFromFile(fullPath)
                tasks.push(task)
            } catch (err) {
                // Log and swallow invalid task file error to allow continuing with valid files
                console.warn(`[task-loader] Skipping invalid task file ${entry.name}:`, err)
            }
        }
    }

    return tasks
}
