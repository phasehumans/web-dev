import { describe, expect, it } from 'bun:test'

import { writeToClipboard } from '../../src/utils/clipboard'

describe('Clipboard Helper (Unit)', () => {
    it('executes writeToClipboard without throwing exceptions', () => {
        expect(() => {
            writeToClipboard('test copy content')
        }).not.toThrow()
    })
})
