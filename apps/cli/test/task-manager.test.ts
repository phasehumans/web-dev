import { expect, test, describe, beforeEach, spyOn, afterEach } from 'bun:test'

import { taskManager } from '../src/task-manager'

import type { ChildProcess } from 'node:child_process'

describe('taskManager', () => {
    let mockProcessKill: any

    beforeEach(() => {
        // clear tasks before each test
        const tasks = taskManager.getTasks()
        for (const task of tasks) {
            taskManager.removeTask(task.id)
        }

        mockProcessKill = spyOn(process, 'kill').mockImplementation(() => true as any)
    })

    afterEach(() => {
        mockProcessKill.mockRestore()
    })

    test('adds a task', () => {
        const mockCp = { pid: 1234 } as ChildProcess
        const task = taskManager.addTask('npm start', mockCp)

        expect(task.command).toBe('npm start')
        expect(task.status).toBe('running')
        expect(task.pid).toBe(1234)
        expect(task.output).toBe('')
        expect(task.childProcess).toBe(mockCp)
        expect(task.id).toMatch(/^task-\d+$/)
    })

    test('gets task by id', () => {
        const mockCp = {} as ChildProcess
        const task = taskManager.addTask('npm test', mockCp)

        const retrieved = taskManager.getTask(task.id)
        expect(retrieved).toBeDefined()
        expect(retrieved?.id).toBe(task.id)
    })

    test('appends output', () => {
        const mockCp = {} as ChildProcess
        const task = taskManager.addTask('echo hello', mockCp)

        taskManager.appendOutput(task.id, 'hello')
        taskManager.appendOutput(task.id, ' world')

        const retrieved = taskManager.getTask(task.id)
        expect(retrieved?.output).toBe('hello world')
    })

    test('marks completed with success', () => {
        const mockCp = {} as ChildProcess
        const task = taskManager.addTask('ls', mockCp)

        taskManager.markCompleted(task.id, 0)

        const retrieved = taskManager.getTask(task.id)
        expect(retrieved?.status).toBe('completed')
    })

    test('marks completed with failure', () => {
        const mockCp = {} as ChildProcess
        const task = taskManager.addTask('ls /nonexistent', mockCp)

        taskManager.markCompleted(task.id, 1)

        const retrieved = taskManager.getTask(task.id)
        expect(retrieved?.status).toBe('failed')
    })

    test('removes task', () => {
        const mockCp = {} as ChildProcess
        const task = taskManager.addTask('ls', mockCp)

        taskManager.removeTask(task.id)
        const retrieved = taskManager.getTask(task.id)
        expect(retrieved).toBeUndefined()
    })

    test('kills task using process.kill with negative pid', () => {
        let killed = false
        const mockCp = {
            pid: 5555,
            kill: () => {
                killed = true
                return true
            },
        } as unknown as ChildProcess

        const task = taskManager.addTask('tail -f log', mockCp)

        const result = taskManager.killTask(task.id)
        expect(result).toBe(true)

        const retrieved = taskManager.getTask(task.id)
        expect(retrieved?.status).toBe('killed')

        expect(mockProcessKill).toHaveBeenCalledWith(-5555, 'SIGINT')
    })

    test('kills task using childProcess.kill if pid is missing', () => {
        let killed = false
        const mockCp = {
            kill: (signal?: string) => {
                expect(signal).toBe('SIGINT')
                killed = true
                return true
            },
        } as unknown as ChildProcess

        const task = taskManager.addTask('tail -f log', mockCp)

        taskManager.killTask(task.id)
        expect(killed).toBe(true)
    })

    test('does not kill already completed task', () => {
        const mockCp = {} as ChildProcess
        const task = taskManager.addTask('echo done', mockCp)

        taskManager.markCompleted(task.id, 0)

        const result = taskManager.killTask(task.id)
        expect(result).toBe(false)
        expect(taskManager.getTask(task.id)?.status).toBe('completed')
    })
})
