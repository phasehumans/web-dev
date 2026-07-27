import readline from 'readline'

import { runAgentLoop } from '@december/agent'

import type { Agent } from '@december/agent'

const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
}

export function suppressConsole() {
    console.warn = () => {}
    console.error = () => {}
    console.log = () => {}
    console.info = () => {}
}

export function restoreConsole() {
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    console.info = originalConsole.info
}

export interface HeadlessTaskOptions {
    agent: Agent
    stdin?: NodeJS.ReadableStream
    stdout?: NodeJS.WritableStream
    stderr?: NodeJS.WritableStream
}

export interface HeadlessTaskResult {
    success: boolean
    error?: string
}

export async function runHeadlessTask(
    prompt: string,
    options: HeadlessTaskOptions
): Promise<HeadlessTaskResult> {
    restoreConsole()

    const {
        agent,
        stdin = process.stdin,
        stdout = process.stdout,
        stderr = process.stderr,
    } = options

    const writeOut = (msg: string) => {
        if (stdout && stdout.write) stdout.write(msg)
    }

    const writeErr = (msg: string) => {
        if (stderr && stderr.write) stderr.write(msg)
    }

    const rl = readline.createInterface({
        input: stdin as any,
        output: stdout as any,
    })

    if (!agent.operations) agent.operations = {} as any
    if (!agent.operations.ui) agent.operations.ui = {} as any

    agent.operations.ui.askQuestion = (questions: any[]) => {
        return new Promise((resolve) => {
            const q = questions[0]
            writeOut(`\n\n[Question]: ${q.question}\n`)
            if (q.options) {
                q.options.forEach((opt: string, i: number) => writeOut(`${i + 1}. ${opt}\n`))
            }
            rl.question('\nSelect an option or type your answer: ', (answer: string) => {
                const num = parseInt(answer)
                if (!isNaN(num) && num > 0 && q.options && num <= q.options.length) {
                    resolve(q.options[num - 1])
                } else {
                    resolve(answer)
                }
            })
        })
    }

    agent.operations.ui.requestPermission = async (toolCall: any) => {
        if (
            ['replace_file_content', 'multi_replace_file_content', 'run_command'].includes(
                toolCall.name
            )
        ) {
            return new Promise((resolve) => {
                rl.question(`\nExecute ${toolCall.name}? (y/n): `, (answer: string) => {
                    if (answer.toLowerCase().startsWith('y')) {
                        resolve({ block: false })
                    } else {
                        resolve({ block: true, reason: 'User denied execution in UI.' })
                    }
                })
            })
        }
        return { block: false }
    }

    rl.on('line', (input: string) => {
        if (input.trim()) {
            agent.steer({ role: 'user', content: input, isUI: true })
            writeOut(`\n[Steering input sent to agent]\n`)
        }
    })

    let hasError = false
    let errorMessage: string | undefined

    try {
        const stream = runAgentLoop(agent, prompt)

        for await (const event of stream) {
            switch (event.type) {
                case 'StreamChunk':
                    writeOut(event.content)
                    break
                case 'ToolCallStart':
                    writeOut(`\n\n[Tool Executing: ${event.toolCall.name}]\n`)
                    writeOut(
                        typeof event.toolCall.input === 'string'
                            ? event.toolCall.input
                            : JSON.stringify(event.toolCall.input)
                    )
                    writeOut('\n')
                    break
                case 'ToolCallResult':
                    if (event.result.error) {
                        writeErr(`\n[Tool Error] ${event.result.error}\n`)
                    } else {
                        writeOut(`\n[Tool Result Received]\n`)
                    }
                    break
                case 'AgentUsage':
                    writeOut(
                        `\n[Usage: ${event.promptTokens} prompt, ${event.completionTokens} completion]\n`
                    )
                    break
                case 'AgentError':
                    hasError = true
                    errorMessage = event.error
                    writeErr(`\n[Agent Error: ${event.error}]\n`)
                    break
            }
        }
        writeOut('\n\nHeadless task complete.\n')
    } finally {
        rl.close()
    }

    return {
        success: !hasError,
        ...(errorMessage ? { error: errorMessage } : {}),
    }
}
