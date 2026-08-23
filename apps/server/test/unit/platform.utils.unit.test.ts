import { describe, it, expect } from 'bun:test'

import { buildProjectZip } from '../../src/modules/platform/platform.utils'

describe('Platform Utils - Unit Tests', () => {
    describe('buildProjectZip', () => {
        it('should build a valid zip archive Uint8Array from file entries', () => {
            const entries = [
                { path: 'package.json', content: '{"name":"test"}' },
                { path: 'src/index.ts', content: 'console.log("hello world");' },
            ]

            const zipBytes = buildProjectZip(entries)

            expect(zipBytes).toBeInstanceOf(Uint8Array)
            expect(zipBytes.length).toBeGreaterThan(50)

            // Zip file header signature: 0x50, 0x4B, 0x03, 0x04 ("PK\x03\x04")
            expect(zipBytes[0]).toBe(0x50)
            expect(zipBytes[1]).toBe(0x4b)
            expect(zipBytes[2]).toBe(0x03)
            expect(zipBytes[3]).toBe(0x04)
        })

        it('should handle empty file entries array and return empty zip record', () => {
            const zipBytes = buildProjectZip([])
            expect(zipBytes).toBeInstanceOf(Uint8Array)
            expect(zipBytes.length).toBe(22) // End of central directory record size
        })
    })
})
