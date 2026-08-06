import { describe, it, expect, spyOn } from 'bun:test'

import { canvasRepository } from '../../src/modules/canvas/canvas.repository'
import { canvasService } from '../../src/modules/canvas/canvas.service'
import { AppError } from '../../src/shared/appError'
import * as projectStorage from '../../src/shared/project-storage'

import type { CanvasDocument } from '../../src/modules/canvas/canvas.schema'

describe('Canvas Service - Unit Tests', () => {
    describe('createWebClips', () => {
        it('should throw AppError 403 if session access is denied', async () => {
            spyOn(canvasRepository, 'findSessionAccess').mockImplementation(
                (async () => null) as any
            )

            await expect(
                canvasService.createWebClips({
                    url: 'https://example.com',
                    userId: 'user-1',
                    sessionId: '123e4567-e89b-12d3-a456-426614174000',
                })
            ).rejects.toThrow(new AppError('session not found or access denied', 403))
        })

        it('should return web clips response if session access is granted', async () => {
            spyOn(canvasRepository, 'findSessionAccess').mockImplementation((async () => ({
                id: '123e4567-e89b-12d3-a456-426614174000',
            })) as any)

            const res = await canvasService.createWebClips({
                url: 'https://example.com',
                userId: 'user-1',
                sessionId: '123e4567-e89b-12d3-a456-426614174000',
            })

            expect(res.sourceUrl).toBe('https://example.com')
            expect(res.clips).toEqual([])
        })
    })

    describe('saveCanvas', () => {
        it('should throw AppError 403 if session access is denied', async () => {
            spyOn(canvasRepository, 'findSessionAccess').mockImplementation(
                (async () => null) as any
            )

            const dummyState: CanvasDocument = {
                items: [],
                connections: [],
                pan: { x: 0, y: 0 },
                scale: 100,
                hasInteracted: true,
            }

            await expect(
                canvasService.saveCanvas({
                    userId: 'user-1',
                    sessionId: '123e4567-e89b-12d3-a456-426614174000',
                    canvasState: dummyState,
                })
            ).rejects.toThrow(new AppError('session not found or access denied', 403))
        })

        it('should save canvas document and write state & manifest files to storage', async () => {
            spyOn(canvasRepository, 'findSessionAccess').mockImplementation((async () => ({
                id: '123e4567-e89b-12d3-a456-426614174000',
            })) as any)

            const savedKeys: string[] = []
            spyOn(projectStorage, 'putTextFile').mockImplementation((async (data: any) => {
                savedKeys.push(data.key)
                return {} as any
            }) as any)

            const dummyState: CanvasDocument = {
                items: [
                    {
                        id: 'note-1',
                        type: 'note',
                        x: 100,
                        y: 200,
                        content: 'Task List',
                    },
                ],
                connections: [],
                pan: { x: 0, y: 0 },
                scale: 100,
                hasInteracted: true,
            }

            const res = await canvasService.saveCanvas({
                userId: 'user-1',
                sessionId: '123e4567-e89b-12d3-a456-426614174000',
                canvasState: dummyState,
            })

            expect(res.success).toBe(true)
            expect(res.canvasState.items.length).toBe(1)
            expect(savedKeys).toContain('sessions/123e4567-e89b-12d3-a456-426614174000/canvas.json')
            expect(savedKeys).toContain(
                'sessions/123e4567-e89b-12d3-a456-426614174000/canvas-manifest.json'
            )
        })
    })
})
