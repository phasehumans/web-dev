import React from 'react'

import { WorkspaceHeaderDevicePicker } from './WorkspaceHeaderDevicePicker'

import type { PreviewDevice } from '@/features/preview/types'

import { cn } from '@/shared/lib/utils'

interface WorkspaceHeaderCenterControlsProps {
    device: PreviewDevice
    setDevice: (device: PreviewDevice) => void
    isSidebarCollapsed: boolean
    onToggleSidebar: () => void
    onOpenNewTab: () => void
    onRefresh?: () => void
}

export const WorkspaceHeaderCenterControls: React.FC<WorkspaceHeaderCenterControlsProps> = ({
    device,
    setDevice,
    isSidebarCollapsed,
    onToggleSidebar,
    onOpenNewTab,
    onRefresh,
}) => {
    return (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="md:hidden flex items-center bg-[#27272A] rounded-full p-1 border border-white/5">
                <button
                    onClick={() => {
                        if (isSidebarCollapsed) onToggleSidebar()
                    }}
                    className={cn(
                        'px-4 py-1.5 rounded-full text-xs font-medium transition-all',
                        !isSidebarCollapsed
                            ? 'bg-[#3F3F46] text-white shadow-sm'
                            : 'text-[#91908F] hover:text-white'
                    )}
                >
                    Chat
                </button>
                <button
                    onClick={() => {
                        if (!isSidebarCollapsed) onToggleSidebar()
                    }}
                    className={cn(
                        'px-4 py-1.5 rounded-full text-xs font-medium transition-all',
                        isSidebarCollapsed
                            ? 'bg-[#3F3F46] text-white shadow-sm'
                            : 'text-[#91908F] hover:text-white'
                    )}
                >
                    Preview
                </button>
            </div>

            <WorkspaceHeaderDevicePicker
                device={device}
                setDevice={setDevice}
                onOpenNewTab={onOpenNewTab}
                onRefresh={onRefresh}
            />
        </div>
    )
}

export const OutputHeaderCenterControls = WorkspaceHeaderCenterControls
