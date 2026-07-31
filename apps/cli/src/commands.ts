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

const DEFAULT_AGENTS_MD = `# AGENTS.md\n`

const DEFAULT_RULES_MD = `# Rules\n`

const DEFAULT_SKILLS_MD = `# Skills\n`

export async function handleInitCommand(): Promise<void> {
    const decDir = path.join(process.cwd(), '.december')
    await fs.mkdir(decDir, { recursive: true })

    const filesToScaffold: { name: string; content: string }[] = [
        { name: 'AGENTS.md', content: DEFAULT_AGENTS_MD },
        { name: 'rules.md', content: DEFAULT_RULES_MD },
        { name: 'skills.md', content: DEFAULT_SKILLS_MD },
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
