import React from 'react'

import { SidebarNavItem } from './SidebarNavItem'

import { Icons } from '@/shared/components/ui/Icons'

interface MobileSidebarNavProps {
    onClose: () => void
    onNewThread: () => void
    onAllProjects: () => void
    onSessions?: () => void
    onReview?: () => void
    onTemplates: () => void
    onWiki?: () => void
    onProfile?: () => void
    isAuthenticated?: boolean
    onOpenAuth?: () => void
}

export const MobileSidebarNav: React.FC<MobileSidebarNavProps> = ({
    onClose,
    onNewThread,
    onAllProjects,
    onSessions,
    onReview,
    onTemplates,
    onProfile,
    isAuthenticated,
    onOpenAuth,
}) => {
    return (
        <div className="flex flex-col gap-[1px] px-3">
            <SidebarNavItem
                icon={<Icons.Folder className="w-[18px] h-[18px]" />}
                label="Sessions"
                collapsed={false}
                onClick={() => {
                    onAllProjects()
                    onClose()
                }}
            />
            <SidebarNavItem
                icon={<Icons.GitPullRequest className="w-[18px] h-[18px]" />}
                label="Review"
                collapsed={false}
                onClick={() => {
                    onReview?.()
                    onClose()
                }}
            />
            <SidebarNavItem
                icon={<Icons.BookOpen className="w-[18px] h-[18px]" />}
                label="Wiki"
                collapsed={false}
                onClick={() => {
                    onTemplates()
                    onClose()
                }}
            />
            <SidebarNavItem
                icon={<Icons.Settings className="w-[18px] h-[18px]" />}
                label="Settings"
                collapsed={false}
                onClick={() => {
                    onProfile?.()
                    onClose()
                }}
            />
        </div>
    )
}
