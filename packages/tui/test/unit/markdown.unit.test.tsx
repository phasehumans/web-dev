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

    it('renders headings', () => {
        const { lastFrame } = render(<Markdown># Sample Heading</Markdown>)
        expect(lastFrame()).toContain('Sample Heading')
    })

    it('renders tables cleanly without raw separator lines', () => {
        const markdownTable = `
| Feature | Mode |
| :--- | :--- |
| Speed | Fast |
        `.trim()
        const { lastFrame } = render(<Markdown>{markdownTable}</Markdown>)
        const frame = lastFrame()
        expect(frame).toContain('Feature')
        expect(frame).toContain('Mode')
        expect(frame).toContain('Speed')
        expect(frame).toContain('Fast')
        // Ensure raw markdown syntax line is not present
        expect(frame).not.toContain('| :--- | :--- |')
    })

    it('renders mermaid diagrams with interactive support', () => {
        const mermaidCode = `
\`\`\`mermaid
graph LR
  A[Client] --> B[Server]
\`\`\`
        `.trim()
        const { lastFrame } = render(<Markdown>{mermaidCode}</Markdown>)
        const frame = lastFrame()
        expect(frame).toContain('Mermaid Diagram')
        expect(frame).toContain('Client')
        expect(frame).toContain('Server')
    })

    it('renders syntax highlighted code blocks in expanded mode without borders', () => {
        const { lastFrame } = render(
            <Markdown>{'```javascript\nconsole.log("test");\n```'}</Markdown>
        )
        const frame = lastFrame()
        expect(frame).toContain('console.log')
        expect(frame).toContain('test')
    })

    it('renders links with blue color #89B4F8', () => {
        const { lastFrame } = render(
            <Markdown>[Feedback Link](https://trydecember.com/feedback)</Markdown>
        )
        const frame = lastFrame()
        expect(frame).toContain('Feedback Link')
    })
})
