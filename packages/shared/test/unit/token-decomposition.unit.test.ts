import { describe, expect, test } from 'bun:test'

import {
    estimateTextTokens,
    decomposeSystemPrompt,
    decomposeTools,
    decomposeMessages,
    decomposeContext,
} from '../../src/utils/token-decomposition'

describe('Token Decomposition (Unit)', () => {
    describe('estimateTextTokens', () => {
        test('returns 0 for empty or undefined input', () => {
            expect(estimateTextTokens('')).toBe(0)
            expect(estimateTextTokens(null)).toBe(0)
            expect(estimateTextTokens(undefined)).toBe(0)
        })

        test('calculates character/4 ceiling accurately', () => {
            expect(estimateTextTokens('abcd')).toBe(1)
            expect(estimateTextTokens('abcde')).toBe(2)
            expect(estimateTextTokens('a'.repeat(400))).toBe(100)
        })
    })

    describe('decomposeSystemPrompt', () => {
        test('decomposes composite prompt with base prompt, skills, rules, and dynamic env', () => {
            const base = 'You are December, an autonomous coding agent.'
            const skills = 'Available Skills:\n- Skill 1\n- Skill 2'
            const rules =
                '<project_context>\nThe user has provided instructions:\n<project_instructions path="AGENTS.md">\nRule 1: Always verify\n</project_instructions>\n<project_instructions path=".december/rules.md">\nRule 2: Surgical edits\n</project_instructions>\n</project_context>'
            const env = 'Current date: 2026-08-19\nCurrent working directory: /home/workspace'

            const composite = `${base}\n\n${skills}\n\n${rules}\n\n${env}`

            const result = decomposeSystemPrompt(composite)

            expect(result.basePrompt).toBe(base)
            expect(result.basePromptTokens).toBe(estimateTextTokens(base))

            expect(result.skills).toEqual(['- Skill 1', '- Skill 2'])
            expect(result.skillsText).toBe('- Skill 1\n- Skill 2')
            expect(result.skillsTokens).toBe(estimateTextTokens('- Skill 1\n- Skill 2'))

            expect(result.rules.length).toBe(2)
            expect(result.rules[0]).toEqual({
                path: 'AGENTS.md',
                content: 'Rule 1: Always verify',
                tokens: estimateTextTokens('Rule 1: Always verify'),
            })
            expect(result.rules[1]).toEqual({
                path: '.december/rules.md',
                content: 'Rule 2: Surgical edits',
                tokens: estimateTextTokens('Rule 2: Surgical edits'),
            })
            expect(result.rulesTokens).toBe(estimateTextTokens(rules))

            expect(result.dynamicEnv).toBe(env)
            expect(result.dynamicEnvTokens).toBe(estimateTextTokens(env))

            expect(result.totalTokens).toBe(
                result.basePromptTokens +
                    result.rulesTokens +
                    result.skillsTokens +
                    result.dynamicEnvTokens
            )
        })

        test('handles simple system prompt with no skills or rules', () => {
            const prompt = 'You are a helpful assistant.'
            const result = decomposeSystemPrompt(prompt)

            expect(result.basePrompt).toBe('You are a helpful assistant.')
            expect(result.basePromptTokens).toBe(estimateTextTokens(prompt))
            expect(result.skills).toEqual([])
            expect(result.skillsTokens).toBe(0)
            expect(result.rules).toEqual([])
            expect(result.rulesTokens).toBe(0)
            expect(result.dynamicEnv).toBe('')
            expect(result.dynamicEnvTokens).toBe(0)
            expect(result.totalTokens).toBe(estimateTextTokens(prompt))
        })

        test('handles null/undefined prompt safely', () => {
            const result = decomposeSystemPrompt(null)
            expect(result.basePrompt).toBe('')
            expect(result.totalTokens).toBe(0)
        })
    })

    describe('decomposeTools', () => {
        test('separates built-in tools from dynamic MCP tools', () => {
            const tools = [
                {
                    name: 'read_file',
                    description: 'Read file contents',
                    inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
                },
                {
                    name: 'edit_file',
                    description: 'Edit a file',
                    inputSchema: { type: 'object' },
                },
                {
                    name: 'github__search_issues',
                    description: 'Search github issues via MCP',
                    inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
                },
            ]

            const result = decomposeTools(tools)

            expect(result.builtInTools.tools.length).toBe(2)
            expect(result.builtInTools.tools.map((t) => t.name)).toEqual(['read_file', 'edit_file'])
            expect(result.builtInTools.tools.every((t) => !t.isMcp)).toBe(true)

            expect(result.dynamicMcpTools.tools.length).toBe(1)
            expect(result.dynamicMcpTools.tools[0].name).toBe('github__search_issues')
            expect(result.dynamicMcpTools.tools[0].isMcp).toBe(true)
            expect(result.dynamicMcpTools.tools[0].serverName).toBe('github')

            expect(result.totalTokens).toBe(
                result.builtInTools.tokens + result.dynamicMcpTools.tokens
            )
        })

        test('handles Map of tools and empty tools safely', () => {
            const toolMap = new Map([
                ['bash', { name: 'bash', description: 'Run bash command', inputSchema: {} }],
            ])
            const result = decomposeTools(toolMap)
            expect(result.builtInTools.tools.length).toBe(1)
            expect(result.dynamicMcpTools.tools.length).toBe(0)

            const emptyResult = decomposeTools(null)
            expect(emptyResult.totalTokens).toBe(0)
            expect(emptyResult.allTools.length).toBe(0)
        })
    })

    describe('decomposeMessages', () => {
        test('calculates user, assistant, and tool message tokens accurately', () => {
            const messages = [
                { role: 'system', content: 'System prompt text' }, // Should be ignored
                { role: 'user', content: 'Hello December' },
                { role: 'user', content: 'UI message', isUI: true }, // Should be ignored
                {
                    role: 'assistant',
                    content: 'I will run a tool.',
                    toolCalls: [{ id: 'tc1', name: 'bash', input: 'ls' }],
                },
                { role: 'tool', content: 'file1.txt\nfile2.txt' },
            ]

            const result = decomposeMessages(messages)

            expect(result.userTokens).toBe(estimateTextTokens('Hello December'))
            expect(result.assistantTokens).toBe(estimateTextTokens('I will run a tool.'))
            expect(result.toolTokens).toBe(
                estimateTextTokens(JSON.stringify([{ id: 'tc1', name: 'bash', input: 'ls' }])) +
                    estimateTextTokens('file1.txt\nfile2.txt')
            )
            expect(result.totalTokens).toBe(
                result.userTokens + result.assistantTokens + result.toolTokens
            )
        })
    })

    describe('decomposeContext', () => {
        test('computes complete context decomposition including cacheable static prefix', () => {
            const basePrompt = 'Base prompt'
            const skills = 'Available Skills:\n- Skill A'
            const rules =
                '<project_context>\n<project_instructions path="AGENTS.md">\nFollow rules\n</project_instructions>\n</project_context>'
            const env = 'Current date: 2026-08-19'
            const fullSystemPrompt = `${basePrompt}\n\n${skills}\n\n${rules}\n\n${env}`

            const tools = [
                { name: 'read_file', description: 'Read', inputSchema: {} },
                { name: 'mcp__tool', description: 'MCP', inputSchema: {} },
            ]

            const messages = [
                { role: 'system', content: fullSystemPrompt },
                { role: 'user', content: 'User question' },
                { role: 'assistant', content: 'Assistant answer' },
            ]

            const decomp = decomposeContext({
                systemPrompt: fullSystemPrompt,
                tools,
                messages,
                model: 'gemini-3.6-flash',
                maxTokens: 100000,
            })

            expect(decomp.model).toBe('gemini-3.6-flash')
            expect(decomp.maxTokens).toBe(100000)
            expect(decomp.basePrompt.text).toBe('Base prompt')
            expect(decomp.skills.items).toEqual(['- Skill A'])
            expect(decomp.rules.files.length).toBe(1)
            expect(decomp.builtInTools.tools.length).toBe(1)
            expect(decomp.dynamicMcpTools.tools.length).toBe(1)

            // Cacheable static prefix = basePrompt + rules + skills + builtInTools + dynamicMcpTools
            const expectedCacheable =
                decomp.basePrompt.tokens +
                decomp.rules.tokens +
                decomp.skills.tokens +
                decomp.builtInTools.tokens +
                decomp.dynamicMcpTools.tokens
            expect(decomp.cacheableStaticPrefixTokens).toBe(expectedCacheable)

            expect(decomp.totalTokens).toBe(
                decomp.basePrompt.tokens +
                    decomp.rules.tokens +
                    decomp.skills.tokens +
                    decomp.dynamicEnv.tokens +
                    decomp.builtInTools.tokens +
                    decomp.dynamicMcpTools.tokens +
                    decomp.conversationHistory.totalTokens
            )
            expect(decomp.freeTokens).toBe(100000 - decomp.totalTokens)
        })
    })
})
