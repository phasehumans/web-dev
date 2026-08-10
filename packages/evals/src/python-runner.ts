import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import type { EvalResult, EvalTask } from './types'

export interface PythonRunnerOptions {
    pythonPath?: string
    outputDir?: string
    agentCmd?: string
    timeoutSeconds?: number
}

export const runPythonEvalTask = async (
    task: EvalTask,
    options: PythonRunnerOptions = {}
): Promise<EvalResult> => {
    const pythonExecutable = options.pythonPath || 'python3'
    const outputDir = options.outputDir || './eval_results'
    const harnessPath = path.join(__dirname, 'python/swe_bench_harness.py')

    await fs.mkdir(outputDir, { recursive: true })
    const tempTaskFile = path.join(outputDir, `temp_task_${Date.now()}.json`)
    await fs.writeFile(tempTaskFile, JSON.stringify(task, null, 2), 'utf-8')

    return new Promise<EvalResult>((resolve, reject) => {
        const args = [
            harnessPath,
            '--task-file',
            tempTaskFile,
            '--output-dir',
            outputDir,
            '--timeout',
            String(options.timeoutSeconds || 300),
        ]

        if (options.agentCmd) {
            args.push('--agent-cmd', options.agentCmd)
        }

        const proc = spawn(pythonExecutable, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
        })

        let stdoutData = ''
        let stderrData = ''

        proc.stdout.on('data', (data) => {
            stdoutData += data.toString()
        })

        proc.stderr.on('data', (data) => {
            stderrData += data.toString()
        })

        proc.on('close', async (code) => {
            try {
                await fs.unlink(tempTaskFile).catch(() => {})
            } catch {
                // Ignore cleanup error
            }

            if (code !== 0 && !stdoutData.trim()) {
                return reject(
                    new Error(`Python harness failed with exit code ${code}: ${stderrData}`)
                )
            }

            try {
                const parsed = JSON.parse(stdoutData.trim())
                resolve(parsed as EvalResult)
            } catch {
                resolve({
                    taskId: task.id,
                    status: 'ERROR',
                    exitCode: code || 1,
                    durationMs: 0,
                    tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    trajectoryPath: path.join(outputDir, `${task.id}.json`),
                    error: stderrData || 'Failed to parse JSON evaluation output from harness',
                })
            }
        })
    })
}
