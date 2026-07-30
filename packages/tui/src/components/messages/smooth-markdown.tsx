import React from 'react'

import { Markdown } from '../markdown'

export function SmoothMarkdown({ text, isRunning }: { text: string; isRunning?: boolean }) {
    return <Markdown>{text}</Markdown>
}
