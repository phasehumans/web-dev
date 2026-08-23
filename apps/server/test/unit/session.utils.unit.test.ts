import { describe, it, expect } from 'bun:test'

import { parseStoredSessionFiles } from '../../src/modules/session/session.utils'

describe('Session Utils - Unit Tests', () => {
    describe('parseStoredSessionFiles', () => {
        it('should return empty array for non-array input', () => {
            expect(parseStoredSessionFiles(null)).toEqual([])
            expect(parseStoredSessionFiles(undefined)).toEqual([])
            expect(parseStoredSessionFiles('invalid')).toEqual([])
            expect(parseStoredSessionFiles(123)).toEqual([])
            expect(parseStoredSessionFiles({})).toEqual([])
        })

        it('should parse valid stored session files correctly', () => {
            const input = [
                {
                    path: 'src/index.ts',
                    key: 'sessions/123/workspace/src/index.ts',
                    contentType: 'text/plain',
                    size: 1024,
                },
                {
                    path: 'public/logo.png',
                    key: 'sessions/123/workspace/public/logo.png',
                    contentType: 'image/png',
                    size: 2048,
                },
            ]

            const result = parseStoredSessionFiles(input)
            expect(result).toHaveLength(2)
            expect(result[0]).toEqual({
                path: 'src/index.ts',
                key: 'sessions/123/workspace/src/index.ts',
                contentType: 'text/plain',
                size: 1024,
            })
            expect(result[1]).toEqual({
                path: 'public/logo.png',
                key: 'sessions/123/workspace/public/logo.png',
                contentType: 'image/png',
                size: 2048,
            })
        })

        it('should filter out invalid items and supply default size 0 if missing', () => {
            const input = [
                null,
                'invalid',
                { path: 'file.txt' }, // missing key
                { key: 'key.txt' }, // missing path
                { path: 123, key: 'key.txt' }, // non-string path
                { path: 'valid.txt', key: 'sessions/key.txt' }, // valid without size/contentType
            ]

            const result = parseStoredSessionFiles(input)
            expect(result).toHaveLength(1)
            expect(result[0]).toEqual({
                path: 'valid.txt',
                key: 'sessions/key.txt',
                size: 0,
            })
        })
    })
})
