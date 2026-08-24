import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { expect, test, describe, mock, afterEach } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { MobileBreadcrumbsHeader } from '../src/features/navigation/components/MobileBreadcrumbsHeader'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, fireEvent, cleanup } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

describe('MobileBreadcrumbsHeader Component', () => {
    test('renders Home breadcrumb and page name for sessions without logo', () => {
        const onHomeClickMock = mock()
        const onOpenSidebarMock = mock()

        render(
            <MemoryRouter>
                <MobileBreadcrumbsHeader
                    currentPage="Sessions"
                    onHomeClick={onHomeClickMock}
                    onOpenSidebar={onOpenSidebarMock}
                />
            </MemoryRouter>
        )

        expect(screen.getByText('Home')).toBeDefined()
        expect(screen.getByText('Sessions')).toBeDefined()

        const homeButton = screen.getByRole('button', { name: /Home/i })
        fireEvent.click(homeButton)
        expect(onHomeClickMock).toHaveBeenCalledTimes(1)

        const toggleButton = screen.getByRole('button', { name: /Open sidebar/i })
        fireEvent.click(toggleButton)
        expect(onOpenSidebarMock).toHaveBeenCalledTimes(1)
    })

    test('renders nested breadcrumbs for settings subpages like Home / Settings / Billing', () => {
        const onSettingsClickMock = mock()

        render(
            <MemoryRouter>
                <MobileBreadcrumbsHeader
                    onHomeClick={mock()}
                    items={[
                        { label: 'Settings', onClick: onSettingsClickMock },
                        { label: 'Billing', isLast: true },
                    ]}
                />
            </MemoryRouter>
        )

        expect(screen.getByText('Home')).toBeDefined()
        expect(screen.getByText('Settings')).toBeDefined()
        expect(screen.getByText('Billing')).toBeDefined()

        const settingsButton = screen.getByRole('button', { name: 'Settings' })
        fireEvent.click(settingsButton)
        expect(onSettingsClickMock).toHaveBeenCalledTimes(1)
    })
})
