import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, afterEach } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { HomeHero } from '../src/features/home/components/HomeHero'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, cleanup } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

describe('Hero Page Mobile & Desktop Layout Standards', () => {
    test('HomeHero renders with overflow-hidden on mobile and overflow-y-auto on desktop', () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })

        const { container } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <HomeHero onPromptSubmit={() => {}} onOpenAuth={() => {}} />
                </MemoryRouter>
            </QueryClientProvider>
        )

        const mainElement = container.querySelector('#main-scroll-container')
        expect(mainElement).not.toBeNull()
        expect(mainElement?.className).toContain('overflow-hidden')
        expect(mainElement?.className).toContain('md:overflow-y-auto')
        expect(mainElement?.className).toContain('h-full')
    })

    test('HomeHero positions prompt input in the upper viewport on mobile (pt-[19vh]) with layout spacer in flow', () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })

        const { container } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <HomeHero onPromptSubmit={() => {}} onOpenAuth={() => {}} />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Find the main centering/padding container
        const heroContentContainer = container.querySelector('.pt-\\[19vh\\]')
        expect(heroContentContainer).not.toBeNull()
        expect(heroContentContainer?.className).toContain('justify-start')
        expect(heroContentContainer?.className).toContain('md:pt-[26vh]')

        // Verify the spacer is NOT hidden on mobile (must preserve flow so prompt doesn't jump)
        const spacer = container.querySelector('.opacity-0.pointer-events-none')
        expect(spacer).not.toBeNull()
        expect(spacer?.className).not.toContain('hidden')
    })
})
