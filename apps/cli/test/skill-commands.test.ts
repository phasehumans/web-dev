import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'

import {
    handleSkillList,
    handleSkillCreate,
    handleSkillInfo,
    handleSkillAdd,
    handleSkillRemove,
    handleSkillCommand,
} from '../src/commands/skill'

describe('CLI Skill Commands (Unit & Integration)', () => {
    let tmpDir: string
    let mockHomeDir: string

    beforeEach(() => {
        process.exitCode = 0
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-skill-ws-'))
        mockHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-skill-home-'))
    })

    afterEach(() => {
        process.exitCode = 0
        fs.rmSync(tmpDir, { recursive: true, force: true })
        fs.rmSync(mockHomeDir, { recursive: true, force: true })
    })

    it('handleSkillCreate scaffolds a new skill directory globally by default', async () => {
        let loggedOutput = ''
        const origLog = console.log
        console.log = (msg: any) => {
            loggedOutput += String(msg) + '\n'
        }

        try {
            await handleSkillCreate({
                name: 'docker-deploy',
                workspaceDir: tmpDir,
                homeDir: mockHomeDir,
            })

            const skillDir = path.join(
                mockHomeDir,
                '.config',
                'december',
                'skills',
                'docker-deploy'
            )
            expect(fs.existsSync(skillDir)).toBe(true)
            expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true)
            expect(fs.existsSync(path.join(skillDir, 'scripts'))).toBe(true)

            const content = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8')
            expect(content).toContain('name: docker-deploy')
            expect(content).toContain('# docker-deploy')
            expect(loggedOutput).toContain("Created skill 'docker-deploy'")
        } finally {
            console.log = origLog
        }
    })

    it('handleSkillCreate supports .agents/skills with isLocal: true', async () => {
        fs.mkdirSync(path.join(tmpDir, '.agents'), { recursive: true })

        await handleSkillCreate({
            name: 'tdd',
            isLocal: true,
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const skillDir = path.join(tmpDir, '.agents', 'skills', 'tdd')
        expect(fs.existsSync(skillDir)).toBe(true)
        expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true)
    })

    it('handleSkillCreate rejects path traversal in skill name', async () => {
        let loggedError = ''
        const origError = console.error
        console.error = (msg: any) => {
            loggedError += String(msg) + '\n'
        }

        try {
            await handleSkillCreate({
                name: '../../malicious',
                workspaceDir: tmpDir,
                homeDir: mockHomeDir,
            })
            expect(loggedError).toContain('Invalid skill name')
        } finally {
            console.error = origError
        }
    })

    it('handleSkillList lists discovered skills across scopes', async () => {
        let loggedOutput = ''
        const origLog = console.log
        console.log = (msg: any) => {
            loggedOutput += String(msg) + '\n'
        }

        try {
            await handleSkillCreate({
                name: 'alpha-skill',
                isLocal: true,
                workspaceDir: tmpDir,
                homeDir: mockHomeDir,
            })

            await handleSkillList({
                workspaceDir: tmpDir,
                homeDir: mockHomeDir,
            })

            expect(loggedOutput).toContain('alpha-skill')
            expect(loggedOutput).toContain('workspace')
        } finally {
            console.log = origLog
        }
    })

    it('handleSkillInfo outputs parsed metadata and instructions', async () => {
        let loggedOutput = ''
        const origLog = console.log
        console.log = (msg: any) => {
            loggedOutput += String(msg) + '\n'
        }

        try {
            await handleSkillCreate({
                name: 'beta-skill',
                workspaceDir: tmpDir,
                homeDir: mockHomeDir,
            })

            await handleSkillInfo({
                name: 'beta-skill',
                workspaceDir: tmpDir,
                homeDir: mockHomeDir,
            })

            expect(loggedOutput).toContain('Skill: beta-skill')
            expect(loggedOutput).toContain('Location:')
            expect(loggedOutput).toContain('# beta-skill')
        } finally {
            console.log = origLog
        }
    })

    it('handleSkillAdd installs skill globally by default and locally with isLocal', async () => {
        const sourceDir = path.join(tmpDir, 'local-source-skill')
        fs.mkdirSync(sourceDir, { recursive: true })
        fs.writeFileSync(
            path.join(sourceDir, 'SKILL.md'),
            `---
name: imported-skill
description: Imported from local directory.
---
# Imported Skill Content`
        )

        // 1. Default: global
        await handleSkillAdd({
            source: sourceDir,
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const globalDestDir = path.join(
            mockHomeDir,
            '.config',
            'december',
            'skills',
            'imported-skill'
        )
        expect(fs.existsSync(globalDestDir)).toBe(true)
        expect(fs.existsSync(path.join(globalDestDir, 'SKILL.md'))).toBe(true)

        // 2. Explicit: isLocal
        await handleSkillAdd({
            source: sourceDir,
            isLocal: true,
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
            name: 'local-imported',
        })

        const localDestDir = path.join(tmpDir, '.december', 'skills', 'local-imported')
        expect(fs.existsSync(localDestDir)).toBe(true)
        expect(fs.existsSync(path.join(localDestDir, 'SKILL.md'))).toBe(true)
    })

    it('handleSkillRemove deletes skill safely', async () => {
        await handleSkillCreate({
            name: 'to-delete',
            isLocal: true,
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const skillDir = path.join(tmpDir, '.december', 'skills', 'to-delete')
        expect(fs.existsSync(skillDir)).toBe(true)

        await handleSkillRemove({
            name: 'to-delete',
            isLocal: true,
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        expect(fs.existsSync(skillDir)).toBe(false)
    })

    it('handleSkillCommand routes subcommands with help and usage text', async () => {
        let loggedOutput = ''
        const origLog = console.log
        console.log = (msg: any) => {
            loggedOutput += String(msg) + '\n'
        }

        try {
            await handleSkillCommand({
                action: 'help',
                workspaceDir: tmpDir,
                homeDir: mockHomeDir,
            })
            expect(loggedOutput).toContain('Usage: december skill')
            expect(loggedOutput).toContain('list')
            expect(loggedOutput).toContain('create')
            expect(loggedOutput).toContain('add')
            expect(loggedOutput).toContain('remove')
        } finally {
            console.log = origLog
        }
    })
})
