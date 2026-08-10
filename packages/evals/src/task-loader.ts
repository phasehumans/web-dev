import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { evalTaskSchema } from './schema'

import type { EvalTask } from './types'

export const parseEvalTask = (data: unknown): EvalTask => {
    return evalTaskSchema.parse(data)
}

export const loadTasksFromFile = async (filePath: string): Promise<EvalTask[]> => {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsedJson = JSON.parse(raw)
    if (Array.isArray(parsedJson)) {
        return parsedJson.map((item) => parseEvalTask(item))
    }
    return [parseEvalTask(parsedJson)]
}

export const loadTaskFromFile = async (filePath: string): Promise<EvalTask> => {
    const tasks = await loadTasksFromFile(filePath)
    if (tasks.length === 0) {
        throw new Error(`No task found in ${filePath}`)
    }
    return tasks[0]!
}

export const loadTasksFromDir = async (dirPath: string): Promise<EvalTask[]> => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const tasks: EvalTask[] = []

    for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.eval.ts'))) {
            try {
                const fullPath = path.join(dirPath, entry.name)
                const loaded = await loadTasksFromFile(fullPath)
                tasks.push(...loaded)
            } catch (err) {
                console.warn(`[task-loader] Skipping invalid task file ${entry.name}:`, err)
            }
        }
    }

    return tasks
}
