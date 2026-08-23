import { describe, it, expect } from 'bun:test'

import {
    uploadRepoSchema,
    importIdParamSchema,
} from '../../src/modules/platform/import/import.schema'

describe('Import Schema - Unit Tests', () => {
    describe('uploadRepoSchema', () => {
        it('should pass with valid repoURL', () => {
            const valid = { repoURL: 'https://github.com/phasehumans/december' }
            expect(uploadRepoSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail if repoURL is empty or missing or too long', () => {
            expect(uploadRepoSchema.safeParse({ repoURL: '' }).success).toBe(false)
            expect(uploadRepoSchema.safeParse({}).success).toBe(false)
            expect(uploadRepoSchema.safeParse({ repoURL: 'a'.repeat(501) }).success).toBe(false)
        })
    })

    describe('importIdParamSchema', () => {
        it('should pass with valid UUID import ID', () => {
            expect(
                importIdParamSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' })
                    .success
            ).toBe(true)
        })

        it('should fail with invalid UUID import ID', () => {
            expect(importIdParamSchema.safeParse({ id: 'invalid-id' }).success).toBe(false)
        })
    })
})
