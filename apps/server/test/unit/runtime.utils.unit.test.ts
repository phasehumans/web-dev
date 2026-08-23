import { describe, it, expect } from 'bun:test'

import { formatVmStatus } from '../../src/modules/runtime/runtime.utils'

describe('Runtime Utils - Unit Tests', () => {
    describe('formatVmStatus', () => {
        it('should convert VM status strings to lowercase', () => {
            expect(formatVmStatus('RUNNING')).toBe('running')
            expect(formatVmStatus('STOPPED')).toBe('stopped')
            expect(formatVmStatus('PROVISIONING')).toBe('provisioning')
        })
    })
})
