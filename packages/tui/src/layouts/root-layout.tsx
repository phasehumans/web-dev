import { DialogProvider } from '../providers/dialog'
import { KeyboardLayerProvider } from '../providers/keyboard-layer'
import { ThemeProvider } from '../providers/theme'
import { ToastProvider } from '../providers/toast'

import type { ReactNode } from 'react'

type Props = {
    children: ReactNode
    onToast?: (options: any) => void
}

export function RootLayout({ children, onToast }: Props) {
    return (
        <ThemeProvider>
            <KeyboardLayerProvider>
                <ToastProvider onToast={onToast}>
                    <DialogProvider>{children}</DialogProvider>
                </ToastProvider>
            </KeyboardLayerProvider>
        </ThemeProvider>
    )
}
