import { describe, it, expect } from 'bun:test'

import { maskSecretValue } from '../../src/modules/secrets/secrets.utils'

describe('Secrets Utils - Unit Tests', () => {
    describe('maskSecretValue', () => {
        it('should return 4 asterisks for strings of length <= 4', () => {
            expect(maskSecretValue('')).toBe('****')
            expect(maskSecretValue('a')).toBe('****')
            expect(maskSecretValue('ab')).toBe('****')
            expect(maskSecretValue('abc')).toBe('****')
            expect(maskSecretValue('abcd')).toBe('****')
        })

        it('should reveal first 2 and last 2 characters with 4 asterisks in middle for strings > 4 chars', () => {
            expect(maskSecretValue('abcde')).toBe('ab****de')
            expect(maskSecretValue('12345678')).toBe('12****78')
            expect(maskSecretValue('sk-proj-super-secret-key-12345')).toBe('sk****45')
        })
    })
})
