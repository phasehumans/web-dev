import fs from 'node:fs/promises'
import path from 'node:path'

import { loadConfig, saveConfig } from './config'

export async function handleLogoutCommand(): Promise<void> {
    const config = await loadConfig()
    delete config.decemberToken
    delete config.email
    config.providers = {}
    delete config.activeProvider
    delete config.activeModel

    await saveConfig(config)
    console.log('Logged out successfully. Stored credentials removed.')
}

const DEFAULT_AGENTS_MD = `# Agent Guidelines & Project Instructions

Add project-specific guidelines, testing commands, architecture patterns, and conventions in this file for December to follow.
`

const DEFAULT_RULES_MD = 'Add rules in this file for the agent to use as context.\n'

const DEFAULT_SKILLS_MD = 'Add skills in this file for the agent to use as context.\n'

const DEFAULT_DECEMBER_IGNORE = `# Build outputs and dependencies
node_modules/
dist/
build/
.next/
.turbo/
*.log

# Environment and secrets
.env*
*.pem
*.key
`

const DEFAULT_COMMANDS_JSON =
    JSON.stringify(
        {
            commands: [
                {
                    name: 'test',
                    description: 'Run tests and fix failures',
                    prompt: "Run 'bun test $PKG'. If any test fails, fix the root cause and verify.",
                },
                {
                    name: 'lint',
                    description: 'Run linter and fix errors',
                    prompt: 'Run linter and fix any reported issues in $FILE.',
                },
                {
                    name: 'commit',
                    description: 'Create conventional git commit',
                    prompt: 'Inspect git status and staged changes, then create a clean git commit adhering strictly to lowercase conventional commits.',
                },
            ],
        },
        null,
        2
    ) + '\n'

const DEFAULT_MCP_JSON =
    JSON.stringify(
        {
            mcpServers: {},
        },
        null,
        2
    ) + '\n'

export async function handleInitCommand(): Promise<void> {
    const rootDir = process.cwd()
    const decDir = path.join(rootDir, '.december')
    await fs.mkdir(decDir, { recursive: true })

    const filesToScaffold: {
        name: string
        targetPath: string
        displayPath: string
        content: string
    }[] = [
        {
            name: 'AGENTS.md',
            targetPath: path.join(rootDir, 'AGENTS.md'),
            displayPath: 'AGENTS.md',
            content: DEFAULT_AGENTS_MD,
        },
        {
            name: '.decemberignore',
            targetPath: path.join(rootDir, '.decemberignore'),
            displayPath: '.decemberignore',
            content: DEFAULT_DECEMBER_IGNORE,
        },
        {
            name: 'rules.md',
            targetPath: path.join(decDir, 'rules.md'),
            displayPath: '.december/rules.md',
            content: DEFAULT_RULES_MD,
        },
        {
            name: 'skills.md',
            targetPath: path.join(decDir, 'skills.md'),
            displayPath: '.december/skills.md',
            content: DEFAULT_SKILLS_MD,
        },
        {
            name: 'commands.json',
            targetPath: path.join(decDir, 'commands.json'),
            displayPath: '.december/commands.json',
            content: DEFAULT_COMMANDS_JSON,
        },
        {
            name: 'mcp.json',
            targetPath: path.join(decDir, 'mcp.json'),
            displayPath: '.december/mcp.json',
            content: DEFAULT_MCP_JSON,
        },
        {
            name: 'settings.json',
            targetPath: path.join(decDir, 'settings.json'),
            displayPath: '.december/settings.json',
            content:
                JSON.stringify(
                    {
                        thinkingLevel: 'low',
                        steeringMode: 'all',
                        toolPermission: 'always-ask',
                        pathGuard: true,
                    },
                    null,
                    2
                ) + '\n',
        },
    ]

    for (const file of filesToScaffold) {
        try {
            await fs.access(file.targetPath)
            console.log(`${file.displayPath} already exists.`)
        } catch {
            await fs.writeFile(file.targetPath, file.content, 'utf-8')
            console.log(`Created ${file.displayPath}`)
        }
    }

    console.log('\nDecember project initialization complete.')
}
