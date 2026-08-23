import { describe, it, expect } from 'bun:test'

import {
    CreateSecretSchema,
    BulkCreateSecretsSchema,
} from '../../src/modules/secrets/secrets.schema'

describe('Secrets Schema - Unit Tests', () => {
    describe('CreateSecretSchema', () => {
        it('should pass with valid name, value, and optional note', () => {
            const valid = {
                name: 'STRIPE_API_KEY',
                value: 'sk_test_12345',
                note: 'Stripe test key',
            }
            const res = CreateSecretSchema.safeParse(valid)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.name).toBe('STRIPE_API_KEY')
                expect(res.data.value).toBe('sk_test_12345')
                expect(res.data.note).toBe('Stripe test key')
            }
        })

        it('should pass with valid name and value when note is omitted', () => {
            const valid = {
                name: 'GITHUB_TOKEN',
                value: 'ghp_abc123',
            }
            const res = CreateSecretSchema.safeParse(valid)
            expect(res.success).toBe(true)
        })

        it('should fail if name is empty string or missing', () => {
            const emptyName = { name: '', value: 'secret-val' }
            expect(CreateSecretSchema.safeParse(emptyName).success).toBe(false)

            const missingName = { value: 'secret-val' }
            expect(CreateSecretSchema.safeParse(missingName).success).toBe(false)
        })

        it('should fail if value is empty string or missing', () => {
            const emptyValue = { name: 'KEY', value: '' }
            expect(CreateSecretSchema.safeParse(emptyValue).success).toBe(false)

            const missingValue = { name: 'KEY' }
            expect(CreateSecretSchema.safeParse(missingValue).success).toBe(false)
        })
    })

    describe('BulkCreateSecretsSchema', () => {
        it('should pass with array of valid secrets', () => {
            const valid = {
                secrets: [
                    { name: 'KEY_ONE', value: 'val1', note: 'First key' },
                    { name: 'KEY_TWO', value: 'val2' },
                ],
            }
            const res = BulkCreateSecretsSchema.safeParse(valid)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.secrets.length).toBe(2)
            }
        })

        it('should fail if secrets array is empty', () => {
            const empty = { secrets: [] }
            const res = BulkCreateSecretsSchema.safeParse(empty)
            expect(res.success).toBe(false)
        })

        it('should fail if any item in secrets array is invalid', () => {
            const invalidItem = {
                secrets: [
                    { name: 'VALID_KEY', value: 'val1' },
                    { name: '', value: 'val2' },
                ],
            }
            const res = BulkCreateSecretsSchema.safeParse(invalidItem)
            expect(res.success).toBe(false)
        })
    })
})
