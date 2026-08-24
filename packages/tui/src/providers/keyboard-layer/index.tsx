import React, { createContext, useContext, useCallback, useRef } from 'react'

type Responder = () => boolean

type KeyboardLayerContextValue = {
    push: (id: string, responder?: Responder) => void
    pop: (id: string) => void
    isTopLayer: (id: string) => boolean
    setResponder: (id: string, responder: Responder | null) => void
}

const KeyboardLayerContext = createContext<KeyboardLayerContextValue | null>(null)

export function KeyboardLayerProvider({ children }: { children: React.ReactNode }) {
    const stackRef = useRef<string[]>(['base'])
    const responders = useRef<Map<string, Responder>>(new Map())

    const push = useCallback((id: string, responder?: Responder) => {
        if (responder) responders.current.set(id, responder)
        if (!stackRef.current.includes(id)) stackRef.current = [...stackRef.current, id]
    }, [])

    const pop = useCallback((id: string) => {
        responders.current.delete(id)
        stackRef.current = stackRef.current.filter((layer) => layer !== id)
    }, [])

    const isTopLayer = useCallback((id: string) => {
        const s = stackRef.current
        return s.length === 0 || s[s.length - 1] === id
    }, [])

    const setResponder = useCallback((id: string, responder: Responder | null) => {
        if (responder) responders.current.set(id, responder)
        else responders.current.delete(id)
    }, [])

    return (
        <KeyboardLayerContext.Provider value={{ push, pop, isTopLayer, setResponder }}>
            {children}
        </KeyboardLayerContext.Provider>
    )
}

export function useKeyboardLayer() {
    const context = useContext(KeyboardLayerContext)
    if (!context) {
        throw new Error('useKeyboardLayer must be used within a KeyboardLayerProvider')
    }
    return context
}
