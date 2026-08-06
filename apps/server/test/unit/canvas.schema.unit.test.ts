import { describe, it, expect } from 'bun:test'

import { saveCanvasSchema, webClipRequestSchema } from '../../src/modules/canvas/canvas.schema'

describe('Canvas Schema - Unit Tests', () => {
    describe('saveCanvasSchema', () => {
        const dummyCanvasState = {
            items: [],
            connections: [],
            pan: { x: 0, y: 0 },
            scale: 100,
            hasInteracted: false,
        }

        it('should pass with valid sessionId (UUID)', () => {
            const valid = {
                sessionId: '123e4567-e89b-12d3-a456-426614174000',
                canvasState: dummyCanvasState,
            }
            expect(saveCanvasSchema.safeParse(valid).success).toBe(true)
        })

        it('should pass with valid projectId (UUID)', () => {
            const valid = {
                projectId: '123e4567-e89b-12d3-a456-426614174000',
                canvasState: dummyCanvasState,
            }
            expect(saveCanvasSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail if neither sessionId nor projectId is provided', () => {
            const invalid = {
                canvasState: dummyCanvasState,
            }
            expect(saveCanvasSchema.safeParse(invalid).success).toBe(false)
        })
    })

    describe('webClipRequestSchema', () => {
        it('should pass with url and projectId', () => {
            const valid = {
                url: 'https://example.com',
                projectId: '123e4567-e89b-12d3-a456-426614174000',
            }
            expect(webClipRequestSchema.safeParse(valid).success).toBe(true)
        })

        it('should pass with url and sessionId', () => {
            const valid = {
                url: 'https://example.com',
                sessionId: '123e4567-e89b-12d3-a456-426614174000',
            }
            expect(webClipRequestSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail with invalid url', () => {
            const invalid = {
                url: 'not-a-url',
            }
            expect(webClipRequestSchema.safeParse(invalid).success).toBe(false)
        })
    })
})
