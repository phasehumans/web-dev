import * as child_process from 'child_process'

import { describe, expect, it, spyOn } from 'bun:test'

import { writeToClipboard } from '../../src/utils/clipboard'

describe('Clipboard Helper (Unit)', () => {
    it('executes writeToClipboard with mocked spawnSync', () => {
        const spy = spyOn(child_process, 'spawnSync').mockImplementation(
            () => ({ error: null }) as any
        )

        try {
            writeToClipboard('test copy content')
            expect(spy).toHaveBeenCalled()
        } finally {
            spy.mockRestore()
        }
    })
})
