import React from 'react'

import { Skeleton } from '@/shared/components/ui/Skeleton'

interface SessionRowSkeletonConfig {
    desktopTitle: string
    mobileTitle: string
    subtitle: string
    hasTag: boolean
    tagWidth: string
    hasCreator: boolean
    creatorWidth: string
}

const SKELETON_ROWS: SessionRowSkeletonConfig[] = [
    {
        desktopTitle: 'w-[48%]',
        mobileTitle: 'w-[60%]',
        subtitle: 'w-[75%]',
        hasTag: true,
        tagWidth: 'w-14',
        hasCreator: true,
        creatorWidth: 'w-14',
    },
    {
        desktopTitle: 'w-[62%]',
        mobileTitle: 'w-[75%]',
        subtitle: 'w-[48%]',
        hasTag: true,
        tagWidth: 'w-12',
        hasCreator: true,
        creatorWidth: 'w-16',
    },
    {
        desktopTitle: 'w-[38%]',
        mobileTitle: 'w-[50%]',
        subtitle: 'w-[68%]',
        hasTag: false,
        tagWidth: 'w-10',
        hasCreator: false,
        creatorWidth: 'w-12',
    },
    {
        desktopTitle: 'w-[55%]',
        mobileTitle: 'w-[68%]',
        subtitle: 'w-[82%]',
        hasTag: true,
        tagWidth: 'w-16',
        hasCreator: true,
        creatorWidth: 'w-14',
    },
    {
        desktopTitle: 'w-[44%]',
        mobileTitle: 'w-[55%]',
        subtitle: 'w-[56%]',
        hasTag: true,
        tagWidth: 'w-11',
        hasCreator: true,
        creatorWidth: 'w-10',
    },
    {
        desktopTitle: 'w-[58%]',
        mobileTitle: 'w-[70%]',
        subtitle: 'w-[62%]',
        hasTag: false,
        tagWidth: 'w-12',
        hasCreator: false,
        creatorWidth: 'w-12',
    },
    {
        desktopTitle: 'w-[34%]',
        mobileTitle: 'w-[45%]',
        subtitle: 'w-[70%]',
        hasTag: true,
        tagWidth: 'w-14',
        hasCreator: true,
        creatorWidth: 'w-14',
    },
]

export const SessionListSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-200">
            <div className="pb-4">
                <div className="flex flex-col gap-1">
                    {SKELETON_ROWS.map((row, index) => (
                        <React.Fragment key={`session-row-skeleton-${index}`}>
                            {/* Mobile Skeleton (< md): matches SessionListRow mobile geometry */}
                            <div className="md:hidden flex flex-col px-2.5 py-2.5 rounded-lg border border-transparent gap-1">
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                    <Skeleton
                                        className={`h-4 ${row.mobileTitle} bg-white/[0.04] rounded`}
                                    />
                                    <Skeleton className="h-4 w-4 rounded-md bg-white/[0.02] shrink-0" />
                                </div>
                                <Skeleton
                                    className={`h-3 ${row.subtitle} bg-white/[0.025] rounded`}
                                />
                                <div className="flex items-center justify-between pt-0.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Skeleton className="h-2.5 w-11 bg-white/[0.025] rounded" />
                                        {row.hasCreator && (
                                            <Skeleton
                                                className={`h-2.5 ${row.creatorWidth} bg-white/[0.02] rounded`}
                                            />
                                        )}
                                    </div>
                                    {row.hasTag && (
                                        <Skeleton
                                            className={`h-3.5 ${row.tagWidth} rounded-md bg-white/[0.03] shrink-0`}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Desktop Skeleton (>= md): matches SessionListRow desktop grid */}
                            <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(100px,auto)_minmax(100px,auto)_minmax(150px,1fr)_minmax(100px,auto)_2.5rem] items-center gap-3 rounded-lg border border-transparent pl-1 pr-5 py-2">
                                {/* Name column: title + subtitle */}
                                <div className="flex flex-1 items-center gap-3 min-w-0">
                                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                                        <Skeleton
                                            className={`h-4 ${row.desktopTitle} bg-white/[0.04] rounded`}
                                        />
                                        <Skeleton
                                            className={`h-3 ${row.subtitle} bg-white/[0.025] rounded`}
                                        />
                                    </div>
                                </div>

                                {/* Created At */}
                                <div className="truncate pr-2">
                                    <Skeleton className="h-3 w-12 bg-white/[0.025] rounded" />
                                </div>

                                {/* Updated At */}
                                <div className="truncate pr-2">
                                    <Skeleton className="h-3 w-12 bg-white/[0.025] rounded" />
                                </div>

                                {/* Tags & PR */}
                                <div className="flex items-center gap-2 min-w-0">
                                    {row.hasTag ? (
                                        <Skeleton
                                            className={`h-4 ${row.tagWidth} rounded-md bg-white/[0.03]`}
                                        />
                                    ) : (
                                        <div className="h-4" />
                                    )}
                                </div>

                                {/* Created By */}
                                <div className="truncate">
                                    {row.hasCreator ? (
                                        <Skeleton
                                            className={`h-3 ${row.creatorWidth} bg-white/[0.025] rounded`}
                                        />
                                    ) : (
                                        <Skeleton className="h-3 w-8 bg-white/[0.015] rounded" />
                                    )}
                                </div>

                                {/* More Options */}
                                <div className="flex justify-center">
                                    <Skeleton className="h-4 w-4 rounded-md bg-white/[0.02]" />
                                </div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    )
}
