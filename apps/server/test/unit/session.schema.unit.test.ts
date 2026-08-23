import { describe, it, expect } from 'bun:test'

import {
    getSessionsSchema,
    createSessionSchema,
    getSessionByIdSchema,
    renameSessionParamsSchema,
    renameSessionBodySchema,
    archiveSessionParamsSchema,
    unarchiveSessionParamsSchema,
    updateSessionTagsParamsSchema,
    updateSessionTagsBodySchema,
    getSessionInsightsParamsSchema,
    deleteSessionParamsSchema,
    getCollaboratorsParamsSchema,
    addCollaboratorParamsSchema,
    addCollaboratorBodySchema,
    removeCollaboratorParamsSchema,
    disconnectSessionParamsSchema,
    rehydrateSessionParamsSchema,
    proxyPreviewParamsSchema,
} from '../../src/modules/session/session.schema'

describe('Session Schemas - Unit Tests', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'

    describe('getSessionsSchema', () => {
        it('should pass with empty query', () => {
            const result = getSessionsSchema.parse({})
            expect(result).toEqual({})
        })

        it('should coerce and validate query filters', () => {
            const result = getSessionsSchema.parse({
                type: 'WEB',
                isArchived: 'true',
                tags: 'frontend,react',
                sortBy: 'createdAt',
                sortOrder: 'desc',
                search: 'test chat',
                page: '2',
                limit: '25',
            })
            expect(result.type).toBe('WEB')
            expect(result.isArchived).toBe(true)
            expect(result.tags).toBe('frontend,react')
            expect(result.sortBy).toBe('createdAt')
            expect(result.sortOrder).toBe('desc')
            expect(result.search).toBe('test chat')
            expect(result.page).toBe(2)
            expect(result.limit).toBe(25)
        })

        it('should parse isArchived=false correctly', () => {
            const result = getSessionsSchema.parse({ isArchived: 'false' })
            expect(result.isArchived).toBe(false)
        })

        it('should fail with invalid session type', () => {
            expect(() => getSessionsSchema.parse({ type: 'INVALID' })).toThrow()
        })

        it('should fail with invalid page or limit', () => {
            expect(() => getSessionsSchema.parse({ page: 0 })).toThrow()
            expect(() => getSessionsSchema.parse({ limit: 101 })).toThrow()
        })
    })

    describe('createSessionSchema', () => {
        it('should pass with valid optional fields', () => {
            const result = createSessionSchema.parse({
                title: 'My Project Session',
                projectId: validUuid,
                type: 'WEB',
                prompt: 'Build a landing page',
            })
            expect(result.title).toBe('My Project Session')
            expect(result.projectId).toBe(validUuid)
            expect(result.type).toBe('WEB')
            expect(result.prompt).toBe('Build a landing page')
        })

        it('should pass with empty payload', () => {
            const result = createSessionSchema.parse({})
            expect(result).toEqual({})
        })

        it('should fail with title exceeding 100 characters', () => {
            expect(() => createSessionSchema.parse({ title: 'a'.repeat(101) })).toThrow()
        })

        it('should fail with invalid projectId UUID', () => {
            expect(() => createSessionSchema.parse({ projectId: 'not-a-uuid' })).toThrow()
        })

        it('should fail with empty prompt string', () => {
            expect(() => createSessionSchema.parse({ prompt: '' })).toThrow()
        })
    })

    describe('UUID Params Schemas', () => {
        const schemas = [
            { name: 'getSessionByIdSchema', schema: getSessionByIdSchema },
            { name: 'renameSessionParamsSchema', schema: renameSessionParamsSchema },
            { name: 'archiveSessionParamsSchema', schema: archiveSessionParamsSchema },
            { name: 'unarchiveSessionParamsSchema', schema: unarchiveSessionParamsSchema },
            { name: 'updateSessionTagsParamsSchema', schema: updateSessionTagsParamsSchema },
            { name: 'getSessionInsightsParamsSchema', schema: getSessionInsightsParamsSchema },
            { name: 'deleteSessionParamsSchema', schema: deleteSessionParamsSchema },
            { name: 'getCollaboratorsParamsSchema', schema: getCollaboratorsParamsSchema },
            { name: 'addCollaboratorParamsSchema', schema: addCollaboratorParamsSchema },
            { name: 'disconnectSessionParamsSchema', schema: disconnectSessionParamsSchema },
            { name: 'rehydrateSessionParamsSchema', schema: rehydrateSessionParamsSchema },
        ]

        for (const { name, schema } of schemas) {
            it(`${name} - should pass with valid UUID`, () => {
                const result = schema.parse({ id: validUuid })
                expect(result.id).toBe(validUuid)
            })

            it(`${name} - should fail with invalid UUID`, () => {
                expect(() => schema.parse({ id: 'invalid-id' })).toThrow()
            })
        }
    })

    describe('renameSessionBodySchema', () => {
        it('should pass with valid title', () => {
            const result = renameSessionBodySchema.parse({ title: 'Updated Title' })
            expect(result.title).toBe('Updated Title')
        })

        it('should fail with empty title', () => {
            expect(() => renameSessionBodySchema.parse({ title: '' })).toThrow()
        })

        it('should fail with title exceeding 100 chars', () => {
            expect(() => renameSessionBodySchema.parse({ title: 'a'.repeat(101) })).toThrow()
        })
    })

    describe('updateSessionTagsBodySchema', () => {
        it('should pass with empty array or single tag', () => {
            expect(updateSessionTagsBodySchema.parse({ tags: [] })).toEqual({ tags: [] })
            expect(updateSessionTagsBodySchema.parse({ tags: ['backend'] })).toEqual({
                tags: ['backend'],
            })
        })

        it('should fail if more than 1 tag is provided', () => {
            expect(() => updateSessionTagsBodySchema.parse({ tags: ['tag1', 'tag2'] })).toThrow(
                'Only one tag is allowed per session'
            )
        })

        it('should fail if tag exceeds 30 characters', () => {
            expect(() => updateSessionTagsBodySchema.parse({ tags: ['a'.repeat(31)] })).toThrow()
        })
    })

    describe('addCollaboratorBodySchema & removeCollaboratorParamsSchema', () => {
        it('addCollaboratorBodySchema passes with valid email', () => {
            const result = addCollaboratorBodySchema.parse({ email: 'user@example.com' })
            expect(result.email).toBe('user@example.com')
        })

        it('addCollaboratorBodySchema fails with invalid email', () => {
            expect(() => addCollaboratorBodySchema.parse({ email: 'not-an-email' })).toThrow()
        })

        it('removeCollaboratorParamsSchema passes with valid ID and email', () => {
            const result = removeCollaboratorParamsSchema.parse({
                id: validUuid,
                email: 'user@example.com',
            })
            expect(result.id).toBe(validUuid)
            expect(result.email).toBe('user@example.com')
        })

        it('removeCollaboratorParamsSchema fails with invalid email or UUID', () => {
            expect(() =>
                removeCollaboratorParamsSchema.parse({ id: validUuid, email: 'bad-email' })
            ).toThrow()
            expect(() =>
                removeCollaboratorParamsSchema.parse({
                    id: 'bad-uuid',
                    email: 'user@example.com',
                })
            ).toThrow()
        })
    })

    describe('proxyPreviewParamsSchema', () => {
        it('should pass and coerce valid port number', () => {
            const result = proxyPreviewParamsSchema.parse({ id: validUuid, port: '3000' })
            expect(result.id).toBe(validUuid)
            expect(result.port).toBe(3000)
        })

        it('should fail if port is out of range', () => {
            expect(() => proxyPreviewParamsSchema.parse({ id: validUuid, port: '0' })).toThrow()
            expect(() => proxyPreviewParamsSchema.parse({ id: validUuid, port: '65536' })).toThrow()
        })
    })
})
