import React from 'react'

import { Skeleton } from '@/shared/components/ui/Skeleton'

export const SessionListAreaSkeleton: React.FC = () => {
    return (
        <div className="min-h-[420px] flex flex-col gap-1 pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
                <div
                    key={`session-list-skeleton-${index}`}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(100px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_8rem_2.5rem] items-center gap-3 rounded-xl border border-[#242323]/10 bg-[#191919]/5 px-5 py-3 md:gap-4"
                >
                    <div className="flex flex-col gap-1.5 w-full max-w-xs pr-4">
                        <Skeleton className="h-4 w-[85%] bg-white/[0.06]" />
                        <Skeleton className="h-3 w-[60%] bg-white/[0.04]" />
                    </div>
                    <div>
                        <Skeleton className="h-3.5 w-20 bg-white/[0.04]" />
                    </div>
                    <div>
                        <Skeleton className="h-3.5 w-24 bg-white/[0.04]" />
                    </div>
                    <div>
                        <Skeleton className="h-3.5 w-20 bg-white/[0.04]" />
                    </div>
                    <div className="flex justify-center">
                        <Skeleton className="h-7 w-7 rounded-lg bg-white/[0.04]" />
                    </div>
                    <div></div>
                </div>
            ))}
        </div>
    )
}

export const EmptySessionsState: React.FC<{ onNewProject: () => void }> = ({ onNewProject }) => {
    return (
        <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <div className="relative mb-6 h-28 w-32">
                <svg
                    viewBox="0 0 128 112"
                    fill="none"
                    className="h-full w-full text-[#8A8987]"
                    aria-hidden="true"
                >
                    <path
                        d="M28 42.5 64 22l36 20.5v43L64 106 28 85.5v-43Z"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M28 42.5 64 63l36-20.5M64 63v43"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            <h2 className="text-[17px] font-medium text-[#D6D5C9]">No sessions</h2>
            <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#7B7A79]">
                Your recent sessions will appear here.
            </p>
        </div>
    )
}

export const NoResultsState: React.FC = () => {
    return (
        <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <div className="relative mb-6 h-28 w-32">
                <svg
                    viewBox="0 0 128 112"
                    fill="none"
                    className="h-full w-full text-[#8A8987]"
                    aria-hidden="true"
                >
                    <path
                        d="M28 42.5 64 22l36 20.5v43L64 106 28 85.5v-43Z"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M28 42.5 64 63l36-20.5M64 63v43"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <h2 className="text-[17px] font-medium text-[#D6D5C9]">No Sessions Found</h2>
            <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#7B7A79]">
                Try adjusting your search or filters.
            </p>
        </div>
    )
}
