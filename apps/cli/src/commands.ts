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

const DEFAULT_AGENTS_MD = `# AGENTS.md

Welcome to December workspace instructions. December automatically loads project context, coding rules, and available agent skills from \`.december/\`.
`

const DEFAULT_RULES_MD = `# Rules

- **Code Quality**: Ensure all functions have proper TypeScript typing and descriptive parameter names.
- **Error Handling**: Never use empty catch blocks; always handle or explicitly log exceptions.
- **Testing**: Write unit or integration tests for new services and run test suites before submitting changes.
- **Architecture**: Keep business logic inside service modules and delegate HTTP request parsing to controllers.
`

const DEFAULT_SKILLS_MD = `# Skills

- **Code Review**: Autonomous code review checking coding standards and architectural requirements.
- **Refactoring**: Step-by-step code refactoring with incremental safety checks and clean commits.
- **Bug Diagnosis**: Systematic root cause investigation using log tracebacks and regression tests.
- **Test Generation**: Automated generation of unit and integration test suites using red-green-refactor patterns.
`

export async function handleInitCommand(): Promise<void> {
    const decDir = path.join(process.cwd(), '.december')
    await fs.mkdir(decDir, { recursive: true })

    const filesToScaffold: { name: string; content: string }[] = [
        { name: 'AGENTS.md', content: DEFAULT_AGENTS_MD },
        { name: 'rules.md', content: DEFAULT_RULES_MD },
        { name: 'skills.md', content: DEFAULT_SKILLS_MD },
        { name: 'mcp.json', content: JSON.stringify({ mcpServers: {} }, null, 2) + '\n' },
        {
            name: 'settings.json',
            content: JSON.stringify({ thinkingLevel: 'low', steeringMode: 'all' }, null, 2) + '\n',
        },
    ]

    for (const file of filesToScaffold) {
        const filePath = path.join(decDir, file.name)
        try {
            await fs.access(filePath)
            console.log(`.december/${file.name} already exists.`)
        } catch {
            await fs.writeFile(filePath, file.content, 'utf-8')
            console.log(`Created .december/${file.name}`)
        }
    }

    console.log('\nDecember project initialization complete.')
}
