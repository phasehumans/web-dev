import { render } from 'ink-testing-library'
import React from 'react'

import { DialogProvider } from '../src/providers/dialog'
import { KeyboardLayerProvider } from '../src/providers/keyboard-layer'
import { ToastProvider } from '../src/providers/toast'

export function renderWithProviders(ui: React.ReactNode) {
    return render(
        <KeyboardLayerProvider>
            <DialogProvider>
                <ToastProvider>{ui}</ToastProvider>
            </DialogProvider>
        </KeyboardLayerProvider>,
        { exitOnCtrlC: false }
    )
}
