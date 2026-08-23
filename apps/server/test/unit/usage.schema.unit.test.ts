import { describe, it, expect } from 'bun:test'

import { usageCheckQuerySchema, recordUsageEventSchema } from '../../src/modules/usage/usage.schema'

describe('Usage Schema - Unit Tests', () => {
    describe('usageCheckQuerySchema', () => {
        it('should pass with optional estimatedCostInCents coerced from string', () => {
            const res = usageCheckQuerySchema.safeParse({ estimatedCostInCents: '25' })
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.estimatedCostInCents).toBe(25)
            }
        })

        it('should pass with empty query object', () => {
            const res = usageCheckQuerySchema.safeParse({})
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.estimatedCostInCents).toBeUndefined()
            }
        })

        it('should fail if estimatedCostInCents is negative', () => {
            const res = usageCheckQuerySchema.safeParse({ estimatedCostInCents: '-5' })
            expect(res.success).toBe(false)
        })
    })

    describe('recordUsageEventSchema', () => {
        it('should pass and compute totalTokens when totalTokens is omitted', () => {
            const valid = {
                model: 'openai/gpt-4o',
                inputTokens: 100,
                outputTokens: 50,
            }
            const res = recordUsageEventSchema.safeParse(valid)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.totalTokens).toBe(150)
                expect(res.data.costInCents).toBe(0)
            }
        })

        it('should preserve explicit totalTokens if provided', () => {
            const valid = {
                model: 'gemini-2.5-pro',
                inputTokens: 100,
                outputTokens: 50,
                totalTokens: 200,
                costInCents: 5,
            }
            const res = recordUsageEventSchema.safeParse(valid)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.totalTokens).toBe(200)
                expect(res.data.costInCents).toBe(5)
            }
        })

        it('should fail with empty model or negative token counts', () => {
            expect(
                recordUsageEventSchema.safeParse({
                    model: '',
                    inputTokens: 10,
                    outputTokens: 10,
                }).success
            ).toBe(false)

            expect(
                recordUsageEventSchema.safeParse({
                    model: 'gpt-4',
                    inputTokens: -1,
                    outputTokens: 10,
                }).success
            ).toBe(false)
        })
    })
})
