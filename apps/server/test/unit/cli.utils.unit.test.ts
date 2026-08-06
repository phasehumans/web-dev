import { describe, it, expect } from 'bun:test'

import { generateCliSessionName } from '../../src/modules/cli/cli.utils'

describe('CLI Utils - Unit Tests', () => {
    it('generateCliSessionName should return string prefixed with cli-session-', () => {
        const name = generateCliSessionName()
        expect(name).toBeDefined()
        expect(typeof name).toBe('string')
        expect(name.startsWith('cli-session-')).toBe(true)
    })
})
