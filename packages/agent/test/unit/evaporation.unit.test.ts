import { describe, it, expect } from 'bun:test'

import { evaporateStaleToolOutputs } from '../../src/utils/evaporation'

import type { AgentMessage } from '@december/shared'

describe('evaporateStaleToolOutputs (Micro-Compaction)', () => {
    it('returns empty array when messages are empty', () => {
        expect(evaporateStaleToolOutputs([])).toEqual([])
    })

    it('does not evaporate tool outputs when total user turns is <= 3', () => {
        const messages: AgentMessage[] = [
            { role: 'user', content: 'turn 1' },
            { role: 'tool', content: 'line1\nline2\nline3\n'.repeat(50) },
            { role: 'assistant', content: 'answer 1' },
            { role: 'user', content: 'turn 2' },
            { role: 'tool', content: 'line1\nline2\nline3\n'.repeat(50) },
            { role: 'assistant', content: 'answer 2' },
        ]

        const result = evaporateStaleToolOutputs(messages, 3)
        expect(result[1].content).toBe(messages[1].content)
        expect(result[4].content).toBe(messages[4].content)
    })

    it('evaporates large tool outputs older than 3 user turns into tombstones', () => {
        const largeOutput = 'line1\nline2\nline3\n'.repeat(50)
        const messages: AgentMessage[] = [
            { role: 'user', content: 'turn 1' },
            { role: 'tool', content: largeOutput },
            { role: 'assistant', content: 'answer 1' },
            { role: 'user', content: 'turn 2' },
            { role: 'tool', content: largeOutput },
            { role: 'assistant', content: 'answer 2' },
            { role: 'user', content: 'turn 3' },
            { role: 'tool', content: largeOutput },
            { role: 'assistant', content: 'answer 3' },
            { role: 'user', content: 'turn 4' },
            { role: 'tool', content: largeOutput },
            { role: 'assistant', content: 'answer 4' },
        ]

        const result = evaporateStaleToolOutputs(messages, 3)

        // Turn 1's tool output (index 1) should be evaporated
        expect(result[1].content).toContain('[Tool Output Evaporated:')
        expect(result[1].content).toContain('lines')

        // Recent turns (Turn 2, 3, 4) tool outputs should remain intact
        expect(result[4].content).toBe(largeOutput)
        expect(result[7].content).toBe(largeOutput)
        expect(result[10].content).toBe(largeOutput)

        // User and assistant reasoning must be 100% preserved
        expect(result[0].content).toBe('turn 1')
        expect(result[2].content).toBe('answer 1')
        expect(result[3].content).toBe('turn 2')
        expect(result[5].content).toBe('answer 2')
    })

    it('preserves failed tool outputs and errors even if older than 3 turns', () => {
        const errorOutput =
            'Command failed with exit code 1:\n[Tool Error] syntax error in src/auth.ts:42\n' +
            'stack trace details\n'.repeat(20)
        const messages: AgentMessage[] = [
            { role: 'user', content: 'turn 1' },
            { role: 'tool', content: errorOutput },
            { role: 'assistant', content: 'answer 1' },
            { role: 'user', content: 'turn 2' },
            { role: 'assistant', content: 'answer 2' },
            { role: 'user', content: 'turn 3' },
            { role: 'assistant', content: 'answer 3' },
            { role: 'user', content: 'turn 4' },
            { role: 'assistant', content: 'answer 4' },
        ]

        const result = evaporateStaleToolOutputs(messages, 3)
        expect(result[1].content).toBe(errorOutput)
    })

    it('does not evaporate small tool outputs under 200 characters', () => {
        const smallOutput = 'File written successfully to src/index.ts'
        const messages: AgentMessage[] = [
            { role: 'user', content: 'turn 1' },
            { role: 'tool', content: smallOutput },
            { role: 'assistant', content: 'answer 1' },
            { role: 'user', content: 'turn 2' },
            { role: 'assistant', content: 'answer 2' },
            { role: 'user', content: 'turn 3' },
            { role: 'assistant', content: 'answer 3' },
            { role: 'user', content: 'turn 4' },
            { role: 'assistant', content: 'answer 4' },
        ]

        const result = evaporateStaleToolOutputs(messages, 3)
        expect(result[1].content).toBe(smallOutput)
    })
})
