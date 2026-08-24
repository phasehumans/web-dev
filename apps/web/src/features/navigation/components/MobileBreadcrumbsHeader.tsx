import React from 'react'
import { useNavigate } from 'react-router-dom'

import { useAppStore } from '@/app/store'
import { Icons } from '@/shared/components/ui/Icons'
import { cn } from '@/shared/lib/utils'

export interface BreadcrumbItem {
    label: string
    onClick?: () => void
    isLast?: boolean
}

export interface MobileBreadcrumbsHeaderProps {
    currentPage?: string
    items?: BreadcrumbItem[]
    onOpenSidebar?: () => void
    onHomeClick?: () => void
    className?: string
    children?: React.ReactNode
}

export const MobileBreadcrumbsHeader: React.FC<MobileBreadcrumbsHeaderProps> = ({
    currentPage,
    items,
    onOpenSidebar,
    onHomeClick,
    className,
    children,
}) => {
    const navigate = useNavigate()
    const setIsMobileSidebarOpen = useAppStore((state) => state.setIsMobileSidebarOpen)

    const handleToggleSidebar = onOpenSidebar || (() => setIsMobileSidebarOpen(true))

    const handleGoHome = () => {
        if (onHomeClick) {
            onHomeClick()
        } else if (navigate) {
            navigate('/')
        }
    }

    return (
        <div
            className={cn(
                'md:hidden sticky top-0 z-30 flex items-center justify-between px-3.5 py-3 bg-[#141414]/95 backdrop-blur-md border-b border-[#242323]/50 shrink-0 select-none',
                className
            )}
        >
            <div className="flex items-center gap-2 text-[13px] font-medium min-w-0">
                <button
                    type="button"
                    onClick={handleToggleSidebar}
                    className="p-1 -ml-1 text-[#8F8E8D] hover:text-[#D6D5D4] hover:bg-[#252525] rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer outline-none"
                    aria-label="Open sidebar"
                >
                    <Icons.SidebarToggle className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={handleGoHome}
                    className="text-[#7B7A79] hover:text-[#D6D5D4] transition-colors cursor-pointer shrink-0 outline-none"
                >
                    <span>Home</span>
                </button>

                {currentPage && (
                    <>
                        <span className="text-[#4A4948] select-none shrink-0">/</span>
                        <span className="text-white font-medium truncate">{currentPage}</span>
                    </>
                )}

                {items &&
                    items.map((item, index) => (
                        <React.Fragment key={`${item.label}-${index}`}>
                            <span className="text-[#4A4948] select-none shrink-0">/</span>
                            {item.isLast ? (
                                <span className="text-white font-medium truncate">
                                    {item.label}
                                </span>
                            ) : item.onClick ? (
                                <button
                                    type="button"
                                    onClick={item.onClick}
                                    className="text-[#7B7A79] hover:text-[#D6D5D4] transition-colors cursor-pointer shrink-0 outline-none truncate"
                                >
                                    {item.label}
                                </button>
                            ) : (
                                <span className="text-[#7B7A79] truncate">{item.label}</span>
                            )}
                        </React.Fragment>
                    ))}
            </div>

            {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
        </div>
    )
}
