import { prisma } from '@december/database'
import { describe, it, expect, mock, spyOn } from 'bun:test'

import * as sessionRepository from '../src/modules/session/session.repository'
import { sessionService } from '../src/modules/session/session.service'

describe('Session E2B & Rehydration Service Suite', () => {
    it('rehydrateSession - returns chat messages, session detail, file tree, and scrollback buffer', async () => {
        const testSessionId = 'sess-rehydrate-1'
        const testUserId = 'user-rehydrate-1'

        spyOn(sessionRepository, 'findSessionById').mockImplementation(
            async (id: string) =>
                ({
                    id,
                    userId: testUserId,
                    title: 'Rehydrate Test Session',
                    vmStatus: 'RUNNING',
                }) as any
        )

        prisma.message.findMany = mock(async () => [
            { id: 'msg-1', sessionId: testSessionId, role: 'user', content: 'Rehydrate prompt' },
            { id: 'msg-2', sessionId: testSessionId, role: 'assistant', content: 'Agent response' },
        ]) as any

        const result = await sessionService.rehydrateSession({
            userId: testUserId,
            sessionId: testSessionId,
        })

        expect(result.session.id).toBe(testSessionId)
        expect(result.messages.length).toBe(2)
        expect(result.messages[0]?.content).toBe('Rehydrate prompt')
        expect(result.fileTree).toBeDefined()
        expect(result.terminalScrollback).toBeDefined()
    })

    it('disconnectSession - emits disconnect signal and starts tab closure grace period', async () => {
        const testSessionId = 'sess-disconnect-1'
        const testUserId = 'user-disconnect-1'

        spyOn(sessionRepository, 'findSessionById').mockImplementation(
            async (id: string) =>
                ({
                    id,
                    userId: testUserId,
                    vmStatus: 'RUNNING',
                }) as any
        )

        const result = await sessionService.disconnectSession({
            userId: testUserId,
            sessionId: testSessionId,
        })

        expect(result.message).toContain('Disconnect signal received')
    })

    it('proxyPreview - resolves preview URL, target host, and CORS / X-Forwarded-Host headers', async () => {
        const testSessionId = 'sess-preview-1'
        const testUserId = 'user-preview-1'

        spyOn(sessionRepository, 'findSessionById').mockImplementation(
            async (id: string) =>
                ({
                    id,
                    userId: testUserId,
                    vmStatus: 'RUNNING',
                }) as any
        )

        const result = await sessionService.proxyPreview({
            userId: testUserId,
            sessionId: testSessionId,
            port: 5173,
            reqPath: '/app',
        })

        expect(result.port).toBe(5173)
        expect(result.targetHost).toBe(`session-${testSessionId}-5173.preview.december.ai`)
        expect(result.previewUrl).toContain('5173')
        expect(result.headers['X-Forwarded-Host']).toBe(
            `session-${testSessionId}-5173.preview.december.ai`
        )
        expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
    })
})
