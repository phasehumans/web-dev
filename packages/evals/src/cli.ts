#!/usr/bin/env bun
import * as path from 'node:path'

import { runBenchmarkSuite } from './runner'
import { loadTasksFromDir } from './task-loader'

const main = async () => {
    const args = process.argv.slice(2)

    let targetDir = path.join(__dirname, '../benchmarks')
    let outputDir = './eval_results'
    let agentCmd = 'echo "Agent mock run"'

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]!
        if (arg === '--dir' && args[i + 1]) {
            targetDir = path.resolve(args[++i]!)
        } else if (arg === '--out' && args[i + 1]) {
            outputDir = path.resolve(args[++i]!)
        } else if (arg === '--agent-cmd' && args[i + 1]) {
            agentCmd = args[++i]!
        } else if (!arg.startsWith('-')) {
            targetDir = path.resolve(arg)
        }
    }

    console.log(`Loading evaluation tasks from: ${targetDir}`)
    const tasks = await loadTasksFromDir(targetDir)

    if (tasks.length === 0) {
        console.error(`No valid evaluation tasks found in ${targetDir}`)
        process.exit(1)
    }

    const report = await runBenchmarkSuite(tasks, {
        outputDir,
        env: { AGENT_CMD: agentCmd },
    })

    if (report.passedTasks < report.totalTasks) {
        process.exit(1)
    }
}

main().catch((err) => {
    console.error('Benchmark execution error:', err)
    process.exit(1)
})
