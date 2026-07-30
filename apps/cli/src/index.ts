#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

import { AgentHarness } from '@december/agent'

function AppWrapper(props: any) {
    const session = useAgentSession(props)
    return React.createElement(App, { ...props, session })
}

import { openaiProvider } from '@december/providers'
import { configureMCP } from '@december/tools'
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
    GitHubTool,
    MCPTool,
    WebSearchTool,
    readWikiTool,
    updateWikiTool,
    createPrReviewTool,
    submitPrTool,
} from '@december/tools'
import { ChatApp as App } from '@december/tui'
import { RootLayout } from '@december/tui'
import { render } from 'ink'
import React from 'react'

import pkg from '../package.json' with { type: 'json' }

import { parseCliArgs, getHelpText } from './args'
import { loginViaBrowser, loginViaDeviceCode } from './auth'
export { parseCliArgs, getHelpText } from './args'
import { handleLogoutCommand, handleInitCommand } from './commands'
export { handleLogoutCommand, handleInitCommand } from './commands'
import { getProviderConfig, loadConfig, getAuthStatus } from './config'
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

    try {
        const mcpConfigPath = path.join(process.cwd(), 'mcp.json')
        const decMcpPath = path.join(process.cwd(), '.december', 'mcp.json')
        if (fs.existsSync(mcpConfigPath)) {
            const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'))
            configureMCP(mcpConfig.mcpServers || mcpConfig)
        } else if (fs.existsSync(decMcpPath)) {
            const mcpConfig = JSON.parse(fs.readFileSync(decMcpPath, 'utf8'))
            configureMCP(mcpConfig.mcpServers || mcpConfig)
        }
    } catch (err: any) {
        console.warn('Failed to parse mcp.json:', err.message)
    }

    const config = await loadConfig()

    const harness = new AgentHarness({
        baseSystemPrompt: `You are December, an autonomous, expert coding agent. You help the user by exploring codebases, executing terminal commands, editing files, and resolving complex tasks.
Guidelines:
- Plan carefully before making broad changes.
- Use bash tools to explore the environment before guessing file paths.
- Be extremely concise in your responses. The user is a developer who values speed and exactness.
- ALWAYS show absolute file paths when viewing or editing files.
- Before using a tool, you MUST enclose your thought process inside <thought>...</thought> tags.
- At the end of your work, provide a concise summary of what you did (4-5 lines maximum, written as a single cohesive paragraph), highlighting key actions and results.`,
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
            GitHubTool,
            MCPTool,
            WebSearchTool,
            readWikiTool,
            updateWikiTool,
            createPrReviewTool,
            submitPrTool,
        ],
        operations: localOperations,
        modelOptions: {
            model: parsedArgs.model || providerConfig?.model || 'gemini-3.6-flash',
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
        console.log('Please login via the browser...')
        await loginViaBrowser()
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
                onLogin: (onUrlGenerated) => loginViaBrowser(undefined, onUrlGenerated),
                onLoginHeadless: (onCode: (code: string, uri: string) => void) =>
                    loginViaDeviceCode(undefined, onCode),
            })
        ),
        { exitOnCtrlC: false }
    )
}

main().catch(console.error)
