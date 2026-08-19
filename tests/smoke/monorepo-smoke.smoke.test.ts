import { Agent, AgentHarness } from '@december/agent'
import { getModelContextWindow } from '@december/providers'
import { ReadFileTool, WriteFileTool, BashTool } from '@december/tools'
import { THEME } from '@december/tui'
import { describe, expect, it } from 'bun:test'

import { parseCliArgs, getHelpText } from '../../apps/cli/src/args'

describe('Monorepo End-to-End Smoke Tests', () => {
    it('verifies all 5 core modules (agent, tools, providers, tui, cli) export valid runtime interfaces and schemas', () => {
        // 1. Agent
        expect(Agent).toBeDefined()
        expect(AgentHarness).toBeDefined()

        // 2. Tools
        expect(ReadFileTool.name).toBe('read_file')
        expect(WriteFileTool.name).toBe('write_file')
        expect(BashTool.name).toBe('bash')

        // 3. Providers
        expect(getModelContextWindow('gemini-3.7-flash')).toBe(1_000_000)
        expect(getModelContextWindow('claude-3-7-sonnet-latest')).toBe(200_000)

        // 4. TUI
        expect(THEME.colors.brand).toBe('#89B4F8')
        expect(THEME.colors.success).toBe('#6EE7B7')

        // 5. CLI
        const parsed = parseCliArgs(['-v'])
        expect(parsed.isVersion).toBe(true)
        expect(getHelpText('0.3.9')).toContain('December CLI')
    })
})
