import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSessionListMutations } from '../hooks/useSessionListMutations'
import { useInfiniteSessions } from '../hooks/useSessions'

import { SessionListModals } from './SessionListModals'
import { SessionListView } from './SessionListView'

import type { DeleteModalState, RenameModalState } from '@/features/sessions/types'

import { useAppStore } from '@/app/store'
import { MobileBreadcrumbsHeader } from '@/features/navigation/components/MobileBreadcrumbsHeader'

export type SortOption = 'newest' | 'oldest'

export const SessionList: React.FC<{
    onNewProject: () => void
    onOpenProject: (projectId: string) => void
}> = ({ onNewProject, onOpenProject }) => {
    const navigate = useNavigate()
    const isAuthenticated = useAppStore((s) => s.isAuthenticated)
    const isAuthRestored = useAppStore((s) => s.isAuthRestored)

    useEffect(() => {
        if (isAuthRestored && !isAuthenticated) {
            navigate('/', { replace: true })
        }
    }, [isAuthRestored, isAuthenticated, navigate])

    const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortOption, setSortOption] = useState<SortOption>('newest')

    const queryFilters = useMemo(() => {
        return {
            search: searchQuery.trim() || undefined,
            sortBy: 'updatedAt' as const,
            sortOrder: sortOption === 'newest' ? 'desc' : 'asc',
        }
    }, [searchQuery, sortOption])

    const { data, isLoading, isFetching, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useInfiniteSessions(queryFilters)
    const sessions = useMemo(() => data?.pages.flatMap((page) => page.sessions) || [], [data])
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

        // sort
        result.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt).getTime()
            const dateB = new Date(b.updatedAt || b.createdAt).getTime()
            return sortOption === 'newest' ? dateB - dateA : dateA - dateB
        })

        return result
    }, [sessions, searchQuery, sortOption])

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

    const openTagsModal = (session: any, event: React.MouseEvent) =>
        openModal(event, () => setTagsModal({ isOpen: true, project: session }))

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
            onOpenProject(openConfirmModal.project.id)
            setOpenConfirmModal({ isOpen: false, project: null })
        }
    }

    if (!isAuthRestored || !isAuthenticated) {
        return null
    }

    return (
        <div
            className="relative h-full w-full flex-1 overflow-y-auto bg-background font-sans no-scrollbar"
            onScroll={(e) => {
                const target = e.currentTarget
                if (
                    target.scrollHeight - target.scrollTop - target.clientHeight < 150 &&
                    hasNextPage &&
                    !isFetchingNextPage
                ) {
                    fetchNextPage()
                }
            }}
        >
            <MobileBreadcrumbsHeader currentPage="Sessions" onHomeClick={onNewProject} />
            <div className="relative z-10 mx-auto max-w-6xl px-3.5 sm:px-6 pb-8 pt-4 md:p-16">
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
                    onOpenDelete={openDeleteModal}
                    onOpenTags={openTagsModal}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    hasUnfilteredProjects={sessions.length > 0}
                />
            </div>

            <SessionListModals
                renameModal={renameModal}
                deleteModal={deleteModal}
                openConfirmModal={openConfirmModal}
                tagsModal={tagsModal}
                isRenamePending={renameMutation.isPending}
                isDeletePending={deleteMutation.isPending}
                isTagsPending={updateTagsMutation.isPending}
                onCloseRename={() => setRenameModal((prev) => ({ ...prev, isOpen: false }))}
                onRenameChange={(nextValue) =>
                    setRenameModal((prev) => ({ ...prev, value: nextValue }))
                }
                onRenameSubmit={handleRename}
                onCloseDelete={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                onDeleteConfirm={handleDelete}
                onCloseOpenConfirm={() => setOpenConfirmModal({ isOpen: false, project: null })}
                onOpenConfirm={handleOpenConfirm}
                onCloseTags={() => setTagsModal({ isOpen: false, project: null })}
                onSaveTags={handleSaveTags}
            />
        </div>
    )
}
