import { describe, it, expect } from 'bun:test'

import { isValidCron } from '../../src/modules/schedule/schedule.utils'

describe('Schedule Utils - Unit Tests', () => {
    describe('isValidCron', () => {
        it('should return true for cron expressions with 5 or more space-separated parts', () => {
            expect(isValidCron('* * * * *')).toBe(true)
            expect(isValidCron('0 0 * * *')).toBe(true)
            expect(isValidCron('*/5 * * * * *')).toBe(true)
        })

        it('should return false for cron expressions with fewer than 5 parts', () => {
            expect(isValidCron('* * * *')).toBe(false)
            expect(isValidCron('hourly')).toBe(false)
            expect(isValidCron('')).toBe(false)
        })
    })
})
