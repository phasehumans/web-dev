import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'

import { AgentHarness } from '../../src/harness/agent-harness'
import { MockLLM } from '../mock-provider'

describe('AgentHarness (Unit)', () => {
    let tmpDir: string

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'))
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    test('discovers rules and skills from AGENTS.md, .december/AGENTS.md, .december/rules.md, and .december/skills.md', () => {
        const decDir = path.join(tmpDir, '.december')
        fs.mkdirSync(decDir, { recursive: true })

        fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# Root Agents Guide\nRules here.')
        fs.writeFileSync(
            path.join(decDir, 'AGENTS.md'),
            '# December Agents Guide\nMore rules here.'
        )
        fs.writeFileSync(path.join(decDir, 'rules.md'), '# Workspace Rules\nSingle rules file.')
        fs.writeFileSync(path.join(decDir, 'skills.md'), '# Skills\nCustom skill content.')

        const harness = new AgentHarness({
            llm: new MockLLM(),
            tools: [],
            operations: {} as any,
            workspaceDir: tmpDir,
        })

        const agent = harness.getAgent()
        const systemPrompt = agent.systemPrompt

        expect(systemPrompt).toContain('Root Agents Guide')
        expect(systemPrompt).toContain('December Agents Guide')
        expect(systemPrompt).toContain('Workspace Rules')
        expect(systemPrompt).toContain('Custom skill content.')
        expect(systemPrompt).toContain('Inspect Logs & Stack Traces First')
        expect(systemPrompt).toContain('Root Cause Resolution')
        expect(systemPrompt).toContain('Execution & Verification')
    })

    test('uses DEFAULT_BASE_SYSTEM_PROMPT when baseSystemPrompt is omitted', () => {
        const harness = new AgentHarness({
            llm: new MockLLM(),
            tools: [],
            operations: {} as any,
            workspaceDir: tmpDir,
        })

        const systemPrompt = harness.getAgent().systemPrompt
        expect(systemPrompt).toContain('You are December, an autonomous, expert coding agent.')
        expect(systemPrompt).toContain('Inspect Logs & Stack Traces First')
        expect(systemPrompt).toContain('Root Cause Resolution')
        expect(systemPrompt).toContain('No Raw Code In Chat')
        expect(systemPrompt).toContain('Strict Workspace Boundary')
        expect(systemPrompt).toContain('Task Tracking & Lifecycle')
    })
})
