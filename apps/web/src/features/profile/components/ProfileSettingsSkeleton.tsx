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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-2 sm:gap-0">
        <div className="flex flex-col gap-1.5 min-w-0 pr-4">
            <Skeleton className={`h-4 ${titleWidth} bg-white/[0.05] rounded`} />
            {descWidth && <Skeleton className={`h-3 ${descWidth} bg-white/[0.03] rounded`} />}
        </div>
        {actionType === 'button' && (
            <Skeleton className="h-7 sm:h-8 w-24 rounded-lg bg-white/[0.03] shrink-0" />
        )}
        {actionType === 'toggle' && (
            <Skeleton className="h-5 w-9 rounded-full bg-white/[0.05] shrink-0" />
        )}
        {actionType === 'badge' && (
            <Skeleton className="h-5 w-16 rounded-md bg-white/[0.03] shrink-0" />
        )}
    </div>
)

export const ProfileSettingsSkeleton: React.FC<ProfileSettingsSkeletonProps> = ({
    activeTab = 'Account',
}) => {
    if (activeTab === 'Preferences' || activeTab === 'General') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150 gap-6">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-28 bg-white/[0.05] rounded mb-1" />
                    <div className="flex flex-col gap-1">
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

                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32 bg-white/[0.05] rounded mb-1" />
                    <div className="flex flex-col gap-1">
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
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150 gap-6">
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-4 w-28 bg-white/[0.05] rounded mb-1" />
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.015]"
                            >
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8 rounded-lg bg-white/[0.03] shrink-0" />
                                    <div className="flex flex-col gap-1.5">
                                        <Skeleton className="h-3.5 w-24 bg-white/[0.05] rounded" />
                                        <Skeleton className="h-3 w-44 bg-white/[0.03] rounded" />
                                    </div>
                                </div>
                                <Skeleton className="h-7 w-20 rounded-lg bg-white/[0.03] shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Repositories') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150 gap-6">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1">
                        <Skeleton className="h-4 w-32 bg-white/[0.05] rounded" />
                        <Skeleton className="h-7 w-28 rounded-lg bg-white/[0.03]" />
                    </div>
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.015]"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <Skeleton className="h-3.5 w-40 bg-white/[0.05] rounded" />
                                    <Skeleton className="h-3 w-56 bg-white/[0.03] rounded" />
                                </div>
                                <Skeleton className="h-5 w-16 rounded-md bg-white/[0.03]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Secrets') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150 gap-6">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1">
                        <Skeleton className="h-4 w-24 bg-white/[0.05] rounded" />
                        <Skeleton className="h-7 w-28 rounded-lg bg-white/[0.03]" />
                    </div>
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.015]"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <Skeleton className="h-3.5 w-32 bg-white/[0.05] rounded" />
                                    <Skeleton className="h-3 w-48 bg-white/[0.03] rounded" />
                                </div>
                                <Skeleton className="h-7 w-16 rounded-lg bg-white/[0.03]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Schedules') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150 gap-6">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1">
                        <Skeleton className="h-4 w-28 bg-white/[0.05] rounded" />
                        <Skeleton className="h-7 w-28 rounded-lg bg-white/[0.03]" />
                    </div>
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.015]"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <Skeleton className="h-3.5 w-40 bg-white/[0.05] rounded" />
                                    <Skeleton className="h-3 w-56 bg-white/[0.03] rounded" />
                                </div>
                                <Skeleton className="h-5 w-16 rounded-md bg-white/[0.03]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Billing') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150 gap-6">
                <div className="p-4 rounded-xl bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-24 bg-white/[0.05] rounded" />
                        <Skeleton className="h-6 w-32 bg-white/[0.05] rounded" />
                    </div>
                    <Skeleton className="h-8 w-28 rounded-lg bg-white/[0.03]" />
                </div>

                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32 bg-white/[0.05] rounded mb-1" />
                    <div className="flex flex-col gap-1">
                        <SettingRowSkeleton titleWidth="w-36" descWidth="w-56" actionType="none" />
                        <SettingRowSkeleton titleWidth="w-40" descWidth="w-48" actionType="none" />
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Usage' || activeTab === 'Analytics') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150 gap-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="p-3 rounded-xl bg-white/[0.02] flex flex-col gap-1.5"
                        >
                            <Skeleton className="h-3 w-16 bg-white/[0.03] rounded" />
                            <Skeleton className="h-5 w-20 bg-white/[0.05] rounded" />
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-28 bg-white/[0.05] rounded mb-1" />
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.015]"
                            >
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-3.5 w-20 bg-white/[0.05] rounded" />
                                    <Skeleton className="h-3 w-28 bg-white/[0.03] rounded" />
                                </div>
                                <Skeleton className="h-3.5 w-14 bg-white/[0.03] rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (activeTab === 'Privacy' || activeTab === 'Terms') {
        return (
            <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150 gap-4">
                <Skeleton className="h-5 w-36 bg-white/[0.05] rounded mb-2" />
                <div className="flex flex-col gap-2.5">
                    <Skeleton className="h-3.5 w-full bg-white/[0.03] rounded" />
                    <Skeleton className="h-3.5 w-11/12 bg-white/[0.03] rounded" />
                    <Skeleton className="h-3.5 w-4/5 bg-white/[0.03] rounded" />
                    <Skeleton className="h-3.5 w-full bg-white/[0.03] rounded" />
                    <Skeleton className="h-3.5 w-3/4 bg-white/[0.03] rounded" />
                </div>
            </div>
        )
    }

    // Default Account Skeleton
    return (
        <div className="flex flex-col w-full max-w-[720px] text-[#D6D5C9] animate-in fade-in duration-150 gap-6">
            <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24 bg-white/[0.05] rounded mb-1" />
                <div className="flex flex-col gap-1">
                    <SettingRowSkeleton titleWidth="w-28" descWidth="w-48" actionType="button" />
                    <SettingRowSkeleton titleWidth="w-32" descWidth="w-40" actionType="button" />
                    <SettingRowSkeleton titleWidth="w-24" descWidth="w-56" actionType="none" />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28 bg-white/[0.05] rounded mb-1" />
                <div className="flex flex-col gap-1">
                    <SettingRowSkeleton titleWidth="w-40" descWidth="w-64" actionType="toggle" />
                    <SettingRowSkeleton titleWidth="w-36" descWidth="w-52" actionType="toggle" />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20 bg-white/[0.05] rounded mb-1" />
                <div className="flex flex-col gap-1">
                    <SettingRowSkeleton titleWidth="w-36" descWidth="w-60" actionType="button" />
                    <SettingRowSkeleton titleWidth="w-32" descWidth="w-52" actionType="button" />
                </div>
            </div>
        </div>
    )
}
