import { useState } from 'react'

import type { Message } from '@december/tui'

export function useChat() {
    const [currentPlannedPrompt, setCurrentPlannedPrompt] = useState<string | null>(null)
    const [planMode, setPlanMode] = useState(false)
    const [grillMode, setGrillMode] = useState(false)

    const [grillQuestions, setGrillQuestions] = useState<{ question: string; options: string[] }[]>(
        []
    )
    const [currentGrillIndex, setCurrentGrillIndex] = useState(0)
    const [grillAnswers, setGrillAnswers] = useState<string[]>([])
    const [grillPrompt, setGrillPrompt] = useState<string | null>(null)

    const [customInputMode, setCustomInputMode] = useState(false)
    const [customAnswer, setCustomAnswer] = useState('')

    const [staticMessages, setStaticMessages] = useState<Message[]>([
        { id: 'header', role: 'header' },
    ])
    const [staticKey, setStaticKey] = useState(0)
    const [activeMessages, setActiveMessages] = useState<Message[]>([])
    const [isStreaming, setIsStreaming] = useState(false)

    return {
        currentPlannedPrompt,
        setCurrentPlannedPrompt,
        planMode,
        setPlanMode,
        grillMode,
        setGrillMode,
        grillQuestions,
        setGrillQuestions,
        currentGrillIndex,
        setCurrentGrillIndex,
        grillAnswers,
        setGrillAnswers,
        grillPrompt,
        setGrillPrompt,
        customInputMode,
        setCustomInputMode,
        customAnswer,
        setCustomAnswer,
        staticMessages,
        setStaticMessages,
        staticKey,
        setStaticKey,
        activeMessages,
        setActiveMessages,
        isStreaming,
        setIsStreaming,
    }
}
