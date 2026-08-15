import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import React, { useState } from 'react'

import { WorkspaceHeaderActions } from './WorkspaceHeaderActions'

import type { WorkspaceHeaderProps } from '@/features/preview/types'

import { useAppStore } from '@/app/store'
import { sessionAPI } from '@/features/sessions/api/session'
import { SessionTagsModal } from '@/features/sessions/components/SessionTagsModal'
import { Tooltip } from '@/shared/components/ui/Tooltip'

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
    isSidebarCollapsed,
    onToggleSidebar,
    isPreviewCollapsed,
    onTogglePreview,
    onBack,
    projectName,
    projectId,
    versions,
    activeVersionId,
    isVersionLoading,
    onSelectVersion,
    onDownload,
    sessionTag,
}) => {
    const queryClient = useQueryClient()
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [titleInput, setTitleInput] = useState('')
    const [isTagModalOpen, setIsTagModalOpen] = useState(false)
    const [isUpdatingTag, setIsUpdatingTag] = useState(false)

    const currentTitle = projectName ? projectName.toLowerCase() : 'new session'

    const startEditingTitle = () => {
        setTitleInput(projectName || 'new session')
        setIsEditingTitle(true)
    }

    const handleSaveTitle = async () => {
        const trimmed = titleInput.trim()
        setIsEditingTitle(false)
        if (!trimmed || trimmed === projectName || !projectId) return

        // 1. Optimistically update store & cache for instant reflection
        useAppStore.getState().setActiveProjectName(trimmed)

        queryClient.setQueryData(['session', projectId], (old: any) =>
            old ? { ...old, title: trimmed } : { id: projectId, title: trimmed }
        )
        queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
            if (!old) return old
            if (Array.isArray(old)) {
                return old.map((s) => (s && s.id === projectId ? { ...s, title: trimmed } : s))
            }
            if (Array.isArray(old.sessions)) {
                return {
                    ...old,
                    sessions: old.sessions.map((s: any) =>
                        s && s.id === projectId ? { ...s, title: trimmed } : s
                    ),
                }
            }
            return old
        })

        try {
            await sessionAPI.renameSession(projectId, trimmed)
        } catch (error) {
            console.error('Failed to rename session', error)
        } finally {
            queryClient.invalidateQueries({ queryKey: ['session', projectId] })
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
        }
    }

    const handleSaveTag = async (tags: string[]) => {
        if (!projectId) return
        setIsUpdatingTag(true)

        // Optimistically update React Query cache immediately
        queryClient.setQueryData(['session', projectId], (old: any) =>
            old ? { ...old, tags } : { id: projectId, tags }
        )
        queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
            if (!old) return old
            if (Array.isArray(old)) {
                return old.map((s) => (s && s.id === projectId ? { ...s, tags } : s))
            }
            if (Array.isArray(old.sessions)) {
                return {
                    ...old,
                    sessions: old.sessions.map((s: any) =>
                        s && s.id === projectId ? { ...s, tags } : s
                    ),
                }
            }
            return old
        })
        setIsTagModalOpen(false)

        try {
            await sessionAPI.updateSessionTags(projectId, tags)
        } catch (error) {
            console.error('Failed to update session tags', error)
        } finally {
            setIsUpdatingTag(false)
            queryClient.invalidateQueries({ queryKey: ['session', projectId] })
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
        }
    }

    return (
        <header className="h-11 flex items-center justify-between px-3.5 bg-[#141414] border-b border-[#222225] shrink-0 z-[45] gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0">
                {onBack && (
                    <Tooltip content="Back to home" position="bottom" align="start">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onBack()
                            }}
                            className="p-1 rounded-md text-[#91908F] hover:text-white hover:bg-white/5 transition-colors shrink-0 outline-none cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                    </Tooltip>
                )}

                {isEditingTitle ? (
                    <input
                        type="text"
                        autoFocus
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle()
                            if (e.key === 'Escape') setIsEditingTitle(false)
                        }}
                        onBlur={handleSaveTitle}
                        className="text-[13px] font-normal text-white bg-[#141414] border border-[#87B2F4] rounded-md px-2 py-0.5 outline-none ring-2 ring-[#87B2F4]/30 max-w-[280px] sm:max-w-[400px] shadow-sm selection:bg-[#87B2F4] selection:text-black"
                    />
                ) : (
                    <Tooltip content="Double-click to rename" position="bottom" align="start">
                        <span
                            onDoubleClick={startEditingTitle}
                            className="text-[13px] font-normal lowercase text-[#D6D5D4] hover:text-white hover:bg-[#222225] px-2 py-1 rounded-md transition-colors cursor-pointer truncate max-w-[280px] sm:max-w-[400px] tracking-tight select-none block"
                        >
                            {currentTitle}
                        </span>
                    </Tooltip>
                )}

                {sessionTag ? (
                    <Tooltip content="Double-click to edit tag" position="bottom">
                        <span
                            onDoubleClick={() => setIsTagModalOpen(true)}
                            className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium text-[#949494] bg-[#262626] border-none shrink-0 select-none cursor-pointer hover:text-white hover:bg-[#303030] transition-colors"
                        >
                            {sessionTag}
                        </span>
                    </Tooltip>
                ) : (
                    <Tooltip content="Add tag" position="bottom">
                        <button
                            type="button"
                            onClick={() => setIsTagModalOpen(true)}
                            className="text-[11px] font-mono font-medium text-[#71717A] hover:text-[#949494] hover:bg-[#222225] px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                        >
                            + tag
                        </button>
                    </Tooltip>
                )}
            </div>

            <WorkspaceHeaderActions
                projectName={projectName}
                projectId={projectId}
                versions={versions}
                activeVersionId={activeVersionId}
                isVersionLoading={isVersionLoading}
                onSelectVersion={onSelectVersion}
                onDownload={onDownload}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={onToggleSidebar}
                isPreviewCollapsed={isPreviewCollapsed}
                onTogglePreview={onTogglePreview}
                onStartRename={startEditingTitle}
                onOpenTagsModal={() => setIsTagModalOpen(true)}
            />

            {/* Session Tag Management Modal */}
            <SessionTagsModal
                isOpen={isTagModalOpen}
                session={{
                    id: projectId,
                    title: projectName,
                    tags: sessionTag ? [sessionTag] : [],
                }}
                isPending={isUpdatingTag}
                onClose={() => setIsTagModalOpen(false)}
                onSave={handleSaveTag}
            />
        </header>
    )
}

export const OutputHeader = WorkspaceHeader
