import { describe, it, expect, spyOn } from 'bun:test'

import { persistCanvasDocument, hydrateCanvasDocument } from '../../src/modules/canvas/canvas.utils'
import * as projectStorage from '../../src/shared/project-storage'

import type { CanvasDocument } from '../../src/modules/canvas/canvas.schema'

describe('Canvas Utils - Unit Tests', () => {
    describe('persistCanvasDocument & persistImageAsset', () => {
        it('should pass non-image items through unchanged', async () => {
            const canvasState: CanvasDocument = {
                items: [
                    {
                        id: 'item-note-1',
                        type: 'note',
                        x: 10,
                        y: 20,
                        content: 'Hello Canvas',
                    },
                ],
                connections: [],
                pan: { x: 0, y: 0 },
                scale: 100,
                hasInteracted: true,
            }

            const result = await persistCanvasDocument({
                sessionId: 'sess-1',
                userId: 'user-1',
                canvasState,
            })

            expect(result.canvasStateJson.items.length).toBe(1)
            expect(result.canvasStateJson.items[0]?.type).toBe('note')
            expect(result.canvasAssetManifestJson).toEqual([])
        })

        it('should convert data URL image content into a project binary asset and manifest entry', async () => {
            let uploadedKey = ''
            let uploadedContentType = ''

            spyOn(projectStorage, 'putBinaryFile').mockImplementation((async (data: any) => {
                uploadedKey = data.key
                uploadedContentType = data.contentType
                return {} as any
            }) as any)

            const base64Png =
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

            const canvasState: CanvasDocument = {
                items: [
                    {
                        id: 'img-1',
                        type: 'image',
                        x: 0,
                        y: 0,
                        content: base64Png,
                        assetKind: 'upload',
                    },
                ],
                connections: [],
                pan: { x: 0, y: 0 },
                scale: 100,
                hasInteracted: true,
            }

            const result = await persistCanvasDocument({
                sessionId: 'sess-1',
                userId: 'user-1',
                canvasState,
            })

            expect(uploadedKey).toContain('sessions/sess-1/assets/canvas/upload/img-1-')
            expect(uploadedContentType).toBe('image/png')
            expect(result.canvasAssetManifestJson.length).toBe(1)
            expect(result.canvasAssetManifestJson[0]?.itemId).toBe('img-1')
            expect(result.canvasStateJson.items[0]?.content).toBeUndefined()
            expect(result.canvasStateJson.items[0]?.assetSource).toBe('project')
        })
    })

    describe('hydrateCanvasDocument', () => {
        it('should rehydrate project image assets from storage into base64 data URLs', async () => {
            const assetKey = 'sessions/sess-1/assets/canvas/upload/img-1-123.png'

            spyOn(projectStorage, 'getBinaryFile').mockImplementation((async (key: string) => {
                if (key === assetKey) {
                    return {
                        contentType: 'image/png',
                        body: new Uint8Array([137, 80, 78, 71]),
                    }
                }
                return null
            }) as any)

            const canvasState: CanvasDocument = {
                items: [
                    {
                        id: 'img-1',
                        type: 'image',
                        x: 0,
                        y: 0,
                        assetKey,
                        assetSource: 'project',
                        assetKind: 'upload',
                    },
                ],
                connections: [],
                pan: { x: 0, y: 0 },
                scale: 100,
                hasInteracted: true,
            }

            const manifest = [
                {
                    itemId: 'img-1',
                    key: assetKey,
                    contentType: 'image/png',
                    size: 4,
                    kind: 'upload' as const,
                },
            ]

            const result = await hydrateCanvasDocument(canvasState, manifest)

            expect(result.items[0]?.content).toBeDefined()
            expect(result.items[0]?.content).toContain('data:image/png;base64,')
        })
    })
})
