#!/usr/bin/env node

import path from 'node:path'

import pkg from '../package.json' with { type: 'json' }

import { parseCliArgs, getHelpText } from './args'
import { handleLogoutCommand, handleInitCommand, handleUpdateCommand } from './commands'

export { parseCliArgs, getHelpText } from './args'
export { handleLogoutCommand, handleInitCommand, handleUpdateCommand } from './commands'
export { runHeadlessTask, suppressConsole, restoreConsole } from './headless-runner'
export type { HeadlessTaskOptions, HeadlessTaskResult } from './headless-runner'

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

    if (parsedArgs.cwd) {
        process.chdir(parsedArgs.cwd)
    }

    if (parsedArgs.command === 'logout') {
        await handleLogoutCommand()
        process.exit(0)
    }

    if (parsedArgs.command === 'init') {
        await handleInitCommand()
        process.exit(0)
    }

    if (parsedArgs.command === 'update') {
        await handleUpdateCommand()
        process.exit(process.exitCode || 0)
    }

    if (parsedArgs.command === 'login') {
        const { loginViaDeviceCode } = await import('./auth')
        const { loadConfig, saveConfig } = await import('./config')
        console.log('\nGenerating device code for December login...')
        const { token, email } = await loginViaDeviceCode(undefined, (code, uri) => {
            console.log(
                `\nPlease open ${uri} on any device and enter code: ${code}\nWaiting for authorization...`
            )
        })
        const configToSave = await loadConfig()
        configToSave.decemberToken = token
        if (email) configToSave.email = email
        await saveConfig(configToSave)
        console.log('\x1b[32mSuccessfully logged in via device code!\x1b[0m\n')
        process.exit(0)
    }

    // Lazy load heavy dependencies ONLY when running an interactive session or headless task
    const [
        { AgentHarness },
        { openaiProvider },
        toolsModule,
        tuiModule,
        inkModule,
        reactModule,
        { FileSessionRepository },
        { getProviderConfig, loadConfig, getAuthStatus },
        { runHeadlessTask, suppressConsole },
        { useAgentSession },
        { localOperations, setActiveScopeDir },
        { instantiateProvider },
    ] = await Promise.all([
        import('@december/agent'),
        import('@december/providers'),
        import('@december/tools'),
        import('@december/tui'),
        import('ink'),
        import('react'),
        import('./file-session-repository'),
        import('./config'),
        import('./headless-runner'),
        import('./hooks/use-agent-session'),
        import('./local-operations'),
        import('./utils/provider-factory'),
    ])

    if (parsedArgs.scope) {
        setActiveScopeDir(parsedArgs.scope)
    }

    const React = reactModule.default || reactModule
    const { render } = inkModule
    const { ChatApp: App, RootLayout } = tuiModule

    // Suppress noisy sdk console logs that corrupt the ink tui layout
    suppressConsole()

    const providerConfig = await getProviderConfig()
    const authStatus = await getAuthStatus()

    // If not authenticated, pass a dummy provider so the agent can boot.
    // The TUI will intercept prompts and force them to /login
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
            toolsModule.BashTool,
            toolsModule.ReadFileTool,
            toolsModule.WriteFileTool,
            toolsModule.LsTool,
            toolsModule.EditFileTool,
            toolsModule.EditDiffTool,
            toolsModule.FindFilesTool,
            toolsModule.GrepSearchTool,
            toolsModule.AskQuestionTool,
            toolsModule.ManageTaskTool,
            toolsModule.BrowserTool,
            toolsModule.WebSearchTool,
            toolsModule.PythonReplTool,
            toolsModule.MCPTool,
        ],
        operations: localOperations,
        modelOptions: {
            model:
                parsedArgs.model ||
                providerConfig?.model ||
                config.activeModel ||
                'gemini-3.6-flash',
            thinkingLevel: config.thinkingLevel || 'auto',
        },
        sessionRepository,
        sessionId: parsedArgs.sessionId || sessionId,
        workspaceDir: parsedArgs.scope
            ? path.resolve(process.cwd(), parsedArgs.scope)
            : process.cwd(),
        hooks: {
            beforeToolCall: async (toolCall) => {
                // Future integration: hook into the TUI to request user approval for destructive bash commands
            },
        },
        thinkingLevel: config.thinkingLevel || 'auto',
        steeringMode: config.steeringMode || 'all',
        followUpMode: config.followUpMode || 'all',
    })

    const agent = harness.getAgent()

    if (parsedArgs.prompt) {
        await agent.loadContext()
        await harness.initMCP().catch(() => {})
        if (!parsedArgs.json) {
            console.log(`\nExecuting Headless Task: "${parsedArgs.prompt}"\n`)
        }
        const result = await runHeadlessTask(parsedArgs.prompt, {
            agent,
            nonInteractive: parsedArgs.yes,
            json: parsedArgs.json,
        })
        process.exit(result.success ? 0 : 1)
    }

    // Non-blocking MCP initialization and session context loading during TUI mounting
    harness.initMCP().catch(() => {})
    agent.loadContext().catch((err: any) => {
        // Log silently or ignore context load errors on fresh sessions
    })

    function AppWrapper(props: any) {
        const [latestVersion, setLatestVersion] = React.useState(undefined as string | undefined)
        React.useEffect(() => {
            import('./utils/version-check')
                .then(({ checkForLatestVersion }) => {
                    checkForLatestVersion(pkg.version).then((v) => {
                        if (v) setLatestVersion(v)
                    })
                })
                .catch(() => {})
        }, [])

        const handleUpdateSuccess = React.useCallback(async () => {
            const { clearVersionCheckCache } = await import('./utils/version-check')
            await clearVersionCheckCache()
        }, [])

        const session = useAgentSession(props)
        return React.createElement(App, {
            ...props,
            latestVersion,
            onUpdateSuccess: handleUpdateSuccess,
            session,
        })
    }

    const userEmail = config.decemberToken ? config.email : undefined

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
                    import('./auth').then(({ loginViaDeviceCode }) =>
                        loginViaDeviceCode(undefined, onCode)
                    ),
            })
        ),
        { exitOnCtrlC: false }
    )
}

main().catch(console.error)
