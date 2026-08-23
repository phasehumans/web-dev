import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useState, useEffect, useMemo } from 'react'

import { WikiChat } from './WikiChat'

import { apiFetch } from '@/shared/api/client'
import { Icons } from '@/shared/components/ui/Icons'

export interface WikiPage {
    id: string
    wikiId: string
    slug: string
    title: string
    content: string
    order: number
    createdAt?: string
    updatedAt?: string
}

export interface RepositoryWiki {
    id: string
    userId: string
    repoFullName: string
    repoOwner: string
    repoName: string
    status: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'FAILED'
    pages: WikiPage[]
    updatedAt?: string
}

export interface WikiReaderProps {
    repoOwner: string
    repoName: string
    onBack: () => void
    initialWiki?: RepositoryWiki
}

export const WikiReader: React.FC<WikiReaderProps> = ({
    repoOwner,
    repoName,
    onBack,
    initialWiki,
}) => {
    const queryClient = useQueryClient()
    const [activePageId, setActivePageId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

    // Form inputs
    const [formTitle, setFormTitle] = useState('')
    const [formContent, setFormContent] = useState('')
    const [formError, setFormError] = useState('')

    // Header dropdown & options state
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false)
    const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false)
    const [activeBranch, setActiveBranch] = useState('main (default)')
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
    const [isRemoveRepoModalOpen, setIsRemoveRepoModalOpen] = useState(false)
    const [toastMessage, setToastMessage] = useState<string | null>(null)

    const optionsMenuRef = React.useRef<HTMLDivElement>(null)
    const branchMenuRef = React.useRef<HTMLDivElement>(null)

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 2500)
    }

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(target)) {
                setIsOptionsMenuOpen(false)
            }
            if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
                setIsBranchMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Shortcut Ctrl+, (or Cmd+,) for DeepWiki settings
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault()
                setIsSettingsModalOpen((prev) => !prev)
                setIsOptionsMenuOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const { data: wikiData, isLoading } = useQuery<{ wiki: RepositoryWiki }>({
        queryKey: ['wiki', 'repo', repoOwner, repoName],
        queryFn: async () => {
            const res = await apiFetch(`/wiki/repos/${repoOwner}/${repoName}`)
            if (!res.ok) {
                throw new Error('Failed to fetch wiki data')
            }
            const json = await res.json()
            return json.data || json
        },
        initialData: initialWiki ? { wiki: initialWiki } : undefined,
        staleTime: initialWiki ? Infinity : 0,
    })

    const wiki = wikiData?.wiki
    const pages = useMemo(() => wiki?.pages || [], [wiki?.pages])

    // Default to first page if activePageId is not set or invalid
    useEffect(() => {
        if (pages.length > 0) {
            if (!activePageId || !pages.some((p) => p.id === activePageId)) {
                setActivePageId(pages[0].id)
            }
        } else {
            setActivePageId(null)
        }
    }, [pages, activePageId])

    const activePage = pages.find((p) => p.id === activePageId) || pages[0]

    // Render helper for inline source references e.g. README.md#1-3 or index.js#7-11
    const renderInlineSources = (text: string) => {
        const parts = text.split(/([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+(?:#\d+(?:-\d+)?)?)/g)
        return parts.map((part, index) => {
            if (
                /^[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+(?:#\d+(?:-\d+)?)?$/.test(part) &&
                (part.includes('.js') ||
                    part.includes('.ts') ||
                    part.includes('.md') ||
                    part.includes('.json') ||
                    part.includes('.py') ||
                    part.includes('.css'))
            ) {
                return (
                    <span
                        key={index}
                        className="mx-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#161D26] border border-[#243347] text-[11.5px] font-mono text-[#87B2F4] hover:bg-[#1E2734] hover:border-[#87B2F4]/40 transition-colors cursor-pointer select-none align-middle"
                    >
                        <svg
                            className="w-3 h-3 text-[#87B2F4] shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span>{part}</span>
                    </span>
                )
            }
            return part
        })
    }

    // Create page mutation
    const createPageMutation = useMutation({
        mutationFn: async ({ title, content }: { title: string; content: string }) => {
            if (!wiki) throw new Error('Wiki not loaded')
            const res = await apiFetch('/wiki/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wikiId: wiki.id,
                    title,
                    content,
                }),
            })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || 'Failed to create page')
            }
            return res.json()
        },
        onSuccess: (data) => {
            setFormError('')
            setIsAddModalOpen(false)
            setFormTitle('')
            setFormContent('')
            queryClient.invalidateQueries({ queryKey: ['wiki', 'repo', repoOwner, repoName] })
            if (data.page?.id) {
                setActivePageId(data.page.id)
            }
        },
        onError: (err: Error) => {
            setFormError(err.message)
        },
    })

    // Edit page mutation
    const updatePageMutation = useMutation({
        mutationFn: async ({
            id,
            title,
            content,
        }: {
            id: string
            title: string
            content: string
        }) => {
            const res = await apiFetch(`/wiki/pages/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
            })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || 'Failed to update page')
            }
            return res.json()
        },
        onSuccess: () => {
            setFormError('')
            setIsEditModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['wiki', 'repo', repoOwner, repoName] })
        },
        onError: (err: Error) => {
            setFormError(err.message)
        },
    })

    // Delete page mutation
    const deletePageMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await apiFetch(`/wiki/pages/${id}`, {
                method: 'DELETE',
            })
            if (!res.ok) {
                throw new Error('Failed to delete page')
            }
        },
        onSuccess: () => {
            setIsDeleteModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['wiki', 'repo', repoOwner, repoName] })
        },
    })

    const handleOpenAddModal = () => {
        setFormTitle('')
        setFormContent('')
        setFormError('')
        setIsAddModalOpen(true)
    }

    const handleOpenEditModal = () => {
        if (!activePage) return
        setFormTitle(activePage.title)
        setFormContent(activePage.content)
        setFormError('')
        setIsEditModalOpen(true)
    }

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formTitle.trim()) {
            setFormError('Title is required')
            return
        }
        createPageMutation.mutate({ title: formTitle.trim(), content: formContent })
    }

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!activePage) return
        if (!formTitle.trim()) {
            setFormError('Title is required')
            return
        }
        updatePageMutation.mutate({
            id: activePage.id,
            title: formTitle.trim(),
            content: formContent,
        })
    }

    const handleDeleteConfirm = () => {
        if (!activePage) return
        deletePageMutation.mutate(activePage.id)
    }

    const handleReindex = () => {
        setIsOptionsMenuOpen(false)
        showToast('Re-indexing repository wiki...')
        queryClient.invalidateQueries({ queryKey: ['wiki', 'repo', repoOwner, repoName] })
    }

    const handleRemoveBranchIndex = () => {
        setIsOptionsMenuOpen(false)
        showToast(`Removed branch index for ${activeBranch}`)
    }

    const handleEditWiki = () => {
        setIsOptionsMenuOpen(false)
        if (activePage) {
            handleOpenEditModal()
        } else {
            handleOpenAddModal()
        }
    }

    const handleOpenSettings = () => {
        setIsOptionsMenuOpen(false)
        setIsSettingsModalOpen(true)
    }

    const handleRemoveRepoFromWiki = () => {
        setIsOptionsMenuOpen(false)
        setIsRemoveRepoModalOpen(true)
    }

    const handleConfirmRemoveRepo = () => {
        setIsRemoveRepoModalOpen(false)
        showToast(`Removed ${repoOwner}/${repoName} from wiki`)
        setTimeout(() => {
            onBack()
        }, 400)
    }

    if (isLoading && !wiki) {
        return (
            <div className="flex flex-col h-full bg-[#141414] text-gray-100 p-6 md:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full animate-pulse space-y-4">
                    <div className="h-6 w-48 bg-[#1F1F22] rounded" />
                    <div className="h-10 w-96 bg-[#1F1F22] rounded mb-6" />
                    <div className="h-64 bg-[#141416] rounded-xl border border-[#222226]" />
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full flex-1 overflow-y-auto bg-[#141414] text-[#D6D5C9] font-sans flex flex-col [&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#383736] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#4A4948]">
            {/* Top Navigation Header */}
            <header className="sticky top-0 z-30 bg-[#141414] px-6 md:px-10 pt-4 pb-3 flex items-center justify-between shrink-0">
                {/* Left: Minimal Back Button */}
                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-[#8F8E8D] hover:text-[#D6D5C9] hover:bg-[#202020] active:scale-95 transition-all cursor-pointer"
                        title="Back"
                        aria-label="Back"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1.5 sm:gap-3">
                    <span className="text-[11.5px] text-[#7B7A79] hidden sm:block select-none">
                        Last updated 3 days ago
                    </span>

                    {/* Branch Selector */}
                    <div className="relative" ref={branchMenuRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsBranchMenuOpen(!isBranchMenuOpen)
                                setIsOptionsMenuOpen(false)
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#202020] hover:bg-[#282828] border border-[#282828] rounded-lg text-xs text-[#D6D5C9] transition-colors cursor-pointer select-none"
                        >
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <line x1="6" y1="3" x2="6" y2="15" />
                                <circle cx="18" cy="6" r="3" />
                                <circle cx="6" cy="18" r="3" />
                                <path d="M18 9a9 9 0 0 1-9 9" />
                            </svg>
                            <span>{activeBranch}</span>
                            <Icons.ChevronDown className="w-3 h-3 text-[#7B7A79]" />
                        </button>

                        {isBranchMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl border border-[#2F2F2F] bg-[#1E1E1E] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 font-sans">
                                <div className="px-2 py-1 text-[11px] font-medium text-[#7B7A79]">
                                    Select branch
                                </div>
                                {['main (default)', 'dev', 'feature/workspace'].map((b) => (
                                    <button
                                        key={b}
                                        onClick={() => {
                                            setActiveBranch(b)
                                            setIsBranchMenuOpen(false)
                                            showToast(`Switched to branch ${b}`)
                                        }}
                                        className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                                            activeBranch === b
                                                ? 'bg-[#262626] text-white font-medium'
                                                : 'text-[#D6D5C9] hover:bg-[#262626]'
                                        }`}
                                    >
                                        <span>{b}</span>
                                        {activeBranch === b && (
                                            <Icons.Check className="w-3.5 h-3.5 text-purple-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search Input Bar */}
                    <div className="relative flex items-center bg-[#202020] border border-[#282828] rounded-lg px-2.5 py-1 text-xs text-[#7B7A79] gap-1.5 focus-within:border-[#444]">
                        <Icons.Search className="w-3.5 h-3.5 text-[#7B7A79]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search"
                            className="bg-transparent text-xs text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none w-20 sm:w-28"
                        />
                    </div>

                    {/* GitHub Link */}
                    <a
                        href={`https://github.com/${repoOwner}/${repoName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#8F8E8D] hover:text-[#D6D5C9] hover:bg-[#202020] p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                        title="Open in GitHub"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                    </a>

                    {/* 3 Dots Options Menu */}
                    <div className="relative" ref={optionsMenuRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsOptionsMenuOpen(!isOptionsMenuOpen)
                                setIsBranchMenuOpen(false)
                            }}
                            className={`text-[#8F8E8D] hover:text-[#D6D5C9] p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center hover:bg-[#202020] ${
                                isOptionsMenuOpen ? 'bg-[#202020] text-white' : ''
                            }`}
                            title="Options"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="6" cy="12" r="1.5" />
                                <circle cx="18" cy="12" r="1.5" />
                            </svg>
                        </button>

                        {/* 3 Dots Dropdown Menu */}
                        {isOptionsMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-[#2F2F2F] bg-[#1E1E1E] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col text-[13px] font-sans">
                                {/* Item 1: Re-index now */}
                                <button
                                    type="button"
                                    onClick={handleReindex}
                                    className="flex w-full items-center px-3 py-2 rounded-lg text-[#D6D5C9] hover:text-white hover:bg-[#262626] transition-colors text-left cursor-pointer"
                                >
                                    Re-index now
                                </button>

                                {/* Item 2: Remove branch index */}
                                <button
                                    type="button"
                                    onClick={handleRemoveBranchIndex}
                                    className="flex w-full items-center px-3 py-2 rounded-lg text-[#EF4444] hover:text-red-300 hover:bg-[#262626] transition-colors text-left cursor-pointer"
                                >
                                    Remove branch index
                                </button>

                                {/* Divider 1 */}
                                <div className="my-1 border-t border-[#2A2A2A]" />

                                {/* Item 3: Edit wiki */}
                                <button
                                    type="button"
                                    onClick={handleEditWiki}
                                    className="flex w-full items-center px-3 py-2 rounded-lg text-[#D6D5C9] hover:text-white hover:bg-[#262626] transition-colors text-left cursor-pointer"
                                >
                                    Edit wiki
                                </button>

                                {/* Item 4: DeepWiki settings */}
                                <button
                                    type="button"
                                    onClick={handleOpenSettings}
                                    className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-[#D6D5C9] hover:text-white hover:bg-[#262626] transition-colors text-left cursor-pointer"
                                >
                                    <span>DeepWiki settings</span>
                                    <span className="text-[11px] font-mono text-[#7B7A79]">
                                        Ctrl ,
                                    </span>
                                </button>

                                {/* Divider 2 */}
                                <div className="my-1 border-t border-[#2A2A2A]" />

                                {/* Item 5: Remove repository from wiki */}
                                <button
                                    type="button"
                                    onClick={handleRemoveRepoFromWiki}
                                    className="flex w-full items-center px-3 py-2 rounded-lg text-[#EF4444] hover:text-red-300 hover:bg-[#262626] transition-colors text-left cursor-pointer"
                                >
                                    Remove repository from wiki
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Body */}
            <main className="flex-1 max-w-[680px] w-full mx-auto px-4 sm:px-6 pt-4 pb-40 flex flex-col gap-6">
                {activePage ? (
                    <>
                        {/* Page Header Title */}
                        <div className="flex flex-col gap-3 border-b border-[#282828] pb-6">
                            <h1 className="text-2xl md:text-3xl font-bold text-[#D6D5C9] tracking-tight">
                                {repoName} — Overview
                            </h1>
                        </div>

                        {/* Page Content Body - Rich Mock Content matching DeepWiki Screenshot */}
                        <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[#D6D5C9] space-y-6">
                            {/* Intro Paragraph */}
                            <p className="leading-relaxed text-[13.5px]">
                                The <span className="font-semibold text-white">{repoName}</span> is
                                a robust RESTful API service built to facilitate real-time
                                application management and room reservations{' '}
                                {renderInlineSources('README.md#1-3')}. It implements a role-based
                                access control (RBAC) model, distinguishing between administrators
                                who manage system properties and end users who consume resources{' '}
                                {renderInlineSources('README.md#7-10')}.
                            </p>

                            {/* System Purpose Section */}
                            <div className="flex flex-col gap-3 pt-2">
                                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                                    System Purpose
                                </h2>
                                <p className="text-[13px] text-[#8F8F8F]">
                                    The application serves as a backend service for:
                                </p>
                                <ul className="space-y-2 text-[13px] text-[#D6D5C9] list-disc list-inside pl-1">
                                    <li className="leading-relaxed">
                                        <span className="font-semibold text-white">
                                            Identity Management
                                        </span>
                                        : Secure registration and authentication using JWT{' '}
                                        {renderInlineSources('README.md#8-10')}.
                                    </li>
                                    <li className="leading-relaxed">
                                        <span className="font-semibold text-white">
                                            Property Management
                                        </span>
                                        : Enabling owners to list entities and define room
                                        specifications including pricing and occupancy{' '}
                                        {renderInlineSources('README.md#13-14')}.
                                    </li>
                                    <li className="leading-relaxed">
                                        <span className="font-semibold text-white">
                                            Reservation Lifecycle
                                        </span>
                                        : Allowing customers to browse options, book specific rooms,
                                        and manage booking history{' '}
                                        {renderInlineSources('README.md#19-21')}.
                                    </li>
                                    <li className="leading-relaxed">
                                        <span className="font-semibold text-white">
                                            Feedback Loop
                                        </span>
                                        : A review system for customers to rate services on a 1-5
                                        star scale {renderInlineSources('README.md#24-25')}.
                                    </li>
                                </ul>
                            </div>

                            {/* Subsystem Overview Section */}
                            <div className="flex flex-col gap-4 pt-4 border-t border-[#282828]">
                                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                                    Subsystem Overview
                                </h2>

                                {/* 1. Application Entry & Setup */}
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-base font-semibold text-white">
                                        1. Application Entry & Setup
                                    </h3>
                                    <p className="text-[13px] text-[#D6D5C9] leading-relaxed">
                                        The system is initialized in{' '}
                                        <code className="bg-[#202020] text-[#D6D5C9] px-1.5 py-0.5 rounded font-mono text-[12px]">
                                            index.js
                                        </code>{' '}
                                        or{' '}
                                        <code className="bg-[#202020] text-[#D6D5C9] px-1.5 py-0.5 rounded font-mono text-[12px]">
                                            index.ts
                                        </code>
                                        , which configures environment variables via{' '}
                                        <code className="bg-[#202020] text-[#D6D5C9] px-1.5 py-0.5 rounded font-mono text-[12px]">
                                            dotenv
                                        </code>{' '}
                                        and sets up standard Express middleware for JSON and
                                        URL-encoded body parsing{' '}
                                        {renderInlineSources('index.js#7-11')}.
                                    </p>
                                    <ul className="space-y-1.5 text-[12.5px] text-[#D6D5C9] list-disc list-inside pl-2">
                                        <li>
                                            For setup instructions, see{' '}
                                            <button
                                                onClick={() => setActivePageId(pages[0]?.id || '')}
                                                className="text-[#87B2F4] hover:underline cursor-pointer"
                                            >
                                                Getting Started & Project Setup
                                            </button>
                                            .
                                        </li>
                                        <li>
                                            For details on bootstrap, see{' '}
                                            <button
                                                onClick={() =>
                                                    setActivePageId(
                                                        pages[1]?.id || pages[0]?.id || ''
                                                    )
                                                }
                                                className="text-[#87B2F4] hover:underline cursor-pointer"
                                            >
                                                Application Entry Point & Server Bootstrap
                                            </button>
                                            .
                                        </li>
                                    </ul>
                                </div>

                                {/* 2. Core Services & Domain Table */}
                                <div className="flex flex-col gap-3 pt-2">
                                    <h3 className="text-base font-semibold text-white">
                                        2. Core Services
                                    </h3>
                                    <p className="text-[13px] text-[#D6D5C9] leading-relaxed">
                                        The business logic is partitioned into primary domains, each
                                        with its own controller and route definition{' '}
                                        {renderInlineSources('README.md#34-45')}:
                                    </p>

                                    {/* Domain Table Matching Screenshot 2 */}
                                    <div className="bg-[#1B1B1B] border border-[#282828] rounded-xl overflow-x-auto my-2 shadow-sm font-sans">
                                        <table className="w-full text-left text-[12.5px] border-collapse">
                                            <thead>
                                                <tr className="bg-[#202020] border-b border-[#282828] text-[#8F8F8F] font-semibold">
                                                    <th className="py-2.5 px-4 w-28">Domain</th>
                                                    <th className="py-2.5 px-4 w-48">
                                                        Key Code Entities
                                                    </th>
                                                    <th className="py-2.5 px-4">
                                                        Primary Responsibility
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#282828] text-[#D6D5C9]">
                                                <tr className="hover:bg-[#202020]/50 transition-colors">
                                                    <td className="py-3 px-4 font-semibold text-white">
                                                        Auth
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-[11.5px] text-[#8F8F8F]">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="bg-[#202020] px-1.5 py-0.5 rounded text-[#D6D5C9] w-fit">
                                                                auth.controller.js
                                                            </span>
                                                            <span className="bg-[#202020] px-1.5 py-0.5 rounded text-[#D6D5C9] w-fit">
                                                                auth.middleware.js
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 leading-relaxed">
                                                        JWT issuance, password hashing, and RBAC
                                                        enforcement.
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-[#202020]/50 transition-colors">
                                                    <td className="py-3 px-4 font-semibold text-white">
                                                        Hotels
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-[11.5px] text-[#8F8F8F]">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="bg-[#202020] px-1.5 py-0.5 rounded text-[#D6D5C9] w-fit">
                                                                hotel.controller.js
                                                            </span>
                                                            <span className="bg-[#202020] px-1.5 py-0.5 rounded text-[#D6D5C9] w-fit">
                                                                hotel.route.js
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 leading-relaxed">
                                                        CRUD for properties and rooms; owner-only
                                                        restrictions.
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-[#202020]/50 transition-colors">
                                                    <td className="py-3 px-4 font-semibold text-white">
                                                        Bookings
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-[11.5px] text-[#8F8F8F]">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="bg-[#202020] px-1.5 py-0.5 rounded text-[#D6D5C9] w-fit">
                                                                booking.controller.js
                                                            </span>
                                                            <span className="bg-[#202020] px-1.5 py-0.5 rounded text-[#D6D5C9] w-fit">
                                                                booking.service.js
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 leading-relaxed">
                                                        Room availability state machine and customer
                                                        reservation history.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* 3. Data Integrity & Security */}
                                <div className="flex flex-col gap-2 pt-2">
                                    <h3 className="text-base font-semibold text-white">
                                        3. Data Integrity & Security
                                    </h3>
                                    <p className="text-[13px] text-[#D6D5C9] leading-relaxed">
                                        All incoming payloads undergo strict schema validation and
                                        token verification middleware prior to controller execution{' '}
                                        {renderInlineSources('middleware/auth.middleware.js#1-5')}{' '}
                                        {renderInlineSources('utils/validation.js#1-5')}.
                                    </p>
                                </div>
                            </div>

                            {/* Child Sections Bullet List */}
                            <div className="mt-8 pt-6 border-t border-[#282828] flex flex-col gap-3">
                                <h3 className="text-lg font-bold text-white">Child Sections</h3>
                                <ul className="space-y-3 text-[13px] text-[#D6D5C9] list-disc list-inside">
                                    <li className="leading-relaxed">
                                        <button
                                            onClick={() => setActivePageId(pages[0]?.id || '')}
                                            className="font-semibold text-[#87B2F4] hover:underline cursor-pointer"
                                        >
                                            Getting Started & Project Setup
                                        </button>
                                        : Prerequisites,{' '}
                                        <code className="bg-[#202020] px-1.5 py-0.5 rounded font-mono text-[11.5px]">
                                            .env
                                        </code>{' '}
                                        configuration, and running the server.
                                    </li>
                                    <li className="leading-relaxed">
                                        <button
                                            onClick={() =>
                                                setActivePageId(pages[1]?.id || pages[0]?.id || '')
                                            }
                                            className="font-semibold text-[#87B2F4] hover:underline cursor-pointer"
                                        >
                                            Application Entry Point & Server Bootstrap
                                        </button>
                                        : Detailed breakdown of{' '}
                                        <code className="bg-[#202020] px-1.5 py-0.5 rounded font-mono text-[11.5px]">
                                            index.js
                                        </code>{' '}
                                        and global middleware.
                                    </li>
                                    {pages.slice(2).map((p) => (
                                        <li key={p.id} className="leading-relaxed">
                                            <button
                                                onClick={() => setActivePageId(p.id)}
                                                className="font-semibold text-[#87B2F4] hover:underline cursor-pointer"
                                            >
                                                {p.title}
                                            </button>
                                            : Architectural breakdown and key code entities.
                                        </li>
                                    ))}
                                </ul>

                                {/* Sources Footer Badges Matching Screenshot 3 */}
                                <div className="mt-4 flex items-center gap-2 flex-wrap text-xs text-[#7B7A79] pt-2">
                                    <span className="font-semibold text-[#8F8F8F]">Sources:</span>
                                    {renderInlineSources('index.js#1-21')}
                                    {renderInlineSources('README.md#28-51')}
                                    {renderInlineSources('package.json#1-36')}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12">
                        <h3 className="text-base font-semibold text-white mb-1">
                            No wiki pages found
                        </h3>
                        <p className="text-xs text-[#8F8E8D]">
                            Generate wiki documentation for this repository to view details.
                        </p>
                    </div>
                )}
            </main>

            {/* Floating Bottom Q&A Chat Bar */}
            <WikiChat
                wikiId={wiki?.id}
                repoFullName={wiki?.repoFullName || `${repoOwner}/${repoName}`}
                repoName={repoName}
            />

            {/* Create Page Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-none z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#282828] pb-3">
                            <h3 className="text-base font-bold text-white">Add Wiki Page</h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                <Icons.X className="w-4 h-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Page title (e.g. API Guidelines)"
                                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Content (Markdown)
                                </label>
                                <textarea
                                    rows={8}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    placeholder="# Page Title\n\nWrite markdown content..."
                                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-xs font-medium text-gray-300 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createPageMutation.isPending}
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white cursor-pointer"
                                >
                                    {createPageMutation.isPending ? 'Creating...' : 'Create Page'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Page Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-none z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#282828] pb-3">
                            <h3 className="text-base font-bold text-white">Edit Wiki Page</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                <Icons.X className="w-4 h-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Content (Markdown)
                                </label>
                                <textarea
                                    rows={8}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-xs font-medium text-gray-300 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatePageMutation.isPending}
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white cursor-pointer"
                                >
                                    {updatePageMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && activePage && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-none z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                        <h3 className="text-base font-bold text-white">Delete Page</h3>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-white">"{activePage.title}"</span>?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-xs font-medium text-gray-300 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deletePageMutation.isPending}
                                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white cursor-pointer"
                            >
                                {deletePageMutation.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DeepWiki Settings Modal */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 font-sans">
                        <div className="flex items-center justify-between border-b border-[#282828] pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white">
                                    DeepWiki Settings
                                </h3>
                                <p className="text-xs text-[#7B7A79] mt-0.5">
                                    {repoOwner}/{repoName}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSettingsModalOpen(false)}
                                className="text-[#7B7A79] hover:text-white p-1 rounded-lg hover:bg-[#242424] transition-colors cursor-pointer"
                            >
                                <Icons.X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div>
                                <label className="block font-medium text-gray-300 mb-1.5">
                                    Default Branch
                                </label>
                                <div className="flex items-center px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-[#D6D5C9]">
                                    <span>{activeBranch}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-[#282828]">
                                <div>
                                    <span className="font-medium text-gray-200 block">
                                        Auto-sync with Repository
                                    </span>
                                    <span className="text-[11px] text-[#7B7A79]">
                                        Automatically update wiki documentation on branch push
                                    </span>
                                </div>
                                <div className="w-8 h-4 rounded-full bg-purple-500 relative p-0.5 cursor-pointer">
                                    <div className="w-3 h-3 rounded-full bg-white translate-x-4 transition-transform" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-[#282828]">
                                <div>
                                    <span className="font-medium text-gray-200 block">
                                        AI Inline Source References
                                    </span>
                                    <span className="text-[11px] text-[#7B7A79]">
                                        Show linked code files and line references
                                    </span>
                                </div>
                                <div className="w-8 h-4 rounded-full bg-purple-500 relative p-0.5 cursor-pointer">
                                    <div className="w-3 h-3 rounded-full bg-white translate-x-4 transition-transform" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-[#282828]">
                            <button
                                onClick={() => {
                                    setIsSettingsModalOpen(false)
                                    showToast('DeepWiki settings saved')
                                }}
                                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white transition-colors cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Repository Confirmation Modal */}
            {isRemoveRepoModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 font-sans">
                        <h3 className="text-base font-bold text-white">
                            Remove Repository from Wiki
                        </h3>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            Are you sure you want to remove{' '}
                            <span className="font-semibold text-white">
                                {repoOwner}/{repoName}
                            </span>{' '}
                            from DeepWiki? This will remove the repository index.
                        </p>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
                            <button
                                onClick={() => setIsRemoveRepoModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-xs font-medium text-gray-300 cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRemoveRepo}
                                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white cursor-pointer transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Toast Message */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-[#202020] border border-[#383736] text-[#D6D5C9] text-xs font-medium px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2 font-sans">
                    <Icons.Check className="w-3.5 h-3.5 text-purple-400" />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    )
}
