import * as fs from 'node:fs/promises'

import { afterEach, describe, expect, test } from 'bun:test'

import { runPythonEvalTask } from '../../src/python-runner'

import type { EvalTask } from '../../src/types'

describe('Python Evaluation Runner (Unit)', () => {
    afterEach(async () => {
        await fs.rm('./eval_results_test', { recursive: true, force: true }).catch(() => {})
    })

    test('should execute python evaluation harness successfully for valid task', async () => {
        const task: EvalTask = {
            id: 'test_task_1',
            name: 'Sample Python Task',
            description: 'Unit test task for python harness',
            prompt: 'echo "Hello from evaluation test"',
            validationScript: 'exit 0',
        }

        const result = await runPythonEvalTask(task, {
            agentCmd: 'echo "Agent completed prompt"',
            outputDir: './eval_results_test',
            timeoutSeconds: 30,
        })

        expect(result.taskId).toBe('test_task_1')
        expect(result.status).toBe('PASS')
        expect(result.exitCode).toBe(0)
        expect(result.durationMs).toBeGreaterThan(0)
    })

    test('should report FAIL status when validation script exits with non-zero code', async () => {
        const task: EvalTask = {
            id: 'failing_task_1',
            name: 'Failing Python Task',
            description: 'Unit test task for python harness failure',
            prompt: 'echo "Failing task prompt"',
            validationScript: 'exit 1',
        }

        const result = await runPythonEvalTask(task, {
            agentCmd: 'echo "Agent completed prompt"',
            outputDir: './eval_results_test',
            timeoutSeconds: 30,
        })

        expect(result.taskId).toBe('failing_task_1')
        expect(result.status).toBe('FAIL')
    })
})
