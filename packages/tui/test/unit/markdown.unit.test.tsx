import { describe, expect, it } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { Markdown } from '../../src/components/markdown'

describe('Markdown Component (Unit)', () => {
    it('renders basic text', () => {
        const { lastFrame } = render(<Markdown>Hello world</Markdown>)
        expect(lastFrame()).toContain('Hello world')
    })

    it('renders bold and italic text', () => {
        const { lastFrame } = render(<Markdown>**Bold** and *Italic*</Markdown>)
        const frame = lastFrame()
        expect(frame).toContain('Bold')
        expect(frame).toContain('and')
        expect(frame).toContain('Italic')
    })

    it('renders inline code', () => {
        const { lastFrame } = render(<Markdown>Run `npm install`</Markdown>)
        expect(lastFrame()).toContain('npm install')
    })

    it('renders lists', () => {
        const { lastFrame } = render(<Markdown>{`- Item 1\n- Item 2`}</Markdown>)
        const frame = lastFrame()
        expect(frame).toContain('Item 1')
        expect(frame).toContain('Item 2')
    })

    it('renders syntax highlighted code blocks with top bar and expands on Ctrl+O', async () => {
        const { lastFrame, stdin } = render(
            <Markdown>{'```javascript\nconsole.log("test");\n```'}</Markdown>
        )
        let frame = lastFrame()
        expect(frame).toContain('javascript')
        expect(frame).toContain('ctrl+o / enter to expand')

        stdin.write('\x0f')
        await new Promise((resolve) => setTimeout(resolve, 50))

        frame = lastFrame()
        expect(frame).toContain('console.log')
        expect(frame).toContain('test')
    })
})
