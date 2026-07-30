import React, { useState, useEffect } from 'react'

import { Markdown } from '../markdown'

export function SmoothMarkdown({ text, isRunning }: { text: string; isRunning?: boolean }) {
    const [displayedText, setDisplayedText] = useState(text)

    useEffect(() => {
        if (!isRunning || !text.startsWith(displayedText)) {
            setDisplayedText(text)
            return
        }

        if (displayedText.length >= text.length) {
            if (displayedText !== text && text.length < displayedText.length) {
                setDisplayedText(text)
            }
            return
        }

        const interval = setInterval(() => {
            setDisplayedText((prev) => {
                if (!text.startsWith(prev) || prev.length >= text.length) {
                    clearInterval(interval)
                    return text
                }
                const remaining = text.length - prev.length
                const charsToAdd = Math.max(1, Math.min(3, Math.ceil(remaining / 5)))
                return text.slice(0, prev.length + charsToAdd)
            })
        }, 20)

        return () => clearInterval(interval)
    }, [text, isRunning, displayedText])

    useEffect(() => {
        if (text.length - displayedText.length > 500) {
            setDisplayedText(text)
        }
    }, [text])

    return <Markdown>{displayedText}</Markdown>
}
