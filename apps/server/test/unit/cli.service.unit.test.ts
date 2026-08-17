import { prisma } from '@december/database'
import { describe, it, expect, spyOn } from 'bun:test'

import { cliDispatcher } from '../../src/modules/cli/cli.dispatcher'
import { cliRepository } from '../../src/modules/cli/cli.repository'
import { cliService } from '../../src/modules/cli/cli.service'
import { usageService } from '../../src/modules/usage/usage.service'

describe('CLI Service - Unit Tests', () => {
    describe('verifyWalletBalance', () => {
        it('should return true if usageService.hasMinimumBalance returns true', async () => {
            spyOn(usageService, 'hasMinimumBalance').mockImplementation((async () => true) as any)

            const result = await cliService.verifyWalletBalance({ userId: 'user-1' })
            expect(result).toBe(true)
        })

        it('should return false if usageService.hasMinimumBalance returns false', async () => {
            spyOn(usageService, 'hasMinimumBalance').mockImplementation((async () => false) as any)

            const result = await cliService.verifyWalletBalance({ userId: 'user-1' })
            expect(result).toBe(false)
        })
    })

    describe('generateHandoffUrl', () => {
        it('should throw AppError 409 if active running/provisioning session exists', async () => {
            const originalFindFirst = prisma.session.findFirst
            prisma.session.findFirst = (async () => ({ id: 'active-session-1' })) as any

            try {
                await expect(cliService.generateHandoffUrl({ userId: 'user-1' })).rejects.toThrow(
                    'Conflict: You already have an active cloud session running. Please stop it before handing off.'
                )
            } finally {
                prisma.session.findFirst = originalFindFirst
            }
        })

        it('should generate pre-signed upload URL and objectKey if no active session exists', async () => {
            const originalFindFirst = prisma.session.findFirst
            prisma.session.findFirst = (async () => null) as any

            try {
                const res = await cliService.generateHandoffUrl({ userId: 'user-1' })
                expect(res.uploadUrl).toBeDefined()
                expect(res.objectKey).toBeDefined()
                expect(res.objectKey).toContain('handoffs/user-1/')
            } finally {
                prisma.session.findFirst = originalFindFirst
            }
        })
    })

    describe('completeHandoff', () => {
        it('should delegate to cliRepository.createSession with default title if omitted', async () => {
            spyOn(cliRepository, 'createSession').mockImplementation((async (data: any) => ({
                id: 'session-123',
                title: data.title,
                type: 'CLI',
                minioPrefix: data.minioPrefix,
            })) as any)

            const result = await cliService.completeHandoff({
                userId: 'user-1',
                objectKey: 'handoffs/user-1/key.tar.gz',
            })

            expect(result.id).toBe('session-123')
            expect(result.title).toBe('Handoff Session')
            expect(result.minioPrefix).toBe('handoffs/user-1/key.tar.gz')
        })
    })

    describe('proxyChatCompletions', () => {
        it('streams OpenAI-format SSE chunks and records usage upon completion', async () => {
            const writtenChunks: string[] = []
            const headers: Record<string, string> = {}
            const mockRes = {
                setHeader: (k: string, v: string) => {
                    headers[k] = v
                },
                write: (chunk: string) => {
                    writtenChunks.push(chunk)
                },
                end: () => {},
                writableEnded: false,
                headersSent: true,
            }

            const mockProvider = {
                id: 'mock',
                name: 'Mock Provider',
                stream: async function* () {
                    yield { type: 'thinking_delta', text: 'Thinking...' }
                    yield { type: 'text', text: 'Hello, World!' }
                    yield {
                        type: 'tool_call_delta',
                        id: 'call_123',
                        name: 'write_file',
                        inputDelta: '{"path":"TASK.md"}',
                    }
                    yield { type: 'usage', promptTokens: 10, completionTokens: 20 }
                },
            }

            spyOn(cliDispatcher, 'resolveServerProvider').mockReturnValue({
                provider: mockProvider as any,
                providerName: 'gemini',
                model: 'gemini-3.6-flash',
            })

            const recordUsageSpy = spyOn(usageService, 'recordUsageEvent').mockImplementation(
                (async () => ({}) as any) as any
            )

            await cliService.proxyChatCompletions({
                userId: 'user-123',
                body: {
                    model: 'gemini-3.6-flash',
                    messages: [{ role: 'user', content: 'test message' }],
                },
                res: mockRes,
            })

            expect(headers['Content-Type']).toBe('text/event-stream')
            expect(headers['Cache-Control']).toBe('no-cache')
            expect(writtenChunks.some((c) => c.includes('Thinking...'))).toBe(true)
            expect(writtenChunks.some((c) => c.includes('Hello, World!'))).toBe(true)
            expect(writtenChunks.some((c) => c.includes('write_file'))).toBe(true)
            expect(writtenChunks.some((c) => c.includes('data: [DONE]'))).toBe(true)
            expect(recordUsageSpy).toHaveBeenCalled()
        })
    })
})
