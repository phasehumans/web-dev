import { describe, test, expect } from 'bun:test'

import { getAdaptiveThinkingLevel } from '../../src/agent-loop'
import { trimToolSchema } from '../../src/utils/schema-trimmer'

describe('Performance & Schema Trimming (Unit)', () => {
    test('trimToolSchema strips markdown and non-essential schema properties', () => {
        const schema = {
            type: 'object',
            properties: {
                filePath: {
                    type: 'string',
                    description: 'The **absolute** path to `target` file.',
                    examples: ['/foo/bar.txt'],
                    $comment: 'Must exist',
                },
            },
        }

        const trimmed = trimToolSchema(schema)
        expect(trimmed.properties.filePath.description).toBe('The absolute path to target file.')
        expect(trimmed.properties.filePath.examples).toBeUndefined()
        expect(trimmed.properties.filePath.$comment).toBeUndefined()
    })

    test('getAdaptiveThinkingLevel routes task complexity to 4 distinct tiers', () => {
        // Tier 1: Off
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: '/login' }])).toBe('off')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: 'hi' }])).toBe('off')
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: 'hello' }])).toBe('off')

        // Tier 2: Minimal for simple lookups
        expect(getAdaptiveThinkingLevel([{ role: 'user', content: 'read package.json' }])).toBe(
            'minimal'
        )
        expect(
            getAdaptiveThinkingLevel([{ role: 'user', content: 'find function main in index.ts' }])
        ).toBe('minimal')

        // Tier 3: Auto (default for code edits)
        expect(
            getAdaptiveThinkingLevel([
                { role: 'user', content: 'Add a new utility function to file' },
            ])
        ).toBe('auto')

        // Tier 4: High for refactoring/debugging/multi-file prompts
        expect(
            getAdaptiveThinkingLevel([
                { role: 'user', content: 'refactor the module architecture and fix broken tests' },
            ])
        ).toBe('high')
    })
})
