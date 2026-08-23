import { describe, it, expect } from 'bun:test'

import {
    startPreviewSchema,
    previewIdParamSchema,
    runtimeStatusCallbackSchema,
} from '../../src/modules/runtime/runtime.schema'

describe('Runtime Schema - Unit Tests', () => {
    describe('startPreviewSchema', () => {
        it('should pass with valid UUID projectId and optional versionId', () => {
            const valid = {
                projectId: '123e4567-e89b-12d3-a456-426614174000',
                versionId: '123e4567-e89b-12d3-a456-426614174001',
            }
            const res = startPreviewSchema.safeParse(valid)
            expect(res.success).toBe(true)
        })

        it('should fail if projectId is not a valid UUID', () => {
            expect(startPreviewSchema.safeParse({ projectId: 'invalid-id' }).success).toBe(false)
        })
    })

    describe('previewIdParamSchema', () => {
        it('should pass with valid UUID parameter', () => {
            expect(
                previewIdParamSchema.safeParse({
                    id: '123e4567-e89b-12d3-a456-426614174000',
                }).success
            ).toBe(true)
        })

        it('should fail with non-UUID id param', () => {
            expect(previewIdParamSchema.safeParse({ id: '123' }).success).toBe(false)
        })
    })

    describe('runtimeStatusCallbackSchema', () => {
        it('should pass with valid callback payload', () => {
            const valid = {
                previewId: '123e4567-e89b-12d3-a456-426614174000',
                projectId: '123e4567-e89b-12d3-a456-426614174001',
                status: 'ready',
                state: 'Healthy',
                previewUrl: 'https://preview.example.com',
                updatedAt: new Date().toISOString(),
            }
            const res = runtimeStatusCallbackSchema.safeParse(valid)
            expect(res.success).toBe(true)
        })

        it('should fail with invalid state or status values', () => {
            const invalid = {
                previewId: '123e4567-e89b-12d3-a456-426614174000',
                projectId: '123e4567-e89b-12d3-a456-426614174001',
                status: 'invalid-status',
                state: 'InvalidState',
                updatedAt: new Date().toISOString(),
            }
            const res = runtimeStatusCallbackSchema.safeParse(invalid)
            expect(res.success).toBe(false)
        })
    })
})
