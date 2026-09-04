import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import { handleInitCommand } from '../../src/commands'

describe('CLI Commands & Workflows (Integration)', () => {
    it('executes handleInitCommand in temporary workspace and scaffolds configuration files', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-init-test-'))
        const originalCwd = process.cwd()

        try {
            process.chdir(tmpDir)
            await handleInitCommand()

            expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true)
            expect(fs.existsSync(path.join(tmpDir, '.december', 'commands.json'))).toBe(false)
            expect(fs.existsSync(path.join(tmpDir, '.december', 'mcp.json'))).toBe(true)
            expect(fs.existsSync(path.join(tmpDir, '.december', 'settings.json'))).toBe(true)
            expect(fs.existsSync(path.join(tmpDir, '.decemberignore'))).toBe(false)
            expect(fs.existsSync(path.join(tmpDir, '.december', 'rules.md'))).toBe(false)
            expect(fs.existsSync(path.join(tmpDir, '.december', 'skills.md'))).toBe(false)
        } finally {
            process.chdir(originalCwd)
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
