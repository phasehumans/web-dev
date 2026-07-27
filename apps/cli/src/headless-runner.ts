import readline from 'readline'

import { runAgentLoop } from '@december/agent'

import type { Agent } from '@december/agent'

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
    const {
        agent,
        stdin = process.stdin,
        stdout = process.stdout,
        stderr = process.stderr,
    } = options

    const rl = readline.createInterface({
        input: stdin as any,
        output: stdout as any,
    })

    if (!agent.operations) agent.operations = {} as any
    if (!agent.operations.ui) agent.operations.ui = {} as any

    agent.operations.ui.askQuestion = (questions: any[]) => {
        return new Promise((resolve) => {
            const q = questions[0]
            console.log(`\n\n[Question]: ${q.question}`)
            if (q.options) {
                q.options.forEach((opt: string, i: number) => console.log(`${i + 1}. ${opt}`))
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
            console.log(`\n[Steering input sent to agent]\n`)
        }
    })

    let hasError = false
    let errorMessage: string | undefined

    try {
        const stream = runAgentLoop(agent, prompt)

        for await (const event of stream) {
            switch (event.type) {
                case 'StreamChunk':
                    if (stdout.write) stdout.write(event.content)
                    break
                case 'ToolCallStart':
                    console.log(`\n\n[Tool Executing: ${event.toolCall.name}]`)
                    console.log(event.toolCall.input)
                    break
                case 'ToolCallResult':
                    if (event.result.error) {
                        console.error(`[Tool Error] ${event.result.error}`)
                    } else {
                        console.log(`[Tool Result Received]`)
                    }
                    break
                case 'AgentUsage':
                    console.log(
                        `\n[Usage: ${event.promptTokens} prompt, ${event.completionTokens} completion]`
                    )
                    break
                case 'AgentError':
                    hasError = true
                    errorMessage = event.error
                    console.error(`\n[Agent Error: ${event.error}]`)
                    break
            }
        }
        console.log('\n\nHeadless task complete.')
    } finally {
        rl.close()
    }

    return {
        success: !hasError,
        ...(errorMessage ? { error: errorMessage } : {}),
    }
}
