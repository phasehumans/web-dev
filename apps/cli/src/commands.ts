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

const DEFAULT_AGENTS_MD = ''

const DEFAULT_RULES_MD = 'Add rules in this file for the agent to use as context.\n'

const DEFAULT_SKILLS_MD = 'Add skills in this file for the agent to use as context.\n'

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
            name: 'settings.json',
            targetPath: path.join(decDir, 'settings.json'),
            displayPath: '.december/settings.json',
            content: JSON.stringify({ thinkingLevel: 'low', steeringMode: 'all' }, null, 2) + '\n',
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
