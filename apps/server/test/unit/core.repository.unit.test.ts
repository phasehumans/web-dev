import { prisma } from '@december/database'
import { describe, it, expect } from 'bun:test'

import { coreRepository } from '../../src/modules/core/core.repository'

describe('Core Repository - Unit Tests', () => {
    describe('findSessionById', () => {
        it('should call prisma.session.findFirst with sessionId and userId/collaborators query', async () => {
            const originalFindFirst = prisma.session.findFirst
            let capturedArgs: any = null

            prisma.session.findFirst = (async (args: any) => {
                capturedArgs = args
                return { id: 'sess-100', userId: 'user-1' } as any
            }) as any

            try {
                const result = await coreRepository.findSessionById({
                    sessionId: 'sess-100',
                    userId: 'user-1',
                })

                expect(result).not.toBeNull()
                expect(result?.id).toBe('sess-100')
                expect(capturedArgs).not.toBeNull()
                expect(capturedArgs.where.id).toBe('sess-100')
                expect(capturedArgs.where.OR).toEqual([
                    { userId: 'user-1' },
                    { collaborators: { some: { userId: 'user-1' } } },
                ])
            } finally {
                prisma.session.findFirst = originalFindFirst
            }
        })
    })

    describe('createSessionWithPrompt', () => {
        it('should create session with truncated prompt title (max 50 chars) and initial user message', async () => {
            const originalCreate = prisma.session.create
            let capturedArgs: any = null

            const longPrompt =
                'This is a very long prompt that exceeds 50 characters in total length to verify title truncation'
            const expectedTitle = longPrompt.slice(0, 50)

            prisma.session.create = (async (args: any) => {
                capturedArgs = args
                return {
                    id: 'new-sess-200',
                    userId: 'user-2',
                    title: expectedTitle,
                    projectId: 'proj-5',
                } as any
            }) as any

            try {
                const result = await coreRepository.createSessionWithPrompt({
                    userId: 'user-2',
                    prompt: longPrompt,
                    projectId: 'proj-5',
                })

                expect(result.id).toBe('new-sess-200')
                expect(result.title).toBe(expectedTitle)
                expect(capturedArgs).not.toBeNull()
                expect(capturedArgs.data.userId).toBe('user-2')
                expect(capturedArgs.data.projectId).toBe('proj-5')
                expect(capturedArgs.data.title).toBe(expectedTitle)
                expect(capturedArgs.data.type).toBe('WEB')
                expect(capturedArgs.data.messages.create).toEqual({
                    role: 'USER',
                    content: longPrompt,
                    sequence: 1,
                })
            } finally {
                prisma.session.create = originalCreate
            }
        })
    })
})
