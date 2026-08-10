import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { runPythonEvalTask } from './python-runner'

import type { EvalResult, EvalSummaryReport, EvalTask, RunnerOptions } from './types'

export const calculateSummaryReport = (results: EvalResult[]): EvalSummaryReport => {
    const total = results.length
    const passed = results.filter((r) => r.status === 'PASS').length
    const failed = results.filter((r) => r.status === 'FAIL').length
    const error = results.filter((r) => r.status === 'ERROR').length
    const timeout = results.filter((r) => r.status === 'TIMEOUT').length

    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0)
    const meanDurationMs = total > 0 ? Math.round(totalDuration / total) : 0
    const passRate = total > 0 ? Math.round((passed / total) * 10000) / 100 : 0

    return {
        timestamp: new Date().toISOString(),
        totalTasks: total,
        passedTasks: passed,
        failedTasks: failed,
        errorTasks: error,
        timeoutTasks: timeout,
        passRate,
        meanDurationMs,
        results,
    }
}

export const runBenchmarkSuite = async (
    tasks: EvalTask[],
    options: RunnerOptions = {}
): Promise<EvalSummaryReport> => {
    const outputDir = options.outputDir || './eval_results'
    await fs.mkdir(outputDir, { recursive: true })

    const results: EvalResult[] = []

    console.log(`\n🚀 Starting December Evaluation Benchmark (${tasks.length} tasks)...\n`)

    for (const [index, task] of tasks.entries()) {
        console.log(`[${index + 1}/${tasks.length}] Running Task: ${task.name} (${task.id})...`)
        try {
            const result = await runPythonEvalTask(task, {
                outputDir,
                agentCmd: options.env?.AGENT_CMD,
                timeoutSeconds: Math.ceil((task.timeoutMs || 300000) / 1000),
            })
            results.push(result)
            const icon = result.status === 'PASS' ? '✅' : '❌'
            console.log(`  └─ Status: ${icon} ${result.status} | Duration: ${result.durationMs}ms`)
        } catch (err: any) {
            console.log(`  └─ Status: 💥 ERROR | Error: ${err.message}`)
            results.push({
                taskId: task.id,
                status: 'ERROR',
                exitCode: 1,
                durationMs: 0,
                tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                trajectoryPath: path.join(outputDir, `${task.id}.json`),
                error: err.message,
            })
        }
    }

    const report = calculateSummaryReport(results)

    const summaryPath = path.join(outputDir, 'summary.json')
    await fs.writeFile(summaryPath, JSON.stringify(report, null, 2), 'utf-8')

    console.log('\n==================================================')
    console.log('📊 DECEMBER EVALUATION BENCHMARK SUMMARY')
    console.log('==================================================')
    console.log(` Pass Rate (Pass@1) : ${report.passRate}%`)
    console.log(` Total Tasks       : ${report.totalTasks}`)
    console.log(` Passed            : ${report.passedTasks}`)
    console.log(` Failed            : ${report.failedTasks}`)
    console.log(` Errors            : ${report.errorTasks}`)
    console.log(` Timeouts          : ${report.timeoutTasks}`)
    console.log(` Mean Duration     : ${report.meanDurationMs} ms`)
    console.log(` Summary Report    : ${summaryPath}`)
    console.log('==================================================\n')

    return report
}
