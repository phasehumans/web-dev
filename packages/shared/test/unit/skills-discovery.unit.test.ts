import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'

import { SkillDiscoveryEngine } from '../../src/skills/discovery'

describe('Skill Discovery Engine (Unit)', () => {
    let tmpDir: string
    let mockHomeDir: string

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-discovery-ws-'))
        mockHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-discovery-home-'))
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
        fs.rmSync(mockHomeDir, { recursive: true, force: true })
    })

    function createSkill(dir: string, name: string, description: string, extraYaml: string = '') {
        const skillDir = path.join(dir, name)
        fs.mkdirSync(skillDir, { recursive: true })
        fs.writeFileSync(
            path.join(skillDir, 'SKILL.md'),
            `---
name: ${name}
description: ${description}
${extraYaml}
---

# ${name}
Instructions here.`
        )
        return skillDir
    }

    test('discovers skills in .december/skills/<name>/SKILL.md', () => {
        const decDir = path.join(tmpDir, '.december', 'skills')
        createSkill(decDir, 'docker-deploy', 'Prepares Docker containers.')

        const engine = new SkillDiscoveryEngine({
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const skills = engine.discoverAllSkills()
        expect(skills.length).toBe(1)
        expect(skills[0].name).toBe('docker-deploy')
        expect(skills[0].metadata.description).toBe('Prepares Docker containers.')
        expect(skills[0].origin).toBe('workspace')
    })

    test('discovers skills in .agents/skills/<name>/SKILL.md (Antigravity compatibility)', () => {
        const agentsDir = path.join(tmpDir, '.agents', 'skills')
        createSkill(agentsDir, 'ponytail', 'Forces the laziest solution.')

        const engine = new SkillDiscoveryEngine({
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const skills = engine.discoverAllSkills()
        expect(skills.length).toBe(1)
        expect(skills[0].name).toBe('ponytail')
        expect(skills[0].origin).toBe('workspace')
    })

    test('workspace local skills override global user skills with identical name', () => {
        const globalDir = path.join(mockHomeDir, '.config', 'december', 'skills')
        createSkill(globalDir, 'ponytail', 'Global ponytail description.')

        const wsDir = path.join(tmpDir, '.december', 'skills')
        createSkill(wsDir, 'ponytail', 'Workspace override ponytail description.')

        const engine = new SkillDiscoveryEngine({
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const skills = engine.discoverAllSkills()
        expect(skills.length).toBe(1)
        expect(skills[0].name).toBe('ponytail')
        expect(skills[0].metadata.description).toBe('Workspace override ponytail description.')
        expect(skills[0].origin).toBe('workspace')
    })

    test('global user skills in ~/.gemini/config/skills are discovered', () => {
        const geminiGlobalDir = path.join(mockHomeDir, '.gemini', 'config', 'skills')
        createSkill(geminiGlobalDir, 'gemini-skill', 'Global Gemini skill.')

        const engine = new SkillDiscoveryEngine({
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const skills = engine.discoverAllSkills()
        expect(skills.length).toBe(1)
        expect(skills[0].name).toBe('gemini-skill')
        expect(skills[0].origin).toBe('global')
    })

    test('skips skills marked disable: true', () => {
        const wsDir = path.join(tmpDir, '.december', 'skills')
        createSkill(wsDir, 'active-skill', 'Active skill.')
        createSkill(wsDir, 'disabled-skill', 'Disabled skill.', 'disable: true')

        const engine = new SkillDiscoveryEngine({
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const skills = engine.discoverAllSkills()
        expect(skills.length).toBe(1)
        expect(skills[0].name).toBe('active-skill')
    })

    test('sorts discovered skills alphabetically by canonical name for prompt cache stability', () => {
        const wsDir = path.join(tmpDir, '.december', 'skills')
        createSkill(wsDir, 'zebra', 'Zebra skill.')
        createSkill(wsDir, 'alpha', 'Alpha skill.')
        createSkill(wsDir, 'middle', 'Middle skill.')

        const engine = new SkillDiscoveryEngine({
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const skills = engine.discoverAllSkills()
        expect(skills.map((s) => s.name)).toEqual(['alpha', 'middle', 'zebra'])
    })

    test('indexes auxiliary files in scripts/ and references/', () => {
        const wsDir = path.join(tmpDir, '.december', 'skills')
        const skillDir = createSkill(wsDir, 'tool-skill', 'Skill with scripts.')

        const scriptsDir = path.join(skillDir, 'scripts')
        fs.mkdirSync(scriptsDir, { recursive: true })
        fs.writeFileSync(path.join(scriptsDir, 'run.sh'), '#!/bin/bash\necho 1')

        const refDir = path.join(skillDir, 'references')
        fs.mkdirSync(refDir, { recursive: true })
        fs.writeFileSync(path.join(refDir, 'spec.md'), '# Spec')

        const engine = new SkillDiscoveryEngine({
            workspaceDir: tmpDir,
            homeDir: mockHomeDir,
        })

        const skills = engine.discoverAllSkills()
        expect(skills.length).toBe(1)
        expect(skills[0].scripts.length).toBe(1)
        expect(skills[0].scripts[0]).toContain('run.sh')
        expect(skills[0].references.length).toBe(1)
        expect(skills[0].references[0]).toContain('spec.md')
    })
})
