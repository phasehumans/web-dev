#!/usr/bin/env node

import { AgentHarness } from '@december/agent'

function AppWrapper(props: any) {
    const session = useAgentSession(props)
    return React.createElement(App, { ...props, session })
}

import { openaiProvider } from '@december/providers'
import {
    BashTool,
    ReadFileTool,
    WriteFileTool,
    LsTool,
    EditFileTool,
    EditDiffTool,
    FindFilesTool,
    GrepSearchTool,
    AskQuestionTool,
    ManageTaskTool,
    BrowserTool,
    WebSearchTool,
} from '@december/tools'
import { ChatApp as App } from '@december/tui'
import { RootLayout } from '@december/tui'
import { render } from 'ink'
import React from 'react'

import pkg from '../package.json' with { type: 'json' }

import { parseCliArgs, getHelpText } from './args'
import { loginViaDeviceCode } from './auth'
export { parseCliArgs, getHelpText } from './args'
import { handleLogoutCommand, handleInitCommand } from './commands'
export { handleLogoutCommand, handleInitCommand } from './commands'
import { getProviderConfig, loadConfig, saveConfig, getAuthStatus } from './config'
import { FileSessionRepository } from './file-session-repository'
import { runHeadlessTask, suppressConsole } from './headless-runner'
export { runHeadlessTask, suppressConsole, restoreConsole } from './headless-runner'
export type { HeadlessTaskOptions, HeadlessTaskResult } from './headless-runner'
import { useAgentSession } from './hooks/use-agent-session'
import { localOperations } from './local-operations'
import { instantiateProvider } from './utils/provider-factory'

async function main() {
    process.title = 'december'
    process.stdout.write('\x1b]0;december\x07')

    const parsedArgs = parseCliArgs(process.argv.slice(2))

    if (parsedArgs.isHelp) {
        console.log(getHelpText(pkg.version))
        process.exit(0)
    }

    if (parsedArgs.isVersion) {
        console.log(pkg.version)
        process.exit(0)
    }

    if (parsedArgs.command === 'logout') {
        await handleLogoutCommand()
        process.exit(0)
    }

    if (parsedArgs.command === 'init') {
        await handleInitCommand()
        process.exit(0)
    }

    // suppress noisy sdk console logs that corrupt the ink tui layout
    suppressConsole()

    const providerConfig = await getProviderConfig()
    const authStatus = await getAuthStatus()

    // if not authenticated, we pass a dummy provider so the agent can boot.
    // the tui will intercept prompts and force them to /login
    let llm: any
    if (providerConfig) {
        llm = instantiateProvider(providerConfig.provider, providerConfig.apiKey)
    } else {
        llm = openaiProvider(undefined, 'dummy-key')
    }

    const isAuthenticated = !!providerConfig

    const sessionRepository = new FileSessionRepository()
    const sessionId = `session-${Date.now()}`

    const config = await loadConfig()

    const harness = new AgentHarness({
        llm: llm,
        tools: [
            BashTool,
            ReadFileTool,
            WriteFileTool,
            LsTool,
            EditFileTool,
            EditDiffTool,
            FindFilesTool,
            GrepSearchTool,
            AskQuestionTool,
            ManageTaskTool,
            BrowserTool,
            WebSearchTool,
        ],
        operations: localOperations,
        modelOptions: {
            model:
                parsedArgs.model ||
                providerConfig?.model ||
                config.activeModel ||
                'gemini-3.6-flash',
            thinkingLevel: config.thinkingLevel || 'medium',
        },
        sessionRepository,
        sessionId: parsedArgs.sessionId || sessionId,
        workspaceDir: process.cwd(),
        hooks: {
            beforeToolCall: async (toolCall) => {
                // future integration: hook into the tui to request user approval for destructive bash commands
            },
        },
        thinkingLevel: config.thinkingLevel || 'medium',
        steeringMode: config.steeringMode || 'all',
        followUpMode: config.followUpMode || 'all',
    })

    const agent = harness.getAgent()

    await agent.loadContext()

    const userEmail = config.decemberToken ? config.email : undefined

    if (parsedArgs.command === 'login') {
        console.log('Generating device code for December login...')
        const { token, email } = await loginViaDeviceCode(undefined, (code, uri) => {
            console.log(`Please open ${uri} on any device and enter code: ${code}`)
        })
        const configToSave = await loadConfig()
        configToSave.decemberToken = token
        if (email) configToSave.email = email
        await saveConfig(configToSave)
        console.log('Successfully logged in via device code!')
        process.exit(0)
    }

    if (parsedArgs.prompt) {
        console.log(`\nExecuting Headless Task: "${parsedArgs.prompt}"\n`)
        const result = await runHeadlessTask(parsedArgs.prompt, { agent })
        process.exit(result.success ? 0 : 1)
    }

    render(
        React.createElement(
            RootLayout,
            null,
            React.createElement(AppWrapper, {
                agent,
                isAuthenticated,
                authMethod: providerConfig?.authMethod,
                hasBothAuth: authStatus.hasByok && authStatus.hasDecember,
                settingsAuthPriority: authStatus.authPriority,
                cliVersion: pkg.version,
                userEmail,
                sessionRepository,
                onLogin: (onCode: (code: string, uri: string) => void) =>
                    loginViaDeviceCode(undefined, onCode),
            })
        ),
        { exitOnCtrlC: false }
    )
}

main().catch(console.error)
