import { describe, it, expect } from 'bun:test'

import { ScheduleTaskSchema } from '../../src/modules/schedule/schedule.schema'

describe('Schedule Schema - Unit Tests', () => {
    describe('ScheduleTaskSchema', () => {
        it('should pass with valid name and cron string', () => {
            const valid = {
                name: 'nightly-backup',
                cron: '0 0 * * *',
            }
            const res = ScheduleTaskSchema.safeParse(valid)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.name).toBe('nightly-backup')
                expect(res.data.cron).toBe('0 0 * * *')
            }
        })

        it('should fail if name or cron is empty string or missing', () => {
            expect(ScheduleTaskSchema.safeParse({ name: '', cron: '* * * * *' }).success).toBe(
                false
            )
            expect(ScheduleTaskSchema.safeParse({ name: 'task', cron: '' }).success).toBe(false)
            expect(ScheduleTaskSchema.safeParse({ name: 'task' }).success).toBe(false)
            expect(ScheduleTaskSchema.safeParse({ cron: '* * * * *' }).success).toBe(false)
        })
    })
})
