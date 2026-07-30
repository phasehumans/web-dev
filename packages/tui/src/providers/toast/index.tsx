import { Box, Text } from 'ink'
import { createContext, useContext, useRef, useState, useCallback } from 'react'

import { DEFAULT_DURATION } from './types'

import type { ToastOptions, ToastVariant } from './types'
import type { ReactNode } from 'react'

const VARIANT_COLORS: Record<ToastVariant, string> = {
    success: '#6EE7B7',
    error: '#FCA5A5',
    info: 'gray',
}

export type ToastContextValue = {
    currentToast: ToastOptions | null
    show: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
    const value = useContext(ToastContext)
    if (!value) {
        throw new Error('useToast must be used within a ToastProvider')
    }

    return value
}

type ToastProviderProps = {
    children: ReactNode
    onToast?: (options: ToastOptions) => void
}

export function ToastProvider({ children, onToast }: ToastProviderProps) {
    const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null)
    const timeoutHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearCurrentTimeout = useCallback(() => {
        if (timeoutHandleRef.current) {
            clearTimeout(timeoutHandleRef.current)
            timeoutHandleRef.current = null
        }
    }, [])

    const show = useCallback(
        (options: ToastOptions) => {
            const duration = options.duration ?? DEFAULT_DURATION

            clearCurrentTimeout()

            const toastObj = {
                variant: options.variant ?? 'info',
                ...options,
                duration,
            }

            setCurrentToast(toastObj)
            if (onToast) {
                onToast(toastObj)
            }

            timeoutHandleRef.current = setTimeout(() => {
                setCurrentToast(null)
            }, duration)
        },
        [clearCurrentTimeout, onToast]
    )

    const value: ToastContextValue = {
        currentToast,
        show,
    }

    return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

type ToastProps = {
    toast: ToastOptions
}

function Toast({ toast }: ToastProps) {
    const color = toast.variant ? VARIANT_COLORS[toast.variant] : VARIANT_COLORS.info

    return (
        <Box marginLeft={2}>
            <Text color={color}>● </Text>
            <Text>{toast.message}</Text>
        </Box>
    )
}
