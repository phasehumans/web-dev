import { describe, it, expect } from 'bun:test'

import { formatUsageBytes } from '../../src/modules/usage/usage.utils'

describe('Usage Utils - Unit Tests', () => {
    describe('formatUsageBytes', () => {
        it('should format bytes < 1024 as B', () => {
            expect(formatUsageBytes(0)).toBe('0 B')
            expect(formatUsageBytes(500)).toBe('500 B')
            expect(formatUsageBytes(1023)).toBe('1023 B')
        })

        it('should format bytes between 1024 and 1MB as KB', () => {
            expect(formatUsageBytes(1024)).toBe('1.00 KB')
            expect(formatUsageBytes(2048)).toBe('2.00 KB')
            expect(formatUsageBytes(1536)).toBe('1.50 KB')
        })

        it('should format bytes >= 1MB as MB', () => {
            expect(formatUsageBytes(1024 * 1024)).toBe('1.00 MB')
            expect(formatUsageBytes(1024 * 1024 * 2.5)).toBe('2.50 MB')
        })
    })
})
