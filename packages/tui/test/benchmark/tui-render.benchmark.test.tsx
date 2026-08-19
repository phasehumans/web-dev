import { describe, expect, it } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { Markdown } from '../../src/components/markdown'

describe('TUI Markdown Rendering Benchmarks', () => {
    it('benchmarks markdown tokenization and terminal formatting on 100 runs', () => {
        const markdownSource = `
# Comprehensive Analysis
- **Point 1**: Verification of \`AST\` node transformation.
- **Point 2**: Table styling and ANSI color highlighting.

\`\`\`typescript
interface UserProfile {
    id: string;
    email: string;
    active: boolean;
}
\`\`\`
`.trim()

        const start = performance.now()
        for (let i = 0; i < 100; i++) {
            const { unmount } = render(<Markdown>{markdownSource}</Markdown>)
            unmount()
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(2000) // 100 renders in under 2 seconds
    })
})
