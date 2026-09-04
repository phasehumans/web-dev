import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, test } from 'bun:test'

import { parseSkillContent, parseSkillFile } from '../../src/skills/parser'

describe('Skill Frontmatter Parser (Unit)', () => {
    test('parses clean valid frontmatter with all standard fields', () => {
        const content = `---
name: docker-deploy
description: Prepares, builds, and validates multi-container Docker deployments.
argument-hint: '[dev|staging|prod]'
license: Apache-2.0
tags:
  - docker
  - devops
model:
  recommended: gemini-2.5-pro
disable: false
---

# Docker Deploy

Here are the procedural instructions for deploying with Docker.`

        const parsed = parseSkillContent(content)

        expect(parsed.metadata.name).toBe('docker-deploy')
        expect(parsed.metadata.description).toBe(
            'Prepares, builds, and validates multi-container Docker deployments.'
        )
        expect(parsed.metadata.argumentHint).toBe('[dev|staging|prod]')
        expect(parsed.metadata.license).toBe('Apache-2.0')
        expect(parsed.metadata.tags).toEqual(['docker', 'devops'])
        expect(parsed.metadata.model?.recommended).toBe('gemini-2.5-pro')
        expect(parsed.metadata.disable).toBe(false)
        expect(parsed.body).toBe(
            '# Docker Deploy\n\nHere are the procedural instructions for deploying with Docker.'
        )
    })

    test('parses folded multiline descriptions (> and >-)', () => {
        const content = `---
name: ponytail
description: >-
  Forces the laziest solution that actually works, simplest, shortest, most
  minimal. Channels a senior dev who has seen everything: question whether the
  task needs to exist at all.
argumentHint: '[lite|full|ultra]'
---

Runbook contents here.`

        const parsed = parseSkillContent(content)

        expect(parsed.metadata.name).toBe('ponytail')
        expect(parsed.metadata.description).toBe(
            'Forces the laziest solution that actually works, simplest, shortest, most minimal. Channels a senior dev who has seen everything: question whether the task needs to exist at all.'
        )
        expect(parsed.metadata.argumentHint).toBe('[lite|full|ultra]')
        expect(parsed.body).toBe('Runbook contents here.')
    })

    test('parses literal block descriptions (| and |-)', () => {
        const content = `---
name: formatting-skill
description: |
  Line 1 of description.
  Line 2 of description.
---

Body content.`

        const parsed = parseSkillContent(content)
        expect(parsed.metadata.name).toBe('formatting-skill')
        expect(parsed.metadata.description).toBe('Line 1 of description.\nLine 2 of description.')
    })

    test('parses quoted strings in values', () => {
        const content = `---
name: "quoted-skill"
description: "A description with 'quotes' inside."
argument-hint: "<target>"
---
Instructions.`

        const parsed = parseSkillContent(content)
        expect(parsed.metadata.name).toBe('quoted-skill')
        expect(parsed.metadata.description).toBe("A description with 'quotes' inside.")
        expect(parsed.metadata.argumentHint).toBe('<target>')
    })

    test('throws error when frontmatter delimiters (---) are missing', () => {
        const content = `# Invalid Skill\nNo frontmatter here.`
        expect(() => parseSkillContent(content)).toThrow(/frontmatter/)
    })

    test('throws error when required name field is missing', () => {
        const content = `---
description: Missing name field
---
Instructions.`
        expect(() => parseSkillContent(content)).toThrow(/name/)
    })

    test('throws error when required description field is missing', () => {
        const content = `---
name: my-skill
---
Instructions.`
        expect(() => parseSkillContent(content)).toThrow(/description/)
    })

    test('parseSkillFile reads and parses a skill file from disk', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-parser-test-'))
        try {
            const skillPath = path.join(tmpDir, 'SKILL.md')
            fs.writeFileSync(
                skillPath,
                `---
name: disk-skill
description: Loaded from disk test
---
Disk instructions.`
            )

            const result = parseSkillFile(skillPath)
            expect(result.metadata.name).toBe('disk-skill')
            expect(result.metadata.description).toBe('Loaded from disk test')
            expect(result.body).toBe('Disk instructions.')
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
