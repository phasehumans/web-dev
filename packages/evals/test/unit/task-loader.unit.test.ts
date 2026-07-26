import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

import { describe, expect, test } from 'bun:test'

import { parseEvalTask, loadTaskFromFile, loadTasksFromDir } from '../../src/task-loader'

describe('task-loader', () => {
    test('parseEvalTask parses and validates a valid task object', () => {
        const validTask = {
            id: 'task-1',
            name: 'Sample Task',
            description: 'A test task',
            prompt: 'Fix the bug in main.ts',
            validationScript: 'bun test',
            timeoutMs: 30000,
            maxTurns: 10,
            env: { TEST_ENV: 'true' },
        }

        const parsed = parseEvalTask(validTask)
        expect(parsed.id).toBe('task-1')
        expect(parsed.prompt).toBe('Fix the bug in main.ts')
        expect(parsed.validationScript).toBe('bun test')
    })

    test('parseEvalTask throws error for missing required fields', () => {
        const invalidTask = {
            id: 'task-2',
            name: 'Invalid Task',
            // Missing prompt and validationScript
        }

        expect(() => parseEvalTask(invalidTask)).toThrow()
    })

    test('loadTaskFromFile loads and parses a json file', async () => {
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eval-test-'))
        const filePath = path.join(tmpDir, 'test-task.json')
        const taskData = {
            id: 'task-file-1',
            name: 'File Task',
            description: 'Loaded from file',
            prompt: 'Refactor code',
            validationScript: 'npm test',
        }

        await fs.writeFile(filePath, JSON.stringify(taskData, null, 2), 'utf-8')

        const loaded = await loadTaskFromFile(filePath)
        expect(loaded.id).toBe('task-file-1')
        expect(loaded.validationScript).toBe('npm test')

        await fs.rm(tmpDir, { recursive: true, force: true })
    })

    test('loadTasksFromDir loads all json tasks from a directory', async () => {
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eval-dir-test-'))

        const task1 = {
            id: 't1',
            name: 'Task 1',
            description: 'First',
            prompt: 'Do 1',
            validationScript: 'exit 0',
        }
        const task2 = {
            id: 't2',
            name: 'Task 2',
            description: 'Second',
            prompt: 'Do 2',
            validationScript: 'exit 0',
        }

        await fs.writeFile(path.join(tmpDir, 't1.json'), JSON.stringify(task1), 'utf-8')
        await fs.writeFile(path.join(tmpDir, 't2.json'), JSON.stringify(task2), 'utf-8')
        await fs.writeFile(path.join(tmpDir, 'readme.txt'), 'Not a json file', 'utf-8')

        const tasks = await loadTasksFromDir(tmpDir)
        expect(tasks.length).toBe(2)
        const ids = tasks.map((t) => t.id).sort()
        expect(ids).toEqual(['t1', 't2'])

        await fs.rm(tmpDir, { recursive: true, force: true })
    })
})
