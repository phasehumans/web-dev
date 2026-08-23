import { describe, it, expect } from 'bun:test'

import {
    createPullRequestReviewSchema,
    getReviewsQuerySchema,
    updateReviewPreferencesSchema,
} from '../../src/modules/review/review.schema'

describe('Review Schema - Unit Tests', () => {
    describe('createPullRequestReviewSchema', () => {
        it('should pass with valid prUrl and optional sessionId', () => {
            const valid = {
                prUrl: 'https://github.com/phasehumans/december/pull/42',
                sessionId: '123e4567-e89b-12d3-a456-426614174000',
                preferences: { strictness: 'STRICT' },
            }
            const res = createPullRequestReviewSchema.safeParse(valid)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.prUrl).toBe('https://github.com/phasehumans/december/pull/42')
            }
        })

        it('should fail if prUrl is not a valid URL or is missing', () => {
            expect(
                createPullRequestReviewSchema.safeParse({ prUrl: 'not-a-valid-url' }).success
            ).toBe(false)
            expect(createPullRequestReviewSchema.safeParse({}).success).toBe(false)
        })
    })

    describe('getReviewsQuerySchema', () => {
        it('should pass with default page 1 and limit 20 when omitted', () => {
            const res = getReviewsQuerySchema.safeParse({})
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.page).toBe(1)
                expect(res.data.limit).toBe(20)
            }
        })

        it('should coerce string numbers for page and limit', () => {
            const res = getReviewsQuerySchema.safeParse({ page: '3', limit: '50' })
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.page).toBe(3)
                expect(res.data.limit).toBe(50)
            }
        })

        it('should fail if limit exceeds 100 or is negative', () => {
            expect(getReviewsQuerySchema.safeParse({ limit: '150' }).success).toBe(false)
            expect(getReviewsQuerySchema.safeParse({ page: '0' }).success).toBe(false)
        })
    })

    describe('updateReviewPreferencesSchema', () => {
        it('should pass with valid preferences', () => {
            const valid = {
                autoReviewAgentPrs: true,
                defaultStrictness: 'STRICT',
                focusAreas: ['SECURITY', 'PERFORMANCE'],
            }
            const res = updateReviewPreferencesSchema.safeParse(valid)
            expect(res.success).toBe(true)
        })

        it('should fail with invalid strictness enum', () => {
            const invalid = {
                defaultStrictness: 'SUPER_STRICT',
            }
            expect(updateReviewPreferencesSchema.safeParse(invalid).success).toBe(false)
        })
    })
})
