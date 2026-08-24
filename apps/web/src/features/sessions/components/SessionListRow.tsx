import React, { useState, useEffect, useRef } from 'react'

import { SessionPrTooltip } from './SessionPrTooltip'

import { Icons } from '@/shared/components/ui/Icons'
import { Tooltip } from '@/shared/components/ui/Tooltip'

interface SessionListRowProps {
    project: any // actually a backendsession
    isMenuOpen: boolean
    isTogglePending: boolean
    onOpenProject: (id: string) => void
    onToggleStar: (id: string, event: React.MouseEvent) => void
    onToggleMenu: (id: string, event: React.MouseEvent) => void
    onOpenProjectFromMenu: (id: string, event: React.MouseEvent) => void
    onToggleStarFromMenu: (session: any, event: React.MouseEvent) => void
    onToggleArchiveFromMenu: (session: any, event: React.MouseEvent) => void
    onOpenRename: (session: any, event: React.MouseEvent) => void
    onOpenShare: (session: any, event: React.MouseEvent) => void
    onOpenDelete: (session: any, event: React.MouseEvent) => void
    onOpenTags: (session: any, event: React.MouseEvent) => void
    onOpenInsights: (session: any, event: React.MouseEvent) => void
}

export const SessionListRow: React.FC<SessionListRowProps> = ({
    project,
    isMenuOpen,
    isTogglePending,
    onOpenProject,
    onToggleStar,
    onToggleMenu,
    onOpenProjectFromMenu,
    onToggleStarFromMenu,
    onToggleArchiveFromMenu,
    onOpenRename,
    onOpenShare,
    onOpenDelete,
    onOpenTags,
    onOpenInsights,
}) => {
    const [menuDirection, setMenuDirection] = useState<'down' | 'up'>('down')
    const session = project // alias for clarity
    const mobileMenuRef = useRef<HTMLDivElement>(null)
    const desktopMenuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isMenuOpen) return

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            const isInsideMobile = mobileMenuRef.current?.contains(target)
            const isInsideDesktop = desktopMenuRef.current?.contains(target)
            if (!isInsideMobile && !isInsideDesktop) {
                onToggleMenu(session.id, event as any)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isMenuOpen, session.id, onToggleMenu])

    const updatedDate = new Date(session.updatedAt || session.createdAt)
    const createdDate = new Date(session.createdAt)
    const formatDate = (d: Date) =>
        d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        })

    const formatTooltipDate = (dInput: string | Date, prefix: 'Created' | 'Updated') => {
        const d = new Date(dInput)
        if (isNaN(d.getTime())) return `${prefix} on Unknown`
        const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
        const month = d.toLocaleDateString('en-US', { month: 'long' })
        const day = d.getDate()
        const year = d.getFullYear()
        const time = d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
        return `${prefix} on ${weekday}, ${month} ${day}, ${year} at ${time}`
    }

    return (
        <>
            {/* Mobile View (< md): seamless row matching desktop feel */}
            <div
                className={`md:hidden relative flex flex-col px-2.5 py-2.5 rounded-lg border border-transparent transition-all duration-200 hover:bg-[#191919] active:bg-[#191919] cursor-pointer gap-1 ${
                    session.isArchived && !isMenuOpen
                        ? 'opacity-60 hover:opacity-100'
                        : 'opacity-100'
                }`}
                style={{ zIndex: isMenuOpen ? 50 : undefined }}
                onClick={() => onOpenProject(session.id)}
            >
                {/* Top row: Title + 3-dots Menu */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="truncate text-[14px] font-medium text-[#D6D5C9] transition-colors hover:text-white">
                            {session.title || 'Untitled Session'}
                        </span>
                        {session.isArchived && (
                            <span className="flex items-center justify-center rounded bg-[#242323] p-1 shrink-0">
                                <Icons.Archive className="h-3 w-3 text-[#7B7A79]" />
                            </span>
                        )}
                    </div>

                    {/* 3-dots menu button */}
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                if (window.innerHeight - rect.bottom < 300 && rect.top > 300) {
                                    setMenuDirection('up')
                                } else {
                                    setMenuDirection('down')
                                }
                                onToggleMenu(session.id, e)
                            }}
                            className={`rounded-lg p-1.5 text-[#7B7A79] transition-all hover:bg-[#242323] hover:text-[#D6D5C9] ${
                                isMenuOpen ? 'bg-[#242323] text-[#D6D5C9]' : ''
                            }`}
                            aria-label="Session options"
                        >
                            <Icons.MoreHorizontal className="h-4 w-4" />
                        </button>
                        {isMenuOpen && (
                            <div
                                ref={mobileMenuRef}
                                className={`absolute right-0 ${
                                    menuDirection === 'up' ? 'bottom-8' : 'top-8'
                                } z-50 flex w-44 flex-col rounded-xl border border-[#272727] bg-[#1E1E1E] p-1 shadow-xl`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={(e) => onOpenProjectFromMenu(session.id, e)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                                >
                                    <Icons.ExternalLink className="h-3.5 w-3.5 text-[#7B7A79]" />{' '}
                                    Open
                                </button>
                                <button
                                    onClick={(e) => onOpenRename(session, e)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                                >
                                    <Icons.Edit className="h-3.5 w-3.5 text-[#7B7A79]" /> Rename
                                </button>
                                <button
                                    onClick={(e) => onOpenTags(session, e)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                                >
                                    <Icons.Tag className="h-3.5 w-3.5 text-[#7B7A79]" /> Tags
                                </button>
                                <button
                                    onClick={(e) => onOpenInsights(session, e)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                                >
                                    <Icons.LineChart className="h-3.5 w-3.5 text-[#7B7A79]" />{' '}
                                    Insights
                                </button>
                                <button
                                    onClick={(e) => onToggleArchiveFromMenu(session, e)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                                >
                                    <Icons.Archive className="h-3.5 w-3.5 text-[#7B7A79]" />{' '}
                                    {session.isArchived ? 'Unarchive' : 'Archive'}
                                </button>
                                <div className="mx-1.5 my-1 h-[1px] bg-[#282828]" />
                                <button
                                    onClick={(e) => onOpenDelete(session, e)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-red-400 transition-colors hover:bg-[#262626] hover:text-red-300"
                                >
                                    <Icons.Trash className="h-3.5 w-3.5" /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subtitle message preview */}
                <span className="truncate text-[12px] text-[#7B7A79] transition-colors">
                    {session.lastMessage || 'No messages yet...'}
                </span>

                {/* Metadata row: Date, creator, tags, PR */}
                <div className="flex items-center justify-between text-[11.5px] text-[#7B7A79] pt-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <span>{formatDate(updatedDate)}</span>
                        {session.createdBy && (
                            <span className="truncate max-w-[100px] text-[#555]">
                                by {session.createdBy}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {session.tags && session.tags.length > 0 && (
                            <span className="truncate rounded-md bg-[#202020] px-1.5 py-0.5 font-medium text-[#949494]">
                                {session.tags[0]}
                            </span>
                        )}
                        {session.prNumber && <SessionPrTooltip session={session} />}
                    </div>
                </div>
            </div>

            {/* Desktop Grid View (>= md) */}
            <div
                className={`hidden md:grid group relative cursor-pointer grid-cols-[minmax(0,2fr)_minmax(100px,auto)_minmax(100px,auto)_minmax(150px,1fr)_minmax(100px,auto)_2.5rem] items-center gap-3 rounded-lg border pl-1 pr-5 py-2 transition-all duration-200 hover:bg-[#191919] ${
                    session.isArchived && !isMenuOpen
                        ? 'opacity-60 border-transparent hover:opacity-100'
                        : 'border-transparent opacity-100'
                }`}
                style={{ zIndex: isMenuOpen ? 50 : undefined }}
                onClick={() => onOpenProject(session.id)}
            >
                {/* name */}
                <div className="flex flex-1 items-center gap-3 min-w-0">
                    <div className="flex flex-1 flex-col min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <span
                                onDoubleClick={(e) => {
                                    e.stopPropagation()
                                    onOpenRename(session, e)
                                }}
                                className="truncate text-[14px] font-medium text-[#D6D5C9] transition-colors hover:text-white"
                                title="Double-click to rename"
                            >
                                {session.title || 'Untitled Session'}
                            </span>
                            {session.isArchived && (
                                <Tooltip position="top" content="This session is archived">
                                    <span className="flex items-center justify-center rounded bg-[#242323] p-1">
                                        <Icons.Archive className="h-3 w-3 text-[#7B7A79]" />
                                    </span>
                                </Tooltip>
                            )}
                        </div>
                        <span className="truncate text-[12px] text-[#7B7A79] transition-colors">
                            {session.lastMessage || 'No messages yet...'}
                        </span>
                    </div>
                </div>

                {/* created at */}
                <Tooltip position="top" content={formatTooltipDate(session.createdAt, 'Created')}>
                    <div className="truncate pr-2 text-[13px] text-[#7B7A79] transition-colors group-hover:text-[#A3A2A0]">
                        {formatDate(createdDate)}
                    </div>
                </Tooltip>

                {/* updated at */}
                <Tooltip
                    position="top"
                    content={formatTooltipDate(session.updatedAt || session.createdAt, 'Updated')}
                >
                    <div className="truncate pr-2 text-[13px] text-[#7B7A79] transition-colors group-hover:text-[#A3A2A0]">
                        {formatDate(updatedDate)}
                    </div>
                </Tooltip>

                {/* tags & pr */}
                <div className="flex items-center gap-2 min-w-0">
                    {session.tags && session.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Tooltip position="top" content={`Tags: ${session.tags[0]}`}>
                                <span
                                    onDoubleClick={(e) => {
                                        e.stopPropagation()
                                        onOpenTags(session, e)
                                    }}
                                    className="truncate rounded-md bg-[#202020] hover:bg-[#272727] transition-colors px-2 py-0.5 text-[11px] font-medium text-[#949494] cursor-pointer hover:text-white"
                                    title="Double-click to edit tag"
                                >
                                    {session.tags[0]}
                                </span>
                            </Tooltip>
                        </div>
                    )}
                    {session.prNumber && <SessionPrTooltip session={session} />}
                </div>

                {/* created by */}
                <Tooltip
                    position="top"
                    content={`Created by: ${session.createdByName || session.createdBy || 'User'}`}
                >
                    <div className="truncate text-[13px] text-[#7B7A79] transition-colors group-hover:text-[#A3A2A0]">
                        {session.createdBy || '--'}
                    </div>
                </Tooltip>

                {/* menu */}
                <div
                    className={`relative flex justify-center ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}
                >
                    <Tooltip position="top" content="More options">
                        <button
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                if (window.innerHeight - rect.bottom < 300 && rect.top > 300) {
                                    setMenuDirection('up')
                                } else {
                                    setMenuDirection('down')
                                }
                                onToggleMenu(session.id, e)
                            }}
                            className={`rounded-lg p-2 text-[#7B7A79] transition-all hover:bg-[#242323] hover:text-[#D6D5C9] ${isMenuOpen ? 'bg-[#242323] text-[#D6D5C9]' : ''}`}
                        >
                            <Icons.MoreHorizontal className="h-4 w-4" />
                        </button>
                    </Tooltip>
                    {isMenuOpen && (
                        <div
                            ref={desktopMenuRef}
                            className={`absolute right-0 ${menuDirection === 'up' ? 'bottom-9' : 'top-9'} z-50 flex w-44 flex-col rounded-xl border border-[#272727] bg-[#1E1E1E] p-1 shadow-xl`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={(e) => onOpenProjectFromMenu(session.id, e)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                            >
                                <Icons.ExternalLink className="h-3.5 w-3.5 text-[#7B7A79]" /> Open
                            </button>
                            <button
                                onClick={(e) => onOpenRename(session, e)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                            >
                                <Icons.Edit className="h-3.5 w-3.5 text-[#7B7A79]" /> Rename
                            </button>
                            <button
                                onClick={(e) => onOpenTags(session, e)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                            >
                                <Icons.Tag className="h-3.5 w-3.5 text-[#7B7A79]" /> Tags
                            </button>
                            <button
                                onClick={(e) => onOpenInsights(session, e)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                            >
                                <Icons.LineChart className="h-3.5 w-3.5 text-[#7B7A79]" /> Insights
                            </button>
                            <button
                                onClick={(e) => onToggleArchiveFromMenu(session, e)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                            >
                                <Icons.Archive className="h-3.5 w-3.5 text-[#7B7A79]" />{' '}
                                {session.isArchived ? 'Unarchive' : 'Archive'}
                            </button>
                            <div className="mx-1.5 my-1 h-[1px] bg-[#282828]" />
                            <button
                                onClick={(e) => onOpenDelete(session, e)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-red-400 transition-colors hover:bg-[#262626] hover:text-red-300"
                            >
                                <Icons.Trash className="h-3.5 w-3.5" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
