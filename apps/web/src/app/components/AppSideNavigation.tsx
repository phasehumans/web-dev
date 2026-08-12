import React, { useState, useEffect, useRef } from 'react'

import type { ViewState } from '@/app/types'

import { MobileSidebar } from '@/features/navigation/components/MobileSidebar'
import Sidebar from '@/features/navigation/components/Sidebar'
import { Icons } from '@/shared/components/ui/Icons'

interface AppSideNavigationProps {
    showSidebar: boolean
    isMobileSidebarOpen: boolean
    setIsMobileSidebarOpen: (isOpen: boolean) => void
    onNewThread: () => void
    onNavigate: (target: ViewState) => void
    onOpenProject: (projectId: string) => void
    isAuthenticated: boolean
    onOpenAuth: () => void
    onSignOut?: () => void
    onHomeClick?: () => void
    isWorkspaceScreen?: boolean
}

export const AppSideNavigation: React.FC<AppSideNavigationProps> = ({
    showSidebar,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    onNewThread,
    onNavigate,
    onOpenProject,
    isAuthenticated,
    onOpenAuth,
    onSignOut,
    onHomeClick,
    isWorkspaceScreen = false,
}) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isWorkspaceScreen)
    const prevIsWorkspaceRef = useRef(isWorkspaceScreen)

    useEffect(() => {
        if (isWorkspaceScreen && !prevIsWorkspaceRef.current) {
            setIsSidebarCollapsed(true)
        } else if (!isWorkspaceScreen && prevIsWorkspaceRef.current) {
            setIsSidebarCollapsed(false)
        }
        prevIsWorkspaceRef.current = isWorkspaceScreen
    }, [isWorkspaceScreen])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '.') {
                e.preventDefault()
                setIsSidebarCollapsed((prev) => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    if (!showSidebar) {
        return null
    }

    return (
        <>
            <Sidebar
                onNewThread={onNewThread}
                onSessions={() => onNavigate('sessions')}
                onReview={() => onNavigate('review')}
                onTemplates={() => onNavigate('templates')}
                onDocs={() => onNavigate('docs')}
                onProfile={() => onNavigate('profile')}
                onOpenProject={onOpenProject}
                isAuthenticated={isAuthenticated}
                onOpenAuth={onOpenAuth}
                onSignOut={onSignOut}
                onHomeClick={onHomeClick}
                onCollapse={() => setIsSidebarCollapsed(true)}
                isCollapsed={isSidebarCollapsed}
                onExpand={() => setIsSidebarCollapsed(false)}
            />

            <div className="md:hidden fixed top-4 left-4 z-50">
                <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="p-1.5 text-[#8F8E8D] hover:text-[#D4D4D8] transition-colors"
                >
                    <Icons.SidebarToggle className="w-[18px] h-[18px]" />
                </button>
            </div>

            <MobileSidebar
                isOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
                onNewThread={onNewThread}
                onSessions={() => onNavigate('sessions')}
                onReview={() => onNavigate('review')}
                onAllProjects={() => onNavigate('all-projects')}
                onTemplates={() => onNavigate('templates')}
                onDocs={() => onNavigate('docs')}
                onProfile={() => onNavigate('profile')}
                onOpenProject={onOpenProject}
                isAuthenticated={isAuthenticated}
                onOpenAuth={onOpenAuth}
                onSignOut={onSignOut}
            />
        </>
    )
}
