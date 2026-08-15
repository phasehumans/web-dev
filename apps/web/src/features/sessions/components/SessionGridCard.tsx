import React, { useState } from 'react'

import type { ProjectListRowProps } from '@/features/sessions/types'

import { API_BASE_URL } from '@/shared/api/client'
import { Icons } from '@/shared/components/ui/Icons'

export const ProjectGridCard: React.FC<ProjectListRowProps> = ({
    project,
    isMenuOpen,
    isTogglePending,
    onOpenProject,
    onToggleStar,
    onToggleMenu,
    onOpenProjectFromMenu,
    onToggleStarFromMenu,
    onOpenRename,
    onOpenDuplicate,
    onOpenShare,
    onOpenDelete,
}) => {
    const [menuDirection, setMenuDirection] = useState<'down' | 'up'>('down')

    return (
        <div className="group flex flex-col gap-3.5 w-full">
            {/* image container */}
            <div
                className="relative aspect-[16/10] bg-[#111] overflow-hidden rounded-xl border border-[#242323] transition-all duration-300 cursor-pointer"
                onClick={() => onOpenProject(project.id)}
            >
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF9F6] to-[#F3F2EE] select-none p-4 text-center absolute inset-0">
                    <svg
                        className="w-7 h-7 mb-2 text-[#8C8B86] opacity-90 stroke-[1.5]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <span className="text-[12px] font-medium text-[#6B6964] tracking-tight">
                        No preview available
                    </span>
                </div>
                <img
                    src={`${API_BASE_URL}/project/${project.id}/preview.png`}
                    alt={project.title}
                    className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 ease-[0.25,1,0.5,1] group-hover:scale-[1.04]"
                    loading="lazy"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none'
                    }}
                />
                {/* soft bottom gradient for depth */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none opacity-60"></div>
            </div>

            <div className="flex items-start justify-between w-full gap-4 px-1 mt-1">
                {/* left info */}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <h3
                        onDoubleClick={(e) => {
                            e.stopPropagation()
                            onOpenRename?.(project, e)
                        }}
                        className="text-[14px] font-medium text-[#D6D5C9] truncate leading-tight cursor-pointer hover:text-white"
                        title="Double-click to rename"
                    >
                        {project.title}
                    </h3>
                    <p className="text-[12px] text-[#7B7A79] line-clamp-1 leading-snug">
                        {project.description || 'No description provided.'}
                    </p>
                    <div className="flex items-center gap-2 text-[12px] text-[#7B7A79]/80 font-medium mt-0.5">
                        <span className="truncate">@{project.createdByUsername}</span>
                        <span>{project.createdAt}</span>
                    </div>
                </div>

                {/* right actions (star + 3 dots menu) */}
                <div className="flex items-center gap-1 shrink-0 relative">
                    <button
                        onClick={(e) => onToggleStar(project.id, e)}
                        className="rounded-lg p-2 transition-all duration-200 hover:bg-[#242323] focus:outline-none"
                        title={project.isStarred ? 'Unstar' : 'Star'}
                        disabled={isTogglePending}
                    >
                        <Icons.Star
                            className={`h-4 w-4 transition-colors ${project.isStarred ? 'fill-white text-white' : 'text-[#7B7A79] hover:text-[#D6D5C9]'}`}
                        />
                    </button>

                    <div className="relative flex justify-center">
                        <button
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                if (window.innerHeight - rect.bottom < 300 && rect.top > 300) {
                                    setMenuDirection('up')
                                } else {
                                    setMenuDirection('down')
                                }
                                onToggleMenu(project.id, e)
                            }}
                            className={`rounded-lg p-2 text-[#7B7A79] transition-all hover:bg-[#242323] hover:text-[#D6D5C9] ${isMenuOpen ? 'bg-[#242323] text-[#D6D5C9]' : ''}`}
                        >
                            <Icons.MoreHorizontal className="h-4 w-4" />
                        </button>
                        {isMenuOpen && (
                            <div
                                className={`absolute right-0 ${menuDirection === 'up' ? 'bottom-9' : 'top-9'} z-30 flex w-56 flex-col rounded-xl border border-[#383736] bg-[#1E1E1E] p-1.5 shadow-xl`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={(e) => onOpenProjectFromMenu(project.id, e)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                                >
                                    <Icons.ExternalLink className="h-4 w-4 text-[#7B7A79]" /> Open
                                    in new tab
                                </button>
                                <button
                                    onClick={(e) => onOpenRename(project, e)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                                >
                                    <Icons.Edit className="h-4 w-4 text-[#7B7A79]" /> Rename
                                </button>
                                <button
                                    onClick={(e) => onToggleStarFromMenu(project, e)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                                >
                                    <Icons.Star className="h-4 w-4 text-[#7B7A79]" />{' '}
                                    {project.isStarred
                                        ? 'Remove from favourites'
                                        : 'Add to favourites'}
                                </button>
                                <button
                                    onClick={(e) => onOpenShare(project, e)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-[#D6D5C9] transition-colors hover:bg-[#262626]"
                                >
                                    <Icons.Bookmark className="h-4 w-4 text-[#7B7A79]" />{' '}
                                    {project.isSharedAsTemplate
                                        ? 'Unshare template'
                                        : 'Share as template'}
                                </button>
                                <div className="mx-2 my-1.5 h-px bg-[#383736]" />
                                <button
                                    onClick={(e) => onOpenDelete(project, e)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-red-400 transition-colors hover:bg-[#262626] hover:text-red-300"
                                >
                                    <Icons.Trash className="h-4 w-4" /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
