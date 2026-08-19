import { describe, expect, it } from 'bun:test'

import { getAdaptiveThinkingLevel, isSimpleConversationalTurn } from '../../src/agent-loop'

import type { AgentMessage } from '@december/shared'

describe('Adaptive Thinking Level Classifier (Unit)', () => {
    it('returns off when messages are empty or contain no user message', () => {
        expect(getAdaptiveThinkingLevel([])).toBe('off')
        expect(
            getAdaptiveThinkingLevel([
                { role: 'system', content: 'You are an agent.' },
                { role: 'assistant', content: 'Ready.' },
            ])
        ).toBe('off')
    })

    it('ignores isUI user messages and processes actual user content', () => {
        const messages: AgentMessage[] = [
            { role: 'user', content: 'please refactor the entire authentication service' },
            { role: 'user', content: 'UI message', isUI: true },
        ]
        expect(getAdaptiveThinkingLevel(messages)).toBe('high')
    })

    it('returns off for slash commands', () => {
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: '/help' }])).toBe('off')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: '/commit' }])).toBe('off')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: '/settings' }])).toBe('off')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: '/mcp add server' }])).toBe('off')
    })

    it('returns off for simple greetings and short conversational queries', () => {
        const greetings = [
            'hi',
            'hello',
            'hey',
            'thanks',
            'thank you',
            'yes',
            'no',
            'ok',
            'okay',
            'bye',
            'ping',
            'help',
        ]
        for (const greeting of greetings) {
            expect(getAdaptiveThinkingLevel([{ role: 'user', content: greeting }])).toBe('off')
            expect(isSimpleConversationalTurn([{ role: 'user', content: greeting }])).toBe(true)
        }

        expect(getAdaptiveThinkingLevel([{ role: 'user', content: 'what can you do' }])).toBe('off')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: 'who are you' }])).toBe('off')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: 'short query' }])).toBe('off')
    })

    it('returns minimal for simple read-only lookup queries without refactor or fix keywords', () => {
        const lookupQueries = [
            'read the config file',
            'view the auth routes',
            'show me the error in logs',
            'find the user controller',
            'search for database pool settings',
            'list the files in packages/agent',
            'check if package.json has jest',
            'where is the entry point defined',
            'what is the port number',
            'how to run the dev script',
        ]

        for (const query of lookupQueries) {
            expect(getAdaptiveThinkingLevel([{ role: 'user', content: query }])).toBe('minimal')
            expect(isSimpleConversationalTurn([{ role: 'user', content: query }])).toBe(false)
        }
    })

    it('returns high for queries containing heavy refactoring, debugging, or architecture keywords', () => {
        const heavyQueries = [
            'please refactor the auth middleware to support oauth2 and jwt',
            'debug the memory leak in the websocket connection handler',
            'architect a new distributed caching layer with redis cluster',
            'rewrite the sql query generator with full type safety',
            'migrate from prisma to drizzle orm across all services',
            'fix tests in packages/providers that are failing on macos',
            'fix error ECONNRESET when streaming responses',
        ]

        for (const query of heavyQueries) {
            expect(getAdaptiveThinkingLevel([{ role: 'user', content: query }])).toBe('high')
        }
    })

    it('returns high for prompt text exceeding 300 characters', () => {
        const longPrompt = 'a'.repeat(301)
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: longPrompt }])).toBe('high')
    })

    it('returns configured level or auto for standard code prompts that do not match edge tiers', () => {
        const standardPrompt = 'add a helper function to format timestamps as ISO strings in UTC'
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: standardPrompt }])).toBe('auto')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: standardPrompt }], 'low')).toBe(
            'low'
        )
        expect(
            getAdaptiveThinkingLevel([{ role: 'user', content: standardPrompt }], 'medium')
        ).toBe('medium')
    })

    it('handles non-string user message content safely', () => {
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: null as any }])).toBe('off')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: undefined as any }])).toBe('off')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: '   ' }])).toBe('off')
    })
})
