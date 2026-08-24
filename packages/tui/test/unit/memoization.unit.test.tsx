import { describe, expect, it } from 'bun:test'

import { Header } from '../../src/components/header'
import { InputBar } from '../../src/components/input-bar'
import { Markdown } from '../../src/components/markdown'
import { MessageList } from '../../src/components/message-list'
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

    it('Header is a memoized React component', () => {
        expect((Header as any).$$typeof).toBe(Symbol.for('react.memo'))
    })

    it('MessageList is a memoized React component', () => {
        expect((MessageList as any).$$typeof).toBe(Symbol.for('react.memo'))
    })

    it('InputBar is a memoized React component', () => {
        expect((InputBar as any).$$typeof).toBe(Symbol.for('react.memo'))
    })
})
