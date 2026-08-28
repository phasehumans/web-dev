import { prisma } from '@december/database'
import { describe, it, expect, mock } from 'bun:test'

import { processGrpcStream } from '../../src/listener'

describe('Worker Listener Unit Tests', () => {
    it('should process grpc stream, publish to Redis, and set session status to STOPPED on success', async () => {
        const updateMock = mock(async () => ({}) as any)
        prisma.session.update = updateMock as any

        const fakeEvents = [
            { data: JSON.stringify({ type: 'AgentStart' }) },
            { data: JSON.stringify({ type: 'TurnStart' }) },
            { data: JSON.stringify({ type: 'TurnEnd' }) },
            { data: JSON.stringify({ type: 'AgentEnd' }) },
        ]

        const streamGenerator = (async function* () {
            for (const ev of fakeEvents) {
                yield ev
            }
        })()

        await processGrpcStream('sess-listener-success', streamGenerator)

        expect(updateMock).toHaveBeenCalledWith({
            where: { id: 'sess-listener-success' },
            data: { vmStatus: 'STOPPED' },
        })
    })

    it('should set session status to FAILED when AgentError event is encountered in stream', async () => {
        const updateMock = mock(async () => ({}) as any)
        prisma.session.update = updateMock as any

        const fakeEvents = [
            { data: JSON.stringify({ type: 'AgentStart' }) },
            { data: JSON.stringify({ type: 'AgentError', error: 'Container Out of Memory' }) },
            { data: JSON.stringify({ type: 'AgentEnd' }) },
        ]

        const streamGenerator = (async function* () {
            for (const ev of fakeEvents) {
                yield ev
            }
        })()

        await processGrpcStream('sess-listener-fail', streamGenerator)

        expect(updateMock).toHaveBeenCalledWith({
            where: { id: 'sess-listener-fail' },
            data: { vmStatus: 'FAILED' },
        })
    })

    it('should record UsageEvent in Prisma when AgentUsage event is processed', async () => {
        const createUsageMock = mock(async () => ({}) as any)
        const updateUserMock = mock(async () => ({}) as any)
        prisma.usageEvent.create = createUsageMock as any
        prisma.user.update = updateUserMock as any
        prisma.session.findUnique = mock(async () => ({ userId: 'usr-usage-1' }) as any) as any
        prisma.session.update = mock(async () => ({}) as any) as any
        prisma.$queryRaw = mock(async () => [{ creditBalance: 500 }] as any) as any
        prisma.$transaction = mock(async (cb: any) => cb(prisma)) as any

        const fakeEvents = [
            {
                data: JSON.stringify({
                    type: 'AgentUsage',
                    model: 'gemini-3.6-flash',
                    promptTokens: 500,
                    completionTokens: 100,
                }),
            },
        ]

        const streamGenerator = (async function* () {
            for (const ev of fakeEvents) {
                yield ev
            }
        })()

        await processGrpcStream('sess-usage-1', streamGenerator)

        expect(createUsageMock).toHaveBeenCalled()
        expect(updateUserMock).toHaveBeenCalled()
    })
})
