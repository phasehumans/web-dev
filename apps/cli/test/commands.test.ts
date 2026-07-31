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

    it('handleInitCommand scaffolds workspace files with AGENTS.md in root and rules/skills in .december', async () => {
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
            expect(agentsContent).toBe('')

            const decFiles = ['rules.md', 'skills.md', 'settings.json']
            for (const file of decFiles) {
                const exists = await fs
                    .access(path.join(tmpDir, '.december', file))
                    .then(() => true)
                    .catch(() => false)
                expect(exists).toBe(true)
            }

            const rulesContent = await fs.readFile(
                path.join(tmpDir, '.december', 'rules.md'),
                'utf-8'
            )
            expect(rulesContent).not.toContain('#')
            expect(rulesContent).toBe('Add rules in this file for the agent to use as context.\n')

            const skillsContent = await fs.readFile(
                path.join(tmpDir, '.december', 'skills.md'),
                'utf-8'
            )
            expect(skillsContent).not.toContain('#')
            expect(skillsContent).toBe('Add skills in this file for the agent to use as context.\n')
        } finally {
            process.chdir(originalCwd)
        }
    })
})
