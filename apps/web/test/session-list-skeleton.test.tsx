import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { expect, test, describe, afterEach } from 'bun:test'
import React from 'react'

import { SessionListSkeleton } from '../src/features/sessions/components/SessionListSkeleton'
import { SessionListView } from '../src/features/sessions/components/SessionListView'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, cleanup } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

describe('SessionListSkeleton UI', () => {
    test('renders minimal shimmering skeleton rows with desktop grid and mobile layouts', () => {
        const { container } = render(<SessionListSkeleton />)

        // Verify desktop rows matching SessionListRow geometry
        const desktopRows = container.querySelectorAll('.hidden.md\\:grid')
        expect(desktopRows.length).toBe(7)

        // Verify mobile rows matching SessionListRow mobile geometry
        const mobileRows = container.querySelectorAll('.md\\:hidden')
        expect(mobileRows.length).toBe(7)

        // Verify skeleton elements contain shimmer animation styling
        const skeletons = container.querySelectorAll('.relative.overflow-hidden')
        expect(skeletons.length).toBeGreaterThan(20)
        expect(skeletons[0].className).toContain('after:animate-[shimmer_2s_infinite]')
    })

    test('SessionListView renders SessionListSkeleton when isInitialLoading is true', () => {
        const { container } = render(
            <SessionListView
                projects={[]}
                onNewProject={() => {}}
                onOpenProject={() => {}}
                isInitialLoading={true}
                isFetching={false}
                errorMessage={null}
                actionError={null}
                menuOpenId={null}
                isTogglePending={false}
                onToggleStar={() => {}}
                onToggleMenu={() => {}}
                onOpenProjectFromMenu={() => {}}
                onToggleStarFromMenu={() => {}}
                onToggleArchiveFromMenu={() => {}}
                onOpenRename={() => {}}
                onOpenDuplicate={() => {}}
                onOpenDelete={() => {}}
                onOpenTags={() => {}}
                searchQuery=""
                onSearchChange={() => {}}
                sortOption="newest"
                onSortChange={() => {}}
                hasUnfilteredProjects={false}
            />
        )

        const desktopRows = container.querySelectorAll('.hidden.md\\:grid')
        expect(desktopRows.length).toBe(7)
    })
})
