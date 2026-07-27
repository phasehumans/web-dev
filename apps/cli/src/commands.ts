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

export async function handleInitCommand(): Promise<void> {
    const decDir = path.join(process.cwd(), '.december')
    const mcpPath = path.join(decDir, 'mcp.json')
    const settingsPath = path.join(decDir, 'settings.json')

    await fs.mkdir(decDir, { recursive: true })

    try {
        await fs.access(mcpPath)
        console.log('.december/mcp.json already exists.')
    } catch {
        await fs.writeFile(mcpPath, JSON.stringify({ mcpServers: {} }, null, 2), 'utf-8')
        console.log('Created .december/mcp.json')
    }

    try {
        await fs.access(settingsPath)
        console.log('.december/settings.json already exists.')
    } catch {
        await fs.writeFile(
            settingsPath,
            JSON.stringify({ thinkingLevel: 'low', steeringMode: 'all' }, null, 2),
            'utf-8'
        )
        console.log('Created .december/settings.json')
    }

    console.log('\nDecember project initialization complete.')
}
