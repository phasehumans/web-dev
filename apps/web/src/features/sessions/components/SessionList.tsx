import React, { useEffect, useState, useMemo } from 'react'

import { useSessionListMutations } from '../hooks/useSessionListMutations'
import { useSessions } from '../hooks/useSessions'

import { type SessionFilterState, DEFAULT_FILTERS } from './SessionFilterDropdown'
import { SessionListModals } from './SessionListModals'
import { SessionListView } from './SessionListView'

import type { DeleteModalState, RenameModalState } from '@/features/sessions/types'

import { SettingsBigModal } from '@/features/preview/components/settings/SettingsBigModal'

export type SortOption = 'newest' | 'oldest'
export type TypeFilter = 'any' | 'WEB' | 'CLI' | 'SEARCH'

export const SessionList: React.FC<{
    onNewProject: () => void
    onOpenProject: (projectId: string) => void
}> = ({ onNewProject, onOpenProject }) => {
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortOption, setSortOption] = useState<SortOption>('newest')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('any')
    const [advancedFilters, setAdvancedFilters] = useState<SessionFilterState>(DEFAULT_FILTERS)

    const queryFilters = useMemo(() => {
        return {
            search: searchQuery.trim() || undefined,
            type: typeFilter !== 'any' ? typeFilter : undefined,
            sortBy: 'updatedAt' as const,
            sortOrder: sortOption === 'newest' ? 'desc' : 'asc',
            isArchived:
                advancedFilters?.archived === 'only'
                    ? true
                    : advancedFilters?.archived === 'exclude'
                      ? false
                      : undefined,
            tags: advancedFilters?.tags?.length ? advancedFilters.tags : undefined,
        }
    }, [searchQuery, typeFilter, sortOption, advancedFilters])

    const { data, isLoading, isFetching, error } = useSessions(queryFilters)
    const sessions = data?.sessions || []
    const errorMessage = error instanceof Error ? error.message : null
    const [renameModal, setRenameModal] = useState<RenameModalState>({
        isOpen: false,
        project: null,
        value: '',
    })
    const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
        isOpen: false,
        project: null,
    })
    const [openConfirmModal, setOpenConfirmModal] = useState<{
        isOpen: boolean
        project: any | null
    }>({
        isOpen: false,
        project: null,
    })
    const [tagsModal, setTagsModal] = useState<{
        isOpen: boolean
        project: any | null
    }>({
        isOpen: false,
        project: null,
    })
    const [insightsModal, setInsightsModal] = useState<{
        isOpen: boolean
        project: any | null
    }>({
        isOpen: false,
        project: null,
    })
    const [settingsModal, setSettingsModal] = useState<{
        isOpen: boolean
        project: any | null
    }>({
        isOpen: false,
        project: null,
    })
    const [actionError, setActionError] = useState<string | null>(null)
    const isInitialLoading = isLoading && sessions.length === 0

    useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null)
        if (menuOpenId) window.addEventListener('click', handleClickOutside)
        return () => window.removeEventListener('click', handleClickOutside)
    }, [menuOpenId])

    const {
        togglePinMutation,
        toggleArchiveMutation,
        renameMutation,
        deleteMutation,
        updateTagsMutation,
    } = useSessionListMutations({
        setActionError,
        onRenameMutate: () => setRenameModal({ isOpen: false, project: null, value: '' }),
        onDeleteMutate: () => setDeleteModal({ isOpen: false, project: null }),
    })

    // collect all unique tags from sessions for the tag filter
    const availableTags = useMemo(() => {
        const tagSet = new Set<string>()
        sessions.forEach((s) => {
            if (s.tags) s.tags.forEach((t) => tagSet.add(t))
        })
        return Array.from(tagSet).sort()
    }, [sessions])

    const filteredAndSortedSessions = useMemo(() => {
        let result = [...sessions]

        // search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim()
            result = result.filter(
                (session) =>
                    (session.title || '').toLowerCase().includes(query) ||
                    (session.projectName || '').toLowerCase().includes(query) ||
                    (session.lastMessage || '').toLowerCase().includes(query)
            )
        }

        // advanced filter: type (multi-select)
        if (advancedFilters.types.length > 0) {
            result = result.filter((session) => advancedFilters.types.includes(session.type))
        }

        // advanced filter: archived status
        if (advancedFilters.archivedStatus === 'archived') {
            result = result.filter((session) => session.isArchived === true)
        } else if (advancedFilters.archivedStatus === 'not_archived') {
            result = result.filter((session) => !session.isArchived)
        }

        // advanced filter: pinned status
        if (advancedFilters.pinnedStatus === 'pinned') {
            result = result.filter((session) => session.isPinned === true)
        } else if (advancedFilters.pinnedStatus === 'not_pinned') {
            result = result.filter((session) => !session.isPinned)
        }

        // advanced filter: tags
        if (advancedFilters.tags.length > 0) {
            result = result.filter((session) =>
                advancedFilters.tags.some((tag) => session.tags?.includes(tag))
            )
        }

        // sort
        result.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt).getTime()
            const dateB = new Date(b.updatedAt || b.createdAt).getTime()
            return sortOption === 'newest' ? dateB - dateA : dateA - dateB
        })

        return result
    }, [sessions, searchQuery, advancedFilters, sortOption])

    const toggleStar = (id: string, event: React.MouseEvent) => {
        event.stopPropagation()
        const session = sessions.find((item) => item.id === id)
        if (!session) return
        togglePinMutation.mutate({ sessionId: id, isPinned: !session.isPinned })
    }

    const toggleMenu = (id: string, event: React.MouseEvent) => {
        event.stopPropagation()
        setMenuOpenId((prev) => (prev === id ? null : id))
    }

    const openProjectFromMenu = (id: string, event: React.MouseEvent) => {
        event.stopPropagation()
        setMenuOpenId(null)
        handleOpenProjectClick(id)
    }

    const toggleStarFromMenu = (session: any, event: React.MouseEvent) => {
        event.stopPropagation()
        setMenuOpenId(null)
        togglePinMutation.mutate({ sessionId: session.id, isPinned: !session.isPinned })
    }

    const toggleArchiveFromMenu = (session: any, event: React.MouseEvent) => {
        event.stopPropagation()
        setMenuOpenId(null)
        toggleArchiveMutation.mutate({ sessionId: session.id, isArchived: !session.isArchived })
    }

    const openModal = (event: React.MouseEvent, setter: () => void) => {
        event.stopPropagation()
        setter()
        setMenuOpenId(null)
    }

    const openRenameModal = (session: any, event: React.MouseEvent) =>
        openModal(event, () =>
            setRenameModal({ isOpen: true, project: session, value: session.title || '' })
        )

    const openDeleteModal = (session: any, event: React.MouseEvent) =>
        openModal(event, () => setDeleteModal({ isOpen: true, project: session }))

    const openSettingsModal = (session: any, event: React.MouseEvent) =>
        openModal(event, () => setSettingsModal({ isOpen: true, project: session }))

    const openTagsModal = (session: any, event: React.MouseEvent) =>
        openModal(event, () => setTagsModal({ isOpen: true, project: session }))

    const openInsightsModal = (session: any, event: React.MouseEvent) =>
        openModal(event, () => setInsightsModal({ isOpen: true, project: session }))

    const handleSaveTags = (tags: string[]) => {
        if (!tagsModal.project) return
        updateTagsMutation.mutate(
            { sessionId: tagsModal.project.id, tags },
            {
                onSuccess: () => {
                    setTagsModal({ isOpen: false, project: null })
                },
            }
        )
    }

    const handleRename = (event: React.FormEvent) => {
        event.preventDefault()
        if (!renameModal.project || !renameModal.value.trim()) return
        renameMutation.mutate({
            sessionId: renameModal.project.id,
            rename: renameModal.value.trim(),
        })
    }

    const handleDelete = () => {
        if (!deleteModal.project) return
        deleteMutation.mutate(deleteModal.project.id)
    }

    const handleOpenProjectClick = (id: string) => {
        const session = sessions.find((p) => p.id === id)
        if (session && session.projectId) {
            setOpenConfirmModal({
                isOpen: true,
                project: session,
            })
        } else {
            onOpenProject(id)
        }
    }

    const handleOpenConfirm = () => {
        if (openConfirmModal.project) {
            onOpenProject(openConfirmModal.project.projectId || openConfirmModal.project.id)
            setOpenConfirmModal({ isOpen: false, project: null })
        }
    }

    // dummy state for share modal
    const shareModal = { isOpen: false, project: null }

    return (
        <div className="relative h-full w-full flex-1 overflow-y-auto bg-background px-8 pb-8 pt-20 font-sans no-scrollbar md:p-16">
            <div className="relative z-10 mx-auto max-w-6xl">
                <SessionListView
                    projects={filteredAndSortedSessions}
                    onNewProject={onNewProject}
                    onOpenProject={handleOpenProjectClick}
                    isInitialLoading={isInitialLoading}
                    isFetching={isFetching}
                    errorMessage={errorMessage}
                    actionError={actionError}
                    menuOpenId={menuOpenId}
                    isTogglePending={togglePinMutation.isPending}
                    onToggleStar={toggleStar}
                    onToggleMenu={toggleMenu}
                    onOpenProjectFromMenu={openProjectFromMenu}
                    onToggleStarFromMenu={toggleStarFromMenu}
                    onToggleArchiveFromMenu={toggleArchiveFromMenu}
                    onOpenRename={openRenameModal}
                    onOpenShare={() => {}}
                    onOpenDelete={openDeleteModal}
                    onOpenSettings={openSettingsModal}
                    onOpenTags={openTagsModal}
                    onOpenInsights={openInsightsModal}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    typeFilter={typeFilter}
                    onTypeFilterChange={setTypeFilter}
                    advancedFilters={advancedFilters}
                    onAdvancedFiltersChange={setAdvancedFilters}
                    availableTags={availableTags}
                    hasUnfilteredProjects={sessions.length > 0}
                />
            </div>

            <SessionListModals
                renameModal={renameModal}
                shareModal={shareModal}
                deleteModal={deleteModal}
                openConfirmModal={openConfirmModal}
                tagsModal={tagsModal}
                insightsModal={insightsModal}
                isRenamePending={renameMutation.isPending}
                isSharePending={false}
                isDeletePending={deleteMutation.isPending}
                isTagsPending={updateTagsMutation.isPending}
                onCloseRename={() => setRenameModal((prev) => ({ ...prev, isOpen: false }))}
                onRenameChange={(nextValue) =>
                    setRenameModal((prev) => ({ ...prev, value: nextValue }))
                }
                onRenameSubmit={handleRename}
                onCloseShare={() => {}}
                onShareConfirm={() => {}}
                onCloseDelete={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                onDeleteConfirm={handleDelete}
                onCloseOpenConfirm={() => setOpenConfirmModal({ isOpen: false, project: null })}
                onOpenConfirm={handleOpenConfirm}
                onCloseTags={() => setTagsModal({ isOpen: false, project: null })}
                onSaveTags={handleSaveTags}
                onCloseInsights={() => setInsightsModal({ isOpen: false, project: null })}
            />

            {settingsModal.isOpen && settingsModal.project && settingsModal.project.projectId && (
                <SettingsBigModal
                    onClose={() => setSettingsModal({ isOpen: false, project: null })}
                    initialTab="general"
                    projectName={settingsModal.project.projectName || 'Session'}
                    projectId={settingsModal.project.projectId}
                />
            )}
        </div>
    )
}
