import { describe, it, expect } from 'bun:test'

import {
    connectVercelQuerySchema,
    connectOAuthQuerySchema,
} from '../../src/modules/integration/integration.schema'

describe('Integration Schema - Unit Tests', () => {
    describe('connectVercelQuerySchema', () => {
        it('should pass with valid code and state, and optional teamId and configurationId', () => {
            const valid = {
                code: 'vercel-auth-code-123',
                state: 'user-id-abc',
                teamId: 'team_xyz',
                configurationId: 'config_123',
            }
            const res = connectVercelQuerySchema.safeParse(valid)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.code).toBe('vercel-auth-code-123')
                expect(res.data.state).toBe('user-id-abc')
                expect(res.data.teamId).toBe('team_xyz')
                expect(res.data.configurationId).toBe('config_123')
            }
        })

        it('should pass when optional teamId and configurationId are omitted', () => {
            const valid = {
                code: 'auth-code',
                state: 'user-1',
            }
            expect(connectVercelQuerySchema.safeParse(valid).success).toBe(true)
        })

        it('should fail if code or state is empty or missing', () => {
            expect(connectVercelQuerySchema.safeParse({ code: '', state: 'state' }).success).toBe(
                false
            )
            expect(connectVercelQuerySchema.safeParse({ code: 'code', state: '' }).success).toBe(
                false
            )
            expect(connectVercelQuerySchema.safeParse({ code: 'code' }).success).toBe(false)
            expect(connectVercelQuerySchema.safeParse({ state: 'state' }).success).toBe(false)
        })
    })

    describe('connectOAuthQuerySchema', () => {
        it('should pass with valid code and state', () => {
            const valid = {
                code: 'oauth-code-456',
                state: 'user-id-123',
            }
            expect(connectOAuthQuerySchema.safeParse(valid).success).toBe(true)
        })

        it('should fail if code or state is missing or empty', () => {
            expect(connectOAuthQuerySchema.safeParse({ code: '', state: 'user-1' }).success).toBe(
                false
            )
            expect(connectOAuthQuerySchema.safeParse({ code: 'code', state: '' }).success).toBe(
                false
            )
            expect(connectOAuthQuerySchema.safeParse({}).success).toBe(false)
        })
    })
})
