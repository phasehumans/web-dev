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
    nonInteractive?: boolean
    isAuthenticated?: boolean
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

    if (options.isAuthenticated === false) {
        writeErr(
            'Error: Not authenticated. Please run `december login` or configure an API key (e.g. OPENAI_API_KEY, ANTHROPIC_API_KEY).\n'
        )
        return { success: false, error: 'Not authenticated' }
    }

    const isNonInteractive =
        options.nonInteractive ??
        Boolean(process.env.NON_INTERACTIVE || (stdin === process.stdin && !process.stdin.isTTY))

    const rl = readline.createInterface({
        input: stdin as any,
        output: stdout as any,
    })

    let isPromptActive = false

    const promptUser = (query: string): Promise<string> => {
        isPromptActive = true
        return new Promise((resolve) => {
            rl.question(query, (answer: string) => {
                queueMicrotask(() => {
                    isPromptActive = false
                })
                resolve(answer)
            })
        })
    }

    if (!agent.operations) agent.operations = {} as any
    if (!agent.operations.ui) agent.operations.ui = {} as any

    agent.operations.ui.askQuestion = (questions: any[]) => {
        const q = questions[0]
        writeOut(`\n\n[Question]: ${q.question}\n`)
        if (q.options) {
            q.options.forEach((opt: string, i: number) => writeOut(`${i + 1}. ${opt}\n`))
        }
        if (isNonInteractive) {
            const defaultAnswer = q.options && q.options.length > 0 ? q.options[0] : ''
            writeOut(`\n[Auto-selected in non-interactive mode]: ${defaultAnswer}\n`)
            return Promise.resolve(defaultAnswer)
        }
        return promptUser('\nSelect an option or type your answer: ').then((answer) => {
            const num = parseInt(answer)
            if (!isNaN(num) && num > 0 && q.options && num <= q.options.length) {
                return q.options[num - 1]
            }
            return answer
        })
    }

    agent.operations.ui.requestPermission = async (toolCall: any) => {
        if (isNonInteractive) {
            return { block: false }
        }
        if (
            ['replace_file_content', 'multi_replace_file_content', 'run_command'].includes(
                toolCall.name
            )
        ) {
            const answer = await promptUser(`\nExecute ${toolCall.name}? (y/n): `)
            if (answer.toLowerCase().startsWith('y')) {
                return { block: false }
            } else {
                return { block: true, reason: 'User denied execution in UI.' }
            }
        }
        return { block: false }
    }

    rl.on('line', (input: string) => {
        if (isPromptActive) return
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
                case 'ThinkingChunk':
                    writeOut(event.content)
                    break
                case 'AgentStatus':
                    writeOut(`\n[Status: ${event.message}]\n`)
                    break
                case 'ContextCompacted':
                    writeOut(`\n[Context Compacted: ${event.summary}]\n`)
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
