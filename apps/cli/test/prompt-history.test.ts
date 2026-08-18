import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

import { PromptHistory } from '../src/utils/prompt-history'

describe('PromptHistory (Unit)', () => {
    const testHistoryPath = path.join(os.tmpdir(), `december-test-history-${Date.now()}.txt`)

    beforeEach(() => {
        try {
            if (fs.existsSync(testHistoryPath)) fs.unlinkSync(testHistoryPath)
        } catch {
            // Intentionally swallowed: cleanup temporary test history file
        }
    })

    afterEach(() => {
        try {
            if (fs.existsSync(testHistoryPath)) fs.unlinkSync(testHistoryPath)
        } catch {
            // Intentionally swallowed: cleanup temporary test history file
        }
    })

    it('persists submitted prompts to disk', () => {
        const history = new PromptHistory(testHistoryPath)
        history.append('first prompt')
        history.append('second prompt')

        const content = fs.readFileSync(testHistoryPath, 'utf8')
        expect(content).toContain('first prompt\nsecond prompt')
    })

    it('loads existing prompts from disk on initialization', () => {
        fs.writeFileSync(testHistoryPath, 'saved prompt 1\nsaved prompt 2\n')
        const history = new PromptHistory(testHistoryPath)

        expect(history.getPrevious('')).toBe('saved prompt 2')
        expect(history.getPrevious('')).toBe('saved prompt 1')
        expect(history.getNext()).toBe('saved prompt 2')
        expect(history.getNext()).toBe('')
    })

    it('navigates up and down through prompt history preserving user draft', () => {
        const history = new PromptHistory(testHistoryPath)
        history.append('prompt A')
        history.append('prompt B')

        expect(history.getPrevious('my current draft')).toBe('prompt B')
        expect(history.getPrevious('prompt B')).toBe('prompt A')
        // top of history reached
        expect(history.getPrevious('prompt A')).toBe('prompt A')

        expect(history.getNext()).toBe('prompt B')
        expect(history.getNext()).toBe('my current draft')
    })
})
