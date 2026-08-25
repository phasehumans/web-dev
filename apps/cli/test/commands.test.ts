import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

import { handleLogoutCommand, handleInitCommand, handleUpdateCommand } from '../src/commands'
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

    it('handleInitCommand scaffolds workspace files with AGENTS.md in root and config in .december', async () => {
        const originalCwd = process.cwd()
        try {
            process.chdir(tmpDir)
            await handleInitCommand()

            const rootAgentsPath = path.join(tmpDir, 'AGENTS.md')
            const agentsExists = await fs
                .access(rootAgentsPath)
                .then(() => true)
                .catch(() => false)
            expect(agentsExists).toBe(true)

            const agentsContent = await fs.readFile(rootAgentsPath, 'utf-8')
            expect(agentsContent).toContain('Agent Guidelines')

            const decFiles = ['settings.json', 'commands.json', 'mcp.json']
            for (const file of decFiles) {
                const exists = await fs
                    .access(path.join(tmpDir, '.december', file))
                    .then(() => true)
                    .catch(() => false)
                expect(exists).toBe(true)
            }

            const ignoreExists = await fs
                .access(path.join(tmpDir, '.decemberignore'))
                .then(() => true)
                .catch(() => false)
            expect(ignoreExists).toBe(false)

            const rulesExists = await fs
                .access(path.join(tmpDir, '.december', 'rules.md'))
                .then(() => true)
                .catch(() => false)
            expect(rulesExists).toBe(false)

            const skillsExists = await fs
                .access(path.join(tmpDir, '.december', 'skills.md'))
                .then(() => true)
                .catch(() => false)
            expect(skillsExists).toBe(false)

            const rawCommandsContent = await fs.readFile(
                path.join(tmpDir, '.december', 'commands.json'),
                'utf-8'
            )
            expect(rawCommandsContent).toContain('// {')
            expect(rawCommandsContent).toContain('"name": "test"')
            expect(rawCommandsContent).toContain('// }')

            const { parseJsonWithComments, loadCustomCommands } = await import('@december/shared')
            const parsedCommands = parseJsonWithComments<any>(rawCommandsContent)
            expect(Array.isArray(parsedCommands.commands)).toBe(true)
            expect(parsedCommands.commands.length).toBe(0)
            expect(loadCustomCommands(tmpDir)).toEqual([])

            const rawSettingsContent = await fs.readFile(
                path.join(tmpDir, '.december', 'settings.json'),
                'utf-8'
            )
            const parsedSettings = JSON.parse(rawSettingsContent)
            expect(parsedSettings.toolPermission).toBe('always-proceed')
            expect(parsedSettings.thinkingLevel).toBe('auto')
            expect(parsedSettings.steeringMode).toBe('all')
            expect(parsedSettings.followUpMode).toBe('all')
            expect(parsedSettings.pathGuard).toBe(true)
        } finally {
            process.chdir(originalCwd)
        }
    })

    it('handleUpdateCommand executes successfully for local source environment', async () => {
        let loggedOutput = ''
        const originalLog = console.log
        console.log = (...args: any[]) => {
            loggedOutput += args.join(' ') + '\n'
        }
        try {
            await handleUpdateCommand()
            expect(loggedOutput).toContain('December CLI')
        } finally {
            console.log = originalLog
        }
    })
})
