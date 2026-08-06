import { describe, it, expect, beforeEach } from 'bun:test'

import { sessionCache } from '../../src/modules/auth/auth.cache'

import type { CachedSessionData } from '../../src/modules/auth/auth.types'

describe('Auth SessionCache - Unit Tests', () => {
    const mockSessionData: CachedSessionData = {
        id: 'sess-123',
        userId: 'user-456',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        user: {
            id: 'user-456',
            isDeleted: false,
        },
    }

    beforeEach(() => {
        sessionCache.clear()
    })

    it('should store and retrieve session from L1 in-memory map', async () => {
        await sessionCache.set('sess-123', mockSessionData)

        const cached = await sessionCache.get('sess-123')
        expect(cached).not.toBeNull()
        expect(cached?.id).toBe('sess-123')
        expect(cached?.userId).toBe('user-456')
    })

    it('should return null for non-existent session ID', async () => {
        const cached = await sessionCache.get('non-existent-session')
        expect(cached).toBeNull()
    })

    it('should invalidate specific session by ID', async () => {
        await sessionCache.set('sess-123', mockSessionData)
        await sessionCache.invalidate('sess-123')

        const cached = await sessionCache.get('sess-123')
        expect(cached).toBeNull()
    })

    it('should invalidate all sessions for a user', async () => {
        const session1: CachedSessionData = { ...mockSessionData, id: 'sess-1' }
        const session2: CachedSessionData = { ...mockSessionData, id: 'sess-2' }

        await sessionCache.set('sess-1', session1)
        await sessionCache.set('sess-2', session2)

        await sessionCache.invalidateUser('user-456')

        expect(await sessionCache.get('sess-1')).toBeNull()
        expect(await sessionCache.get('sess-2')).toBeNull()
    })

    it('should clear in-memory entries and invalidate session', async () => {
        await sessionCache.set('sess-123', mockSessionData)
        await sessionCache.invalidate('sess-123')
        sessionCache.clear()

        expect(await sessionCache.get('sess-123')).toBeNull()
    })
})
