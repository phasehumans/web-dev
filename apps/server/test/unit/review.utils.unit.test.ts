import { describe, it, expect } from 'bun:test'

import { parsePrUrl } from '../../src/modules/review/review.utils'

describe('Review Utils - Unit Tests', () => {
    describe('parsePrUrl', () => {
        it('should parse GitHub pull request URLs correctly', () => {
            const result = parsePrUrl('https://github.com/phasehumans/december/pull/123')
            expect(result.repository).toBe('phasehumans/december')
            expect(result.prNumber).toBe(123)
            expect(result.provider).toBe('GITHUB')
        })

        it('should parse GitLab merge request URLs correctly', () => {
            const result = parsePrUrl('https://gitlab.com/group/project/merge_requests/456')
            expect(result.repository).toBe('group/project')
            expect(result.prNumber).toBe(456)
            expect(result.provider).toBe('GITLAB')
        })

        it('should return null repository and prNumber for non-PR URLs', () => {
            const result = parsePrUrl('https://github.com/phasehumans/december')
            expect(result.repository).toBeNull()
            expect(result.prNumber).toBeNull()
            expect(result.provider).toBe('GITHUB')
        })
    })
})
