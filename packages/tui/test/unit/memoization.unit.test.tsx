import { describe, expect, it } from 'bun:test'

import { Markdown } from '../../src/components/markdown'
import { BotMessage } from '../../src/components/messages/bot-message'
import { UserMessage } from '../../src/components/messages/user-message'

describe('TUI Component Memoization', () => {
    it('BotMessage is a memoized React component', () => {
        expect((BotMessage as any).$$typeof).toBe(Symbol.for('react.memo'))
    })

    it('UserMessage is a memoized React component', () => {
        expect((UserMessage as any).$$typeof).toBe(Symbol.for('react.memo'))
    })

    it('Markdown is a memoized React component', () => {
        expect((Markdown as any).$$typeof).toBe(Symbol.for('react.memo'))
    })
})
