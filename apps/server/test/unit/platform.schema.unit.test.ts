import { describe, it, expect } from 'bun:test'

import {
    syncEnvVarsSchema,
    createGithubRepoSchema,
    syncGithubRepoSchema,
    sessionIdParamSchema,
    deploymentIdParamSchema,
} from '../../src/modules/platform/platform.schema'

describe('Platform Schema - Unit Tests', () => {
    describe('syncEnvVarsSchema', () => {
        it('should pass with optional string array of keys', () => {
            const valid = { keys: ['DATABASE_URL', 'API_KEY'] }
            expect(syncEnvVarsSchema.safeParse(valid).success).toBe(true)
            expect(syncEnvVarsSchema.safeParse({}).success).toBe(true)
        })

        it('should fail if keys is not an array of strings', () => {
            expect(syncEnvVarsSchema.safeParse({ keys: [123] }).success).toBe(false)
        })
    })

    describe('createGithubRepoSchema', () => {
        it('should pass with valid repository name and default private to true', () => {
            const res = createGithubRepoSchema.safeParse({
                name: 'my-awesome-app_v1.0',
            })
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.name).toBe('my-awesome-app_v1.0')
                expect(res.data.private).toBe(true)
            }
        })

        it('should fail with invalid characters in name or empty name', () => {
            expect(createGithubRepoSchema.safeParse({ name: 'my app with spaces' }).success).toBe(
                false
            )
            expect(createGithubRepoSchema.safeParse({ name: '' }).success).toBe(false)
            expect(createGithubRepoSchema.safeParse({}).success).toBe(false)
        })
    })

    describe('syncGithubRepoSchema', () => {
        it('should pass with optional commitMessage', () => {
            expect(syncGithubRepoSchema.safeParse({ commitMessage: 'fix: typo' }).success).toBe(
                true
            )
            expect(syncGithubRepoSchema.safeParse({}).success).toBe(true)
        })

        it('should fail if commitMessage is empty string', () => {
            expect(syncGithubRepoSchema.safeParse({ commitMessage: '' }).success).toBe(false)
        })
    })

    describe('sessionIdParamSchema & deploymentIdParamSchema', () => {
        it('should pass with non-empty string IDs', () => {
            expect(sessionIdParamSchema.safeParse({ sessionId: 'session-123' }).success).toBe(true)
            expect(deploymentIdParamSchema.safeParse({ deploymentId: 'dpl_abc123' }).success).toBe(
                true
            )
        })

        it('should fail with empty string IDs', () => {
            expect(sessionIdParamSchema.safeParse({ sessionId: '' }).success).toBe(false)
            expect(deploymentIdParamSchema.safeParse({ deploymentId: '' }).success).toBe(false)
        })
    })
})
