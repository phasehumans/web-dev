import React from 'react'

import { Skeleton } from '@/shared/components/ui/Skeleton'

interface ProfileSettingsSkeletonProps {
    activeTab?: string
}

const SettingRowSkeleton: React.FC<{
    titleWidth?: string
    descWidth?: string
    actionType?: 'button' | 'toggle' | 'badge' | 'none'
}> = ({ titleWidth = 'w-36', descWidth = 'w-56', actionType = 'button' }) => (
    <div className="flex items-center justify-between py-3">
        <div className="flex flex-col gap-1.5 min-w-0 pr-4">
            <Skeleton className={`h-4 ${titleWidth} bg-white/[0.06]`} />
            {descWidth && <Skeleton className={`h-3 ${descWidth} bg-white/[0.04]`} />}
        </div>
        {actionType === 'button' && (
            <Skeleton className="h-8 w-24 rounded-lg bg-white/[0.04] shrink-0" />
        )}
        {actionType === 'toggle' && (
            <Skeleton className="h-5 w-9 rounded-full bg-white/[0.06] shrink-0" />
        )}
        {actionType === 'badge' && (
            <Skeleton className="h-6 w-16 rounded-md bg-white/[0.04] shrink-0" />
        )}
    </div>
)

export const ProfileSettingsSkeleton: React.FC<ProfileSettingsSkeletonProps> = ({
    activeTab = 'Account',
}) => {
    if (activeTab === 'Preferences' || activeTab === 'General') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <Skeleton className="h-[18px] w-28 mb-4 bg-white/[0.06]" />
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        <SettingRowSkeleton
                            titleWidth="w-36"
                            descWidth="w-72"
                            actionType="toggle"
                        />
                        <SettingRowSkeleton
                            titleWidth="w-44"
                            descWidth="w-80"
                            actionType="button"
                        />
                        <SettingRowSkeleton
                            titleWidth="w-40"
                            descWidth="w-64"
                            actionType="toggle"
                        />
                    </div>
                </div>

                <div className="flex flex-col mb-8">
                    <Skeleton className="h-[18px] w-32 mb-4 bg-white/[0.06]" />
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        <SettingRowSkeleton
                            titleWidth="w-48"
                            descWidth="w-96"
                            actionType="toggle"
                        />
                        <SettingRowSkeleton
                            titleWidth="w-32"
                            descWidth="w-60"
                            actionType="button"
                        />
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Connections' || activeTab === 'Integrations') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <Skeleton className="h-[18px] w-28 mb-4 bg-white/[0.06]" />
                    <div className="flex flex-col gap-4 border-t border-[#242323] pt-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-3.5">
                                    <Skeleton className="w-9 h-9 rounded-lg bg-white/[0.04] shrink-0" />
                                    <div className="flex flex-col gap-1.5">
                                        <Skeleton className="h-4 w-24 bg-white/[0.06]" />
                                        <Skeleton className="h-3 w-48 bg-white/[0.04]" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-24 rounded-lg bg-white/[0.04] shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Repositories') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-[18px] w-32 bg-white/[0.06]" />
                        <Skeleton className="h-8 w-28 rounded-lg bg-white/[0.04]" />
                    </div>
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between py-3">
                                <div className="flex flex-col gap-1.5">
                                    <Skeleton className="h-4 w-44 bg-white/[0.06]" />
                                    <Skeleton className="h-3 w-64 bg-white/[0.04]" />
                                </div>
                                <Skeleton className="h-6 w-16 rounded-md bg-white/[0.04]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Skills') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-[18px] w-24 bg-white/[0.06]" />
                        <Skeleton className="h-8 w-24 rounded-lg bg-white/[0.04]" />
                    </div>
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        {[1, 2, 3, 4].map((i) => (
                            <SettingRowSkeleton
                                key={i}
                                titleWidth="w-36"
                                descWidth="w-72"
                                actionType="badge"
                            />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Secrets') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-[18px] w-24 bg-white/[0.06]" />
                        <Skeleton className="h-8 w-28 rounded-lg bg-white/[0.04]" />
                    </div>
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between py-3">
                                <div className="flex flex-col gap-1.5">
                                    <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                                    <Skeleton className="h-3 w-48 bg-white/[0.04]" />
                                </div>
                                <Skeleton className="h-8 w-20 rounded-lg bg-white/[0.04]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Review') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <Skeleton className="h-[18px] w-36 mb-4 bg-white/[0.06]" />
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        <SettingRowSkeleton
                            titleWidth="w-40"
                            descWidth="w-80"
                            actionType="toggle"
                        />
                        <SettingRowSkeleton
                            titleWidth="w-48"
                            descWidth="w-96"
                            actionType="toggle"
                        />
                        <SettingRowSkeleton
                            titleWidth="w-36"
                            descWidth="w-64"
                            actionType="button"
                        />
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Schedules') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-[18px] w-28 bg-white/[0.06]" />
                        <Skeleton className="h-8 w-28 rounded-lg bg-white/[0.04]" />
                    </div>
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between py-3">
                                <div className="flex flex-col gap-1.5">
                                    <Skeleton className="h-4 w-40 bg-white/[0.06]" />
                                    <Skeleton className="h-3 w-56 bg-white/[0.04]" />
                                </div>
                                <Skeleton className="h-6 w-16 rounded-md bg-white/[0.04]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Billing') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <Skeleton className="h-[18px] w-28 mb-4 bg-white/[0.06]" />
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        <SettingRowSkeleton
                            titleWidth="w-32"
                            descWidth="w-64"
                            actionType="button"
                        />
                    </div>
                </div>
                <div className="flex flex-col mb-8">
                    <Skeleton className="h-[18px] w-32 mb-4 bg-white/[0.06]" />
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        <SettingRowSkeleton titleWidth="w-40" descWidth="w-48" actionType="none" />
                        <SettingRowSkeleton titleWidth="w-36" descWidth="w-52" actionType="none" />
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Usage' || activeTab === 'Analytics') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-[18px] w-20 bg-white/[0.06]" />
                        <Skeleton className="h-8 w-24 rounded-lg bg-white/[0.04]" />
                    </div>
                    <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-4 w-24 bg-white/[0.06]" />
                                    <Skeleton className="h-4 w-32 bg-white/[0.04]" />
                                </div>
                                <Skeleton className="h-4 w-16 bg-white/[0.04]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Privacy' || activeTab === 'Terms') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
                <div className="flex flex-col mb-8">
                    <Skeleton className="h-[18px] w-36 mb-4 bg-white/[0.06]" />
                    <div className="flex flex-col gap-3 border-t border-[#242323] pt-5">
                        <Skeleton className="h-3.5 w-full bg-white/[0.04]" />
                        <Skeleton className="h-3.5 w-11/12 bg-white/[0.04]" />
                        <Skeleton className="h-3.5 w-4/5 bg-white/[0.04]" />
                        <Skeleton className="h-3.5 w-full bg-white/[0.04]" />
                        <Skeleton className="h-3.5 w-3/4 bg-white/[0.04]" />
                    </div>
                </div>
            </div>
        )
    }

    // Default Account Skeleton
    return (
        <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150">
            {/* Account section */}
            <div className="flex flex-col mb-8">
                <Skeleton className="h-[18px] w-24 mb-4 bg-white/[0.06]" />
                <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                    <SettingRowSkeleton titleWidth="w-28" descWidth="w-48" actionType="button" />
                    <SettingRowSkeleton titleWidth="w-32" descWidth="w-40" actionType="button" />
                    <SettingRowSkeleton titleWidth="w-24" descWidth="w-56" actionType="none" />
                </div>
            </div>

            {/* Notifications section */}
            <div className="flex flex-col mb-8">
                <Skeleton className="h-[18px] w-28 mb-4 bg-white/[0.06]" />
                <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                    <SettingRowSkeleton titleWidth="w-40" descWidth="w-64" actionType="toggle" />
                    <SettingRowSkeleton titleWidth="w-36" descWidth="w-52" actionType="toggle" />
                </div>
            </div>

            {/* Danger zone / System section */}
            <div className="flex flex-col mb-8">
                <Skeleton className="h-[18px] w-20 mb-4 bg-white/[0.06]" />
                <div className="flex flex-col border-t border-[#242323] pt-4 divide-y divide-[#242323]/50">
                    <SettingRowSkeleton titleWidth="w-36" descWidth="w-60" actionType="button" />
                    <SettingRowSkeleton titleWidth="w-32" descWidth="w-52" actionType="button" />
                </div>
            </div>
        </div>
    )
}
