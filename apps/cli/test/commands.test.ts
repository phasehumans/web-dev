import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

import { handleLogoutCommand, handleInitCommand } from '../src/commands'
import { loadConfig, saveConfig } from '../src/config'

describe('CLI Standalone Commands', () => {
    const tmpDir = path.join(process.cwd(), '.tmp-commands-test')

    beforeEach(async () => {
        await fs.mkdir(tmpDir, { recursive: true })
    })

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('handleLogoutCommand clears decemberToken and providers config', async () => {
        await saveConfig({
            decemberToken: 'test-token',
            email: 'test@example.com',
            providers: { openai: 'sk-test' },
            activeProvider: 'openai',
        })

        await handleLogoutCommand()

        const config = await loadConfig()
        expect(config.decemberToken).toBeUndefined()
        expect(config.email).toBeUndefined()
        expect(config.providers).toEqual({})
        expect(config.activeProvider).toBeUndefined()
    })

    it('handleInitCommand scaffolds .december directory and mcp.json config', async () => {
        const originalCwd = process.cwd()
        try {
            process.chdir(tmpDir)
            await handleInitCommand()

            const mcpExists = await fs
                .access(path.join(tmpDir, '.december', 'mcp.json'))
                .then(() => true)
                .catch(() => false)
            expect(mcpExists).toBe(true)

            const mcpContent = JSON.parse(
                await fs.readFile(path.join(tmpDir, '.december', 'mcp.json'), 'utf-8')
            )
            expect(mcpContent.mcpServers).toBeDefined()
        } finally {
            process.chdir(originalCwd)
        }
    })
})
