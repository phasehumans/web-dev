#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

import { AgentHarness } from '@december/agent'

function AppWrapper(props: any) {
    const session = useAgentSession(props)
    return React.createElement(App, { ...props, session })
}

import {
    openaiProvider,
    anthropicProvider,
    geminiProvider,
    openrouterProvider,
} from '@december/providers'
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
import dotenv from 'dotenv'
import { render } from 'ink'
import React from 'react'

process.env.DOTENV_CONFIG_QUIET = 'true'
dotenv.config()

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
        switch (providerConfig.provider) {
            case 'openai':
                llm = openaiProvider(undefined, providerConfig.apiKey)
                break
            case 'anthropic':
                llm = anthropicProvider(undefined, providerConfig.apiKey)
                break
            case 'google':
                llm = geminiProvider(providerConfig.apiKey)
                break
            case 'openrouter':
                llm = openrouterProvider(providerConfig.apiKey)
                break
            case 'deepseek':
                llm = openaiProvider('https://api.deepseek.com', providerConfig.apiKey)
                break
            case 'groq':
                llm = openaiProvider('https://api.groq.com/openai/v1', providerConfig.apiKey)
                break
            case 'huggingface':
                llm = openaiProvider(
                    'https://api-inference.huggingface.co/v1/',
                    providerConfig.apiKey
                )
                break
            case 'moonshot':
                llm = openaiProvider('https://api.moonshot.cn/v1', providerConfig.apiKey)
                break
            case 'mistral':
                llm = openaiProvider('https://api.mistral.ai/v1', providerConfig.apiKey)
                break
            case 'xai':
                llm = openaiProvider('https://api.x.ai/v1', providerConfig.apiKey)
                break
            case 'zai':
                llm = openaiProvider('https://api.zai.ai/v1', providerConfig.apiKey)
                break
            default: {
                const serverUrl = process.env.DECEMBER_SERVER_URL || 'https://api.trydecember.com'
                const proxyUrl = `${serverUrl}/api/v1/cli`
                llm = openaiProvider(proxyUrl, providerConfig.apiKey)
                break
            }
        }
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
- At the end of your work, provide a summary of what you did, highlighting important keywords.`,
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
        modelOptions: { model: parsedArgs.model || providerConfig?.model || 'gemini-3.6-flash' },
        sessionRepository,
        sessionId: parsedArgs.sessionId || sessionId,
        workspaceDir: process.cwd(),
        hooks: {
            beforeToolCall: async (toolCall) => {
                // future integration: hook into the tui to request user approval for destructive bash commands
            },
        },
        thinkingLevel: config.thinkingLevel,
        steeringMode: config.steeringMode,
        followUpMode: config.followUpMode,
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
