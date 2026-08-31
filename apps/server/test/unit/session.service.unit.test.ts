import { prisma } from '@december/database'
import { describe, it, expect, mock, afterEach } from 'bun:test'

import { sessionRepository } from '../../src/modules/session/session.repository'
import { sessionService } from '../../src/modules/session/session.service'
import { usageService } from '../../src/modules/usage/usage.service'
import { AppError } from '../../src/shared/appError'

describe('Session Service - Unit Tests', () => {
    const testUserId = '11111111-1111-1111-1111-111111111111'
    const otherUserId = '22222222-2222-2222-2222-222222222222'
    const testSessionId = '33333333-3333-3333-3333-333333333333'
    const testProjectId = '44444444-4444-4444-4444-444444444444'

    const originalFindSessionById = sessionRepository.findSessionById
    const originalCreateSession = sessionRepository.createSession
    const originalUpdateSession = sessionRepository.updateSession
    const originalFindManySessions = sessionRepository.findManySessions
    const originalFindSessionOwner = sessionRepository.findSessionOwner
    const originalFindSessionCollaborator = sessionRepository.findSessionCollaborator
    const originalAddCollaborator = sessionRepository.addCollaborator
    const originalRemoveCollaborator = sessionRepository.removeCollaborator
    const originalFindSessionInsights = sessionRepository.findSessionInsights
    const originalCountPrismaSession = prisma.session.count
    const originalCreatePrismaMessage = prisma.message.create
    const originalBalance = usageService.hasMinimumBalance

    afterEach(() => {
        sessionRepository.findSessionById = originalFindSessionById
        sessionRepository.createSession = originalCreateSession
        sessionRepository.updateSession = originalUpdateSession
        sessionRepository.findManySessions = originalFindManySessions
        sessionRepository.findSessionOwner = originalFindSessionOwner
        sessionRepository.findSessionCollaborator = originalFindSessionCollaborator
        sessionRepository.addCollaborator = originalAddCollaborator
        sessionRepository.removeCollaborator = originalRemoveCollaborator
        sessionRepository.findSessionInsights = originalFindSessionInsights
        prisma.session.count = originalCountPrismaSession
        prisma.message.create = originalCreatePrismaMessage
        usageService.hasMinimumBalance = originalBalance
    })

    describe('createSession', () => {
        it('should throw AppError 402 if user has insufficient balance (< $0.50)', async () => {
            const originalBalance = usageService.hasMinimumBalance
            usageService.hasMinimumBalance = mock(async () => false) as any

            try {
                await expect(
                    sessionService.createSession({
                        userId: testUserId,
                        title: 'Test Session',
                    })
                ).rejects.toThrow(
                    new AppError(
                        'Insufficient balance. A minimum balance of $0.50 is required to start a session.',
                        402
                    )
                )
            } finally {
                usageService.hasMinimumBalance = originalBalance
            }
        })

        it('should throw AppError 409 if active session is already running', async () => {
            const originalBalance = usageService.hasMinimumBalance
            const originalCount = prisma.session.count
            usageService.hasMinimumBalance = mock(async () => true) as any
            prisma.session.count = mock(async () => 1) as any

            try {
                await expect(
                    sessionService.createSession({
                        userId: testUserId,
                        title: 'Test Session',
                    })
                ).rejects.toThrow(new AppError('An active session is already running', 409))
            } finally {
                usageService.hasMinimumBalance = originalBalance
                prisma.session.count = originalCount
            }
        })

        it('should create standalone session successfully', async () => {
            const originalBalance = usageService.hasMinimumBalance
            const originalCount = prisma.session.count
            const originalCreateSession = sessionRepository.createSession
            usageService.hasMinimumBalance = mock(async () => true) as any
            prisma.session.count = mock(async () => 0) as any
            sessionRepository.createSession = mock(async () => ({
                id: 'sess-123',
                userId: testUserId,
                title: 'Test Session',
                type: 'WEB',
                vmStatus: 'STOPPED',
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any

            try {
                const res = await sessionService.createSession({
                    userId: testUserId,
                    title: 'Test Session',
                })
                expect(res.id).toBe('sess-123')
            } finally {
                usageService.hasMinimumBalance = originalBalance
                prisma.session.count = originalCount
                sessionRepository.createSession = originalCreateSession
            }
        })

        it('should create session and initial message if prompt is provided', async () => {
            const originalBalance = usageService.hasMinimumBalance
            const originalCount = prisma.session.count
            const originalCreateSession = sessionRepository.createSession
            const originalCreateMessage = prisma.message.create

            usageService.hasMinimumBalance = mock(async () => true) as any
            prisma.session.count = mock(async () => 0) as any
            sessionRepository.createSession = mock(async (data: any) => ({
                id: testSessionId,
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
            let createdMessageData: any = null
            prisma.message.create = mock(async ({ data }: any) => {
                createdMessageData = data
                return { id: 'msg-1', ...data }
            }) as any

            try {
                const session = await sessionService.createSession({
                    userId: testUserId,
                    title: 'New Chat Session',
                    prompt: 'Initial prompt message',
                })

                expect(session.id).toBe(testSessionId)
                expect(session.title).toBe('New Chat Session')
                expect(createdMessageData).not.toBeNull()
                expect(createdMessageData.content).toBe('Initial prompt message')
                expect(createdMessageData.role).toBe('USER')
            } finally {
                usageService.hasMinimumBalance = originalBalance
                prisma.session.count = originalCount
                sessionRepository.createSession = originalCreateSession
                prisma.message.create = originalCreateMessage
            }
        })
    })

    describe('getUserSessions', () => {
        it('should list sessions and format PR, author, and fallback titles correctly', async () => {
            const originalFindMany = sessionRepository.findManySessions
            sessionRepository.findManySessions = mock(async () => ({
                sessions: [
                    {
                        id: testSessionId,
                        title: 'Custom Title',
                        type: 'WEB',
                        isArchived: false,
                        tags: ['ai'],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        projectId: testProjectId,
                        project: { id: testProjectId, name: 'Project 1' },
                        messages: [{ content: 'Hello AI' }],
                        user: {
                            username: 'testuser',
                            email: 'test@example.com',
                            name: 'Test User',
                        },
                        reviews: [
                            {
                                prUrl: 'https://github.com/repo/pull/42',
                                prTitle: 'PR 42 Title',
                                branchName: 'feature-branch',
                                additions: 100,
                                deletions: 20,
                                repoName: 'test-repo',
                            },
                        ],
                    },
                    {
                        id: 'sess-2',
                        title: null,
                        type: 'CLI',
                        isArchived: true,
                        tags: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        projectId: null,
                        project: null,
                        messages: [
                            {
                                content:
                                    'First message text that is quite long and needs truncation',
                            },
                        ],
                        user: { username: null, email: 'fallback@example.com', name: null },
                        reviews: [],
                    },
                ],
                pagination: { total: 2, page: 1, limit: 50, totalPages: 1 },
            })) as any

            try {
                const result = await sessionService.getUserSessions({ userId: testUserId })

                expect(result.sessions).toHaveLength(2)
                expect(result.sessions[0]?.title).toBe('Custom Title')
                expect(result.sessions[0]?.prNumber).toBe(42)
                expect(result.sessions[0]?.prState).toBe('open')
                expect(result.sessions[0]?.createdBy).toBe('@testuser')

                expect(result.sessions[1]?.title).toContain('First message text')
                expect(result.sessions[1]?.createdBy).toBe('@fallback')
                expect(result.sessions[1]?.createdByName).toBe('fallback@example.com')
            } finally {
                sessionRepository.findManySessions = originalFindMany
            }
        })
    })

    describe('getSession', () => {
        it('should throw AppError 404 if session not found', async () => {
            const originalFind = sessionRepository.findSessionById
            sessionRepository.findSessionById = mock(async (sessionId: string, userId: string) => {
                if (sessionId === 'nonexistent') return null
                return originalFind(sessionId, userId)
            }) as any

            try {
                await expect(
                    sessionService.getSession({ userId: testUserId, sessionId: 'nonexistent' })
                ).rejects.toThrow(new AppError('Session not found', 404))
            } finally {
                sessionRepository.findSessionById = originalFind
            }
        })

        it('should return session with formatted chatMessages', async () => {
            const uniqueSessionId = `unit-test-session-${Date.now()}`
            const originalFind = sessionRepository.findSessionById
            sessionRepository.findSessionById = mock(async (sessionId: string, userId: string) => {
                if (sessionId === uniqueSessionId) {
                    return {
                        id: uniqueSessionId,
                        userId: testUserId,
                        title: 'Existing Session',
                        messages: [
                            {
                                id: 'msg-1',
                                role: 'USER',
                                content: 'test',
                                status: 'done',
                                sequence: 1,
                                blocks: { foo: 'bar' },
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        ],
                    }
                }
                return originalFind(sessionId, userId)
            }) as any

            try {
                const result = await sessionService.getSession({
                    userId: testUserId,
                    sessionId: uniqueSessionId,
                })

                expect(result.session.id).toBe(uniqueSessionId)
                expect(result.chatMessages).toHaveLength(1)
                expect(result.chatMessages[0]?.blocks).toEqual({ foo: 'bar' })
            } finally {
                sessionRepository.findSessionById = originalFind
            }
        })
    })

    describe('renameSession, archiveSession, unarchiveSession, updateSessionTags', () => {
        it('renameSession throws 404 if session not found', async () => {
            const originalFind = sessionRepository.findSessionById
            sessionRepository.findSessionById = mock(async () => null) as any

            try {
                await expect(
                    sessionService.renameSession({
                        userId: testUserId,
                        sessionId: testSessionId,
                        title: 'New Title',
                    })
                ).rejects.toThrow(new AppError('Session not found', 404))
            } finally {
                sessionRepository.findSessionById = originalFind
            }
        })

        it('renameSession updates title when session is found', async () => {
            const originalFind = sessionRepository.findSessionById
            const originalUpdate = sessionRepository.updateSession
            sessionRepository.findSessionById = mock(async () => ({
                id: testSessionId,
                userId: testUserId,
            })) as any
            sessionRepository.updateSession = mock(async (id, uId, data: any) => ({
                id,
                ...data,
            })) as any

            try {
                const updated = await sessionService.renameSession({
                    userId: testUserId,
                    sessionId: testSessionId,
                    title: 'New Title',
                })
                expect(updated.title).toBe('New Title')
            } finally {
                sessionRepository.findSessionById = originalFind
                sessionRepository.updateSession = originalUpdate
            }
        })

        it('archiveSession and unarchiveSession throw 404 when session not found', async () => {
            const originalFind = sessionRepository.findSessionById
            sessionRepository.findSessionById = mock(async () => null) as any

            try {
                await expect(
                    sessionService.archiveSession({ userId: testUserId, sessionId: testSessionId })
                ).rejects.toThrow(new AppError('Session not found', 404))
                await expect(
                    sessionService.unarchiveSession({
                        userId: testUserId,
                        sessionId: testSessionId,
                    })
                ).rejects.toThrow(new AppError('Session not found', 404))
            } finally {
                sessionRepository.findSessionById = originalFind
            }
        })

        it('updateSessionTags limits tags to at most 1 tag', async () => {
            const originalFind = sessionRepository.findSessionById
            const originalUpdate = sessionRepository.updateSession
            sessionRepository.findSessionById = mock(async () => ({
                id: testSessionId,
                userId: testUserId,
            })) as any
            let savedTags: string[] = []
            sessionRepository.updateSession = mock(async (id, uId, data: any) => {
                savedTags = data.tags
                return { id, ...data }
            }) as any

            try {
                await sessionService.updateSessionTags({
                    userId: testUserId,
                    sessionId: testSessionId,
                    tags: ['first-tag', 'second-tag'],
                })
                expect(savedTags).toEqual(['first-tag'])
            } finally {
                sessionRepository.findSessionById = originalFind
                sessionRepository.updateSession = originalUpdate
            }
        })
    })

    describe('deleteSession', () => {
        it('throws 404 if session does not exist', async () => {
            const originalFindOwner = sessionRepository.findSessionOwner
            sessionRepository.findSessionOwner = mock(async () => null) as any

            try {
                await expect(
                    sessionService.deleteSession({ userId: testUserId, sessionId: testSessionId })
                ).rejects.toThrow(new AppError('Session not found', 404))
            } finally {
                sessionRepository.findSessionOwner = originalFindOwner
            }
        })

        it('throws 403 if non-creator tries to delete session', async () => {
            const originalFindOwner = sessionRepository.findSessionOwner
            sessionRepository.findSessionOwner = mock(async () => ({
                id: testSessionId,
                userId: otherUserId,
            })) as any

            try {
                await expect(
                    sessionService.deleteSession({ userId: testUserId, sessionId: testSessionId })
                ).rejects.toThrow(
                    new AppError('Only the session creator can delete this session', 403)
                )
            } finally {
                sessionRepository.findSessionOwner = originalFindOwner
            }
        })

        it('deletes session successfully when called by owner', async () => {
            const originalFindOwner = sessionRepository.findSessionOwner
            const originalDelete = sessionRepository.deleteSession
            sessionRepository.findSessionOwner = mock(async () => ({
                id: testSessionId,
                userId: testUserId,
            })) as any
            sessionRepository.deleteSession = mock(async () => ({ id: testSessionId })) as any

            try {
                const result = await sessionService.deleteSession({
                    userId: testUserId,
                    sessionId: testSessionId,
                })
                expect(result.message).toBe('session deleted successfully')
            } finally {
                sessionRepository.findSessionOwner = originalFindOwner
                sessionRepository.deleteSession = originalDelete
            }
        })
    })

    describe('Collaborators', () => {
        it('getCollaborators throws 404 if session not found', async () => {
            const originalFind = sessionRepository.findSessionById
            sessionRepository.findSessionById = mock(async () => null) as any

            try {
                await expect(
                    sessionService.getCollaborators({
                        userId: testUserId,
                        sessionId: testSessionId,
                    })
                ).rejects.toThrow(new AppError('Session not found', 404))
            } finally {
                sessionRepository.findSessionById = originalFind
            }
        })

        it('addCollaborator throws 403 if caller is not the session creator', async () => {
            const originalFind = sessionRepository.findSessionById
            sessionRepository.findSessionById = mock(async () => ({
                id: testSessionId,
                userId: otherUserId, // owner is different
            })) as any

            try {
                await expect(
                    sessionService.addCollaborator({
                        userId: testUserId,
                        sessionId: testSessionId,
                        email: 'collab@example.com',
                    })
                ).rejects.toThrow(
                    new AppError('Only the session creator can add collaborators', 403)
                )
            } finally {
                sessionRepository.findSessionById = originalFind
            }
        })

        it('addCollaborator throws 404 if target user is not found', async () => {
            const originalFind = sessionRepository.findSessionById
            const originalFindUser = sessionRepository.findUserByEmailOrUsername
            sessionRepository.findSessionById = mock(async () => ({
                id: testSessionId,
                userId: testUserId,
            })) as any
            sessionRepository.findUserByEmailOrUsername = mock(async () => null) as any

            try {
                await expect(
                    sessionService.addCollaborator({
                        userId: testUserId,
                        sessionId: testSessionId,
                        email: 'unknown@example.com',
                    })
                ).rejects.toThrow(new AppError('User not found with provided email', 404))
            } finally {
                sessionRepository.findSessionById = originalFind
                sessionRepository.findUserByEmailOrUsername = originalFindUser
            }
        })

        it('addCollaborator throws 400 if adding self or session owner', async () => {
            const originalFind = sessionRepository.findSessionById
            const originalFindUser = sessionRepository.findUserByEmailOrUsername
            sessionRepository.findSessionById = mock(async () => ({
                id: testSessionId,
                userId: testUserId,
            })) as any
            sessionRepository.findUserByEmailOrUsername = mock(async () => ({
                id: testUserId,
                email: 'owner@example.com',
            })) as any

            try {
                await expect(
                    sessionService.addCollaborator({
                        userId: testUserId,
                        sessionId: testSessionId,
                        email: 'owner@example.com',
                    })
                ).rejects.toThrow(
                    new AppError('Cannot add yourself or session owner as collaborator', 400)
                )
            } finally {
                sessionRepository.findSessionById = originalFind
                sessionRepository.findUserByEmailOrUsername = originalFindUser
            }
        })

        it('addCollaborator throws 400 if user is already a collaborator', async () => {
            const originalFind = sessionRepository.findSessionById
            const originalFindUser = sessionRepository.findUserByEmailOrUsername
            const originalFindCollab = sessionRepository.findCollaborator
            sessionRepository.findSessionById = mock(async () => ({
                id: testSessionId,
                userId: testUserId,
            })) as any
            sessionRepository.findUserByEmailOrUsername = mock(async () => ({
                id: otherUserId,
                email: 'other@example.com',
            })) as any
            sessionRepository.findCollaborator = mock(async () => ({
                id: 'collab-1',
                userId: otherUserId,
            })) as any

            try {
                await expect(
                    sessionService.addCollaborator({
                        userId: testUserId,
                        sessionId: testSessionId,
                        email: 'other@example.com',
                    })
                ).rejects.toThrow(new AppError('User is already a collaborator', 400))
            } finally {
                sessionRepository.findSessionById = originalFind
                sessionRepository.findUserByEmailOrUsername = originalFindUser
                sessionRepository.findCollaborator = originalFindCollab
            }
        })

        it('removeCollaborator throws 403 if non-creator tries to remove another collaborator', async () => {
            const originalFind = sessionRepository.findSessionById
            const originalFindCollab = sessionRepository.findCollaborator
            sessionRepository.findSessionById = mock(async () => ({
                id: testSessionId,
                userId: 'owner-id',
            })) as any
            sessionRepository.findCollaborator = mock(async () => ({
                id: 'collab-1',
                userId: otherUserId,
                email: 'other@example.com',
            })) as any

            try {
                await expect(
                    sessionService.removeCollaborator({
                        userId: testUserId, // neither owner nor otherUserId
                        sessionId: testSessionId,
                        email: 'other@example.com',
                    })
                ).rejects.toThrow(
                    new AppError('Only the session creator can remove other collaborators', 403)
                )
            } finally {
                sessionRepository.findSessionById = originalFind
                sessionRepository.findCollaborator = originalFindCollab
            }
        })

        it('removeCollaborator succeeds when owner removes collaborator or collaborator removes themselves', async () => {
            const originalFind = sessionRepository.findSessionById
            const originalFindCollab = sessionRepository.findCollaborator
            const originalRemove = sessionRepository.removeCollaborator
            sessionRepository.findSessionById = mock(async () => ({
                id: testSessionId,
                userId: testUserId,
            })) as any
            sessionRepository.findCollaborator = mock(async () => ({
                id: 'collab-1',
                userId: otherUserId,
                email: 'other@example.com',
            })) as any
            sessionRepository.removeCollaborator = mock(async () => ({ id: 'collab-1' })) as any

            try {
                const result = await sessionService.removeCollaborator({
                    userId: testUserId,
                    sessionId: testSessionId,
                    email: 'other@example.com',
                })
                expect(result.message).toBe('collaborator removed successfully')
            } finally {
                sessionRepository.findSessionById = originalFind
                sessionRepository.findCollaborator = originalFindCollab
                sessionRepository.removeCollaborator = originalRemove
            }
        })
    })

    describe('getSessionInsights', () => {
        it('calculates token estimation and activity metrics', async () => {
            const originalFind = sessionRepository.findSessionById
            const now = new Date()
            const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000)

            sessionRepository.findSessionById = mock(async () => ({
                id: testSessionId,
                userId: testUserId,
                createdAt: fiveMinsAgo,
                updatedAt: now,
                vmStatus: 'STOPPED',
                type: 'WEB',
                messages: [
                    { role: 'USER', content: '12345678' }, // 8 chars
                    { role: 'ASSISTANT', content: '12345678' }, // 8 chars
                ],
            })) as any

            try {
                const result = await sessionService.getSessionInsights({
                    userId: testUserId,
                    sessionId: testSessionId,
                })

                expect(result.telemetry.totalMessages).toBe(2)
                expect(result.telemetry.userMessages).toBe(1)
                expect(result.telemetry.assistantMessages).toBe(1)
                expect(result.telemetry.estimatedTokens).toBe(4) // 16 chars / 4 = 4 tokens
                expect(result.telemetry.durationMinutes).toBe(5)
                expect(result.insights).toHaveLength(3)
            } finally {
                sessionRepository.findSessionById = originalFind
            }
        })
    })
})
