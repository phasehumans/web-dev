import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, afterEach, mock } from 'bun:test'
import React from 'react'

import { AuthModal } from '../src/features/auth/components/AuthModal'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, cleanup } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

describe('AuthModal Mobile History & Back Navigation', () => {
    test('pushes history state on open and calls onClose upon popstate (mobile back button)', () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const onClose = mock(() => {})
        const onAuthSuccess = mock(() => {})

        const originalPushState = window.history.pushState.bind(window.history)
        let pushedModalState = false
        window.history.pushState = (data: any, unused: string, url?: string | URL | null) => {
            if (data?.modal === 'auth') {
                pushedModalState = true
            }
            return originalPushState(data, unused, url)
        }

        const { unmount } = render(
            <GoogleOAuthProvider clientId="test-client-id">
                <QueryClientProvider client={queryClient}>
                    <AuthModal isOpen={true} onClose={onClose} onAuthSuccess={onAuthSuccess} />
                </QueryClientProvider>
            </GoogleOAuthProvider>
        )

        expect(pushedModalState).toBe(true)

        // Simulate mobile back button / popstate event
        window.dispatchEvent(new Event('popstate'))

        expect(onClose).toHaveBeenCalledTimes(1)

        unmount()
        window.history.pushState = originalPushState
    })

    test('renders immediately with solid backdrop container to prevent background flash', () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const { container, unmount } = render(
            <GoogleOAuthProvider clientId="test-client-id">
                <QueryClientProvider client={queryClient}>
                    <AuthModal isOpen={true} onClose={() => {}} onAuthSuccess={() => {}} />
                </QueryClientProvider>
            </GoogleOAuthProvider>
        )

        const backdrop = container.querySelector('.fixed.inset-0.z-\\[100\\].bg-\\[\\#141414\\]')
        expect(backdrop).not.toBeNull()

        unmount()
    })
})
