import { useQuery } from '@tanstack/react-query'
import { Inbox, Copy, Check } from 'lucide-react'
import React, { useState, useRef } from 'react'

import sidebarPng from '../../../../assets/sidebar.png'

import { NotificationsPopover } from './NotificationsPopover'

import type { SidebarFooterProps } from '@/features/navigation/types'

import { useBillingOverview } from '@/features/billing/hooks/useBillingData'
import { notificationAPI } from '@/features/notification/api/notification'
import { profileAPI } from '@/features/profile/api/profile'
import { Icons } from '@/shared/components/ui/Icons'
import { cn } from '@/shared/lib/utils'

export const SidebarFooter: React.FC<
    SidebarFooterProps & { user?: { name?: string }; onSignOut?: () => void }
> = ({ isAuthenticated, isCollapsed, onProfile, onOpenAuth, user, onSignOut }) => {
    const [isNotifPopoverOpen, setIsNotifPopoverOpen] = useState(false)
    const [showCliCard, setShowCliCard] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const anchorRef = useRef<HTMLButtonElement>(null)
    const notifAnchorRef = useRef<HTMLButtonElement>(null)
    const hideTimeoutRef = useRef<any>(null)

    React.useEffect(() => {
        const img = new Image()
        img.src = sidebarPng
    }, [])

    React.useEffect(() => {
        const handler = () => setShowCliCard((prev) => !prev)
        window.addEventListener('open-cli-card', handler)
        return () => window.removeEventListener('open-cli-card', handler)
    }, [])

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const el = document.getElementById('cli-popover-card')
            const btn = document.getElementById('try-cli-btn')
            if (el && !el.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
                setShowCliCard(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const { data: quickInfo } = useQuery({
        queryKey: ['quickinfo'],
        queryFn: profileAPI.getQuickInfo,
        enabled: isAuthenticated,
    })

    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
        enabled: isAuthenticated,
    })

    const { data: unreadData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: notificationAPI.getUnreadCount,
        enabled: isAuthenticated,
        refetchInterval: 30 * 1000,
    })

    const { data: overview } = useBillingOverview(isAuthenticated)
    const isPro = (overview as any)?.plan === 'PRO'
    const hasUnread = (unreadData?.count ?? 0) > 0

    const handleMouseEnter = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current)
            hideTimeoutRef.current = null
        }
        setShowCliCard(true)
    }

    const handleMouseLeave = () => {
        hideTimeoutRef.current = setTimeout(() => {
            setShowCliCard(false)
            hideTimeoutRef.current = null
        }, 300)
    }

    const CLI_INSTALL_COMMANDS: Record<'npm' | 'bun' | 'pnpm', string> = {
        npm: 'npm install -g @trydecember/cli',
        bun: 'bun add -g @trydecember/cli',
        pnpm: 'pnpm add -g @trydecember/cli',
    }

    const [cliMethod, setCliMethod] = useState<'npm' | 'bun' | 'pnpm'>('npm')

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        navigator.clipboard.writeText(CLI_INSTALL_COMMANDS[cliMethod])
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <div className="mt-auto flex flex-col w-full relative">
            <div
                className={cn(
                    'flex justify-center relative',
                    isCollapsed ? 'px-2 py-0 mb-0' : 'px-3 py-1.5 mb-2'
                )}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <button
                    id="try-cli-btn"
                    onClick={() => setShowCliCard(!showCliCard)}
                    className={cn(
                        'upgrade-plan-btn flex items-center justify-center gap-1 rounded-full bg-transparent hover:bg-white/5 transition-colors duration-300 text-[#CBCACA] hover:text-white font-medium outline-none mx-auto cursor-pointer overflow-hidden whitespace-nowrap',
                        isCollapsed ? 'w-[32px] h-[32px] px-0' : 'px-2.5 py-[3px] w-fit text-[11px]'
                    )}
                    style={{
                        border: isCollapsed ? 'none' : '1px solid #383735',
                    }}
                >
                    <span
                        className={cn(
                            isCollapsed ? 'text-[18px]' : 'text-[12px]',
                            'transition-all duration-300'
                        )}
                    >
                        ✱
                    </span>
                    <span
                        className={cn(
                            'transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap',
                            isCollapsed
                                ? 'max-w-0 opacity-0 ml-0'
                                : 'max-w-[120px] opacity-100 ml-1'
                        )}
                    >
                        Try December CLI
                    </span>
                </button>

                {showCliCard && (
                    <div
                        id="cli-popover-card"
                        className="absolute bottom-11 left-3 w-[324px] z-[100] bg-[#1E1E1E] border border-[#2A2928] rounded-2xl shadow-lg shadow-black/40 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="w-full h-[200px] bg-[#1E1E1E] relative overflow-hidden flex items-center justify-center p-1.5 pb-0">
                            <a
                                href="https://www.npmjs.com/package/@trydecember/cli"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-full relative overflow-hidden rounded-lg border border-[#2A2928] block cursor-pointer"
                            >
                                <img
                                    src={sidebarPng}
                                    alt="December CLI preview"
                                    decoding="async"
                                    className="w-full h-full object-cover object-center absolute inset-0"
                                />
                            </a>
                        </div>
                        <div className="flex flex-col px-2.5 pt-2 pb-2.5 bg-[#1E1E1E] gap-2">
                            {/* CLI title and method pills */}
                            <div className="flex items-center justify-between px-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[14px] text-[#CBCACA] select-none leading-none">
                                        ✱
                                    </span>
                                    <span className="text-[12.5px] font-medium text-[#EDEDED] truncate">
                                        December CLI
                                    </span>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                    {(['npm', 'bun', 'pnpm'] as const).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setCliMethod(method)
                                                setIsCopied(false)
                                            }}
                                            className={cn(
                                                'text-[11.5px] transition-colors cursor-pointer outline-none',
                                                cliMethod === method
                                                    ? 'text-white font-medium'
                                                    : 'text-[#7B7A79] hover:text-[#D6D5D4]'
                                            )}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Command box with copy button */}
                            <div className="flex items-center justify-between mx-0.5 px-3 py-1.5 bg-[#1E1E1E] border border-[#2A2928] rounded-lg group/cmd">
                                <div className="flex items-center truncate mr-2">
                                    <span className="text-[#7B7A79] mr-2 text-[11px] font-mono select-none">
                                        $
                                    </span>
                                    <span className="text-[#D6D5C9] text-[11px] font-mono truncate tracking-tight">
                                        {CLI_INSTALL_COMMANDS[cliMethod]}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="text-[#7B7A79] hover:text-[#D6D5C9] transition-colors p-1 rounded-md hover:bg-[#2A2928] outline-none shrink-0 cursor-pointer"
                                    title="Copy command"
                                >
                                    {isCopied ? (
                                        <Check className="w-3.5 h-3.5 text-[#87B2F4]" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isAuthenticated && !isCollapsed && (
                <div className="w-full border-t border-white/[0.04]"></div>
            )}
            <div
                className={cn(
                    'pr-[6px] pb-1.5',
                    isCollapsed ? 'pl-[8px] pt-[2px]' : 'pl-[6px] pt-1'
                )}
            >
                {isAuthenticated && (
                    <>
                        <div
                            className={cn(
                                'flex items-center w-full',
                                isCollapsed ? 'flex-col-reverse gap-[2px]' : 'gap-0 justify-between'
                            )}
                        >
                            <button
                                ref={anchorRef}
                                onClick={() => {
                                    if (onProfile) onProfile()
                                }}
                                className={cn(
                                    'flex items-center justify-center rounded-[10px] hover:bg-[#252525] transition-colors group outline-none min-w-0 relative',
                                    isCollapsed ? 'w-[32px] h-[32px]' : 'gap-2 px-1.5 py-[7px]'
                                )}
                                style={isCollapsed ? {} : { maxWidth: 'calc(100% - 28px)' }}
                            >
                                <div
                                    className={cn(
                                        'flex items-center justify-center rounded-full bg-white/[0.04] text-[#8F8E8D] group-hover:text-[#CBCACA] transition-colors shrink-0',
                                        isCollapsed ? 'w-[26px] h-[26px]' : 'w-[24px] h-[24px]'
                                    )}
                                >
                                    <Icons.UserCircle
                                        className={cn(
                                            'relative -top-[1px]',
                                            isCollapsed ? 'w-[15px] h-[15px]' : 'w-[13px] h-[13px]'
                                        )}
                                    />
                                </div>
                                {!isCollapsed && (
                                    <span className="font-medium text-[13px] text-[#8F8E8D] group-hover:text-[#CBCACA] transition-colors truncate tracking-tight text-left">
                                        {user?.name ||
                                            profile?.name ||
                                            quickInfo?.fullName ||
                                            'Profile'}
                                    </span>
                                )}
                                {isCollapsed && (
                                    <div className="absolute top-1/2 left-[calc(100%+8px)] -translate-y-1/2 z-50 hidden group-hover:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                        <span className="text-[12px] font-medium text-[#EDEDEF]">
                                            Profile
                                        </span>
                                    </div>
                                )}
                            </button>
                            <button
                                ref={notifAnchorRef}
                                onClick={() => setIsNotifPopoverOpen(!isNotifPopoverOpen)}
                                className={cn(
                                    'flex items-center justify-center rounded-[10px] hover:bg-[#252525] text-[#E8E8E8] transition-colors shrink-0 outline-none relative group/notif',
                                    isCollapsed ? 'w-[32px] h-[32px]' : 'w-7 h-7 -ml-1'
                                )}
                            >
                                <Inbox
                                    className={cn(
                                        isCollapsed ? 'w-[15px] h-[15px]' : 'w-[13px] h-[13px]'
                                    )}
                                    strokeWidth={2}
                                />
                                {hasUnread && (
                                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#87B2F4] rounded-full border border-[#141414]" />
                                )}
                                {!isNotifPopoverOpen && (
                                    <div
                                        className={cn(
                                            'absolute z-50 hidden group-hover/notif:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none',
                                            isCollapsed
                                                ? 'top-1/2 left-[calc(100%+8px)] -translate-y-1/2'
                                                : 'bottom-[calc(100%+6px)] left-1/2'
                                        )}
                                    >
                                        <span className="text-[12px] font-medium text-[#EDEDEF]">
                                            Notifications
                                        </span>
                                    </div>
                                )}
                            </button>
                        </div>

                        <NotificationsPopover
                            isOpen={isNotifPopoverOpen}
                            anchorRef={notifAnchorRef}
                            onClose={() => setIsNotifPopoverOpen(false)}
                            onSettings={onProfile}
                        />
                    </>
                )}
            </div>
        </div>
    )
}
