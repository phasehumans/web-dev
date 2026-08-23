import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useState, useMemo, useEffect } from 'react'

import { WikiReader } from './WikiReader'

import { apiFetch } from '@/shared/api/client'
import { Icons } from '@/shared/components/ui/Icons'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Tooltip } from '@/shared/components/ui/Tooltip'

export interface UserGitHubRepo {
    id: string
    name: string
    fullName: string
    owner: string
    isPrivate: boolean
    description: string | null
    defaultBranch?: string
    status: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'FAILED'
    isPinned?: boolean
    wikiId?: string
    updatedAt?: string
}

export interface GitHubReposResponse {
    githubConnected: boolean
    repos: UserGitHubRepo[]
}

export interface WikiViewProps {
    onConnectGitHub?: () => void
    onOpenWiki?: (wikiId: string) => void
    initialData?: GitHubReposResponse
}

const getRelativeTime = (isoString?: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return ''
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffDay > 30) {
        const months = Math.floor(diffDay / 30)
        return `${months} ${months === 1 ? 'month' : 'months'} ago`
    }
    if (diffDay > 0) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`
    if (diffHour > 0) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`
    if (diffMin > 0) return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`
    return 'just now'
}

export const WikiView: React.FC<WikiViewProps> = ({ onConnectGitHub, onOpenWiki, initialData }) => {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null)

    const { data, isLoading, refetch, isRefetching } = useQuery<GitHubReposResponse>({
        queryKey: ['wiki', 'github-repos'],
        queryFn: async () => {
            const res = await apiFetch('/wiki/github-repos')
            if (!res.ok) {
                throw new Error('Failed to fetch GitHub repositories')
            }
            const json = await res.json()
            return json.data || json
        },
        initialData,
        staleTime: initialData ? Infinity : 0,
    })

    const [localRepos, setLocalRepos] = useState<UserGitHubRepo[]>([])

    useEffect(() => {
        if (data?.repos) {
            setLocalRepos(data.repos)
        }
    }, [data?.repos])

    const generateWikiMutation = useMutation({
        mutationFn: async ({ owner, name }: { owner: string; name: string }) => {
            const res = await apiFetch('/wiki/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoOwner: owner, repoName: name }),
            })
            if (!res.ok) {
                throw new Error('Failed to generate wiki')
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wiki', 'github-repos'] })
        },
    })

    const togglePinMutation = useMutation({
        mutationFn: async ({
            owner,
            name,
            isPinned,
        }: {
            owner: string
            name: string
            isPinned: boolean
        }) => {
            const res = await apiFetch('/wiki/pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoOwner: owner, repoName: name, isPinned }),
            })
            if (!res.ok) {
                throw new Error('Failed to pin repository')
            }
            return res.json()
        },
        onMutate: async ({ owner, name, isPinned }) => {
            await queryClient.cancelQueries({ queryKey: ['wiki', 'github-repos'] })
            const previous = queryClient.getQueryData<GitHubReposResponse>(['wiki', 'github-repos'])
            if (previous) {
                queryClient.setQueryData<GitHubReposResponse>(['wiki', 'github-repos'], {
                    ...previous,
                    repos: previous.repos.map((r) =>
                        r.owner.toLowerCase() === owner.toLowerCase() &&
                        r.name.toLowerCase() === name.toLowerCase()
                            ? { ...r, isPinned }
                            : r
                    ),
                })
            }
            return { previous }
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['wiki', 'github-repos'], context.previous)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['wiki', 'github-repos'] })
        },
    })

    const handleTogglePin = (repo: UserGitHubRepo) => {
        const nextPinned = !repo.isPinned
        setLocalRepos((prev) =>
            prev.map((r) =>
                r.owner.toLowerCase() === repo.owner.toLowerCase() &&
                r.name.toLowerCase() === repo.name.toLowerCase()
                    ? { ...r, isPinned: nextPinned }
                    : r
            )
        )
        togglePinMutation.mutate({
            owner: repo.owner,
            name: repo.name,
            isPinned: nextPinned,
        })
    }

    const filteredRepos = useMemo(() => {
        const repoList = localRepos.length > 0 ? localRepos : data?.repos || []
        if (!searchQuery.trim()) return repoList
        const q = searchQuery.toLowerCase()
        return repoList.filter(
            (repo) =>
                repo.name.toLowerCase().includes(q) ||
                repo.fullName.toLowerCase().includes(q) ||
                (repo.description && repo.description.toLowerCase().includes(q))
        )
    }, [localRepos, data?.repos, searchQuery])

    const pinnedList = useMemo(() => {
        return filteredRepos.filter((r) => r.isPinned)
    }, [filteredRepos])

    const unpinnedList = useMemo(() => {
        return filteredRepos.filter((r) => !r.isPinned)
    }, [filteredRepos])

    if (selectedRepo) {
        return (
            <WikiReader
                repoOwner={selectedRepo.owner}
                repoName={selectedRepo.name}
                onBack={() => setSelectedRepo(null)}
            />
        )
    }

    if (isLoading && !data) {
        return (
            <div className="relative h-full w-full flex-1 overflow-y-auto bg-background px-3.5 sm:px-6 pb-8 pt-14 md:pt-16 font-sans no-scrollbar md:p-16 text-gray-100">
                <div className="relative z-10 mx-auto max-w-6xl flex flex-col gap-6">
                    {/* Top Header */}
                    <div className="mb-2 flex flex-col">
                        <h1 className="text-[24px] font-medium text-[#D6D5C9] mb-1">Wiki</h1>
                        <p className="text-[13px] text-[#7B7A79]">
                            Explore GitHub repositories and browse AI-generated project
                            documentation.
                        </p>
                    </div>

                    {/* Top Control Bar Skeleton */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-2">
                        <div className="relative w-full max-w-full sm:max-w-[380px]">
                            <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7A79]" />
                            <div className="w-full h-9 bg-[#202020] border border-[#282828] rounded-lg" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-9 h-9 rounded-lg bg-[#202020]" />
                            <Skeleton className="w-32 h-9 rounded-lg bg-[#202020]" />
                        </div>
                    </div>

                    {/* Pinned Section Skeleton */}
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-14 bg-white/[0.06]" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div
                                    key={`wiki-pinned-skeleton-${i}`}
                                    className="bg-[#1B1B1B]/60 rounded-xl p-2.5 flex flex-col justify-between min-h-[72px]"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                            <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                                            <Skeleton className="h-3 w-20 bg-white/[0.04]" />
                                        </div>
                                        <Skeleton className="h-4 w-4 rounded-md bg-white/[0.04]" />
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <Skeleton className="h-3 w-28 bg-white/[0.04]" />
                                        <Skeleton className="h-6 w-16 rounded-md bg-white/[0.06]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Repositories Section Skeleton */}
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-24 bg-white/[0.06]" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={`wiki-repo-skeleton-${i}`}
                                    className="bg-[#1B1B1B]/60 rounded-xl p-2.5 flex flex-col justify-between min-h-[72px]"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                            <Skeleton className="h-4 w-36 bg-white/[0.06]" />
                                            <Skeleton className="h-3 w-24 bg-white/[0.04]" />
                                        </div>
                                        <Skeleton className="h-4 w-4 rounded-md bg-white/[0.04]" />
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <Skeleton className="h-3 w-24 bg-white/[0.04]" />
                                        <Skeleton className="h-6 w-16 rounded-md bg-white/[0.06]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const handleConnectGitHub = () => {
        if (onConnectGitHub) {
            onConnectGitHub()
        } else {
            window.location.href = 'https://github.com/apps/trydecember'
        }
    }

    if (data && !data.githubConnected) {
        return (
            <div className="relative h-full w-full flex-1 overflow-y-auto bg-background px-3.5 sm:px-6 pb-8 pt-14 md:pt-16 font-sans no-scrollbar md:p-16 text-gray-100">
                <div className="relative z-10 mx-auto max-w-6xl flex flex-col gap-6">
                    {/* Top Header */}
                    <div className="mb-2 flex flex-col">
                        <h1 className="text-[24px] font-medium text-[#D6D5C9] mb-1">Wiki</h1>
                        <p className="text-[13px] text-[#7B7A79]">
                            Explore GitHub repositories and browse AI-generated project
                            documentation.
                        </p>
                    </div>

                    {/* GitHub Not Connected Card UI (Matches Repositories Settings Page) */}
                    <div className="border border-dashed border-[#383736] rounded-xl py-16 flex flex-col items-center justify-center gap-4 bg-[#100E12]/30 hover:border-[#4A4948] transition-colors mt-2">
                        <div className="w-12 h-12 rounded-xl bg-[#191919] border border-[#383736] flex items-center justify-center">
                            <Icons.Github className="w-6 h-6 text-[#7B7A79]" />
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center">
                            <span className="text-[14px] font-medium text-[#D6D5C9]">
                                Connect GitHub to view all repositories
                            </span>
                            <span className="text-[12px] text-[#7B7A79]">
                                Import your GitHub repositories to access your codebases directly.
                            </span>
                        </div>
                        <button
                            onClick={handleConnectGitHub}
                            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#242323] hover:bg-[#2C2B2B] text-[13px] font-medium text-[#D6D5C9] hover:text-white transition-colors cursor-pointer border border-[#383736]"
                        >
                            <Icons.Github className="w-4 h-4" />
                            <span>Connect GitHub</span>
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full flex-1 overflow-y-auto bg-background px-3.5 sm:px-6 pb-8 pt-14 md:pt-16 font-sans no-scrollbar md:p-16 text-gray-100">
            <div className="relative z-10 mx-auto max-w-6xl flex flex-col gap-6">
                {/* Top Header (Matches Sessions & Review Page structure) */}
                <div className="mb-2 flex flex-col">
                    <h1 className="text-[24px] font-medium text-[#D6D5C9] mb-1">Wiki</h1>
                    <p className="text-[13px] text-[#7B7A79]">
                        Explore GitHub repositories and browse AI-generated project documentation.
                    </p>
                </div>

                {/* Top Control Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-2">
                    {/* Left: Search Input Bar (Spacious like Sessions/Review Page) */}
                    <div className="relative w-full max-w-full sm:max-w-[380px]">
                        <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7A79]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search repositories..."
                            className="w-full pl-9 pr-3 py-1.5 bg-[#202020] border border-[#282828] rounded-lg text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#5A5A5A] transition-colors"
                        />
                    </div>

                    {/* Right: Refresh Button & Add Repository Button */}
                    <div className="flex items-center gap-2 relative z-20">
                        <Tooltip content="Refresh repositories" position="top">
                            <button
                                onClick={() => refetch()}
                                className="p-2 rounded-lg border border-[#282828] bg-[#202020] hover:bg-[#282828] text-[#949494] hover:text-white transition-colors cursor-pointer"
                            >
                                <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={isRefetching ? 'animate-spin text-[#87B2F4]' : ''}
                                >
                                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                                </svg>
                            </button>
                        </Tooltip>
                        <button
                            onClick={() => {}}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#282828] border border-[#282828] text-[12.5px] font-medium text-[#D6D5C9] hover:text-white transition-colors cursor-pointer"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>Add repository</span>
                        </button>
                    </div>
                </div>

                {/* Section 1: Pinned Repositories (Only rendered if pinnedList is non-empty) */}
                {pinnedList.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <span className="text-[12.5px] font-semibold text-[#8F8F8F]">Pinned</span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {pinnedList.map((repo) => (
                                <div
                                    key={`pinned-${repo.id}`}
                                    onClick={() => {
                                        if (
                                            repo.status === 'COMPLETED' &&
                                            repo.wikiId &&
                                            onOpenWiki
                                        ) {
                                            onOpenWiki(repo.wikiId)
                                        }
                                        if (repo.status === 'COMPLETED') {
                                            setSelectedRepo({ owner: repo.owner, name: repo.name })
                                        }
                                    }}
                                    className={`group relative bg-[#1B1B1B] rounded-xl p-2.5 transition-all duration-200 flex flex-col justify-between min-h-[72px] ${
                                        repo.status === 'COMPLETED'
                                            ? 'hover:bg-[#202020] cursor-pointer'
                                            : 'cursor-default'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-col min-w-0">
                                            <span
                                                className={`text-[13px] font-semibold text-white transition-colors truncate ${
                                                    repo.status === 'COMPLETED'
                                                        ? 'cursor-pointer'
                                                        : 'cursor-default'
                                                }`}
                                            >
                                                {repo.name}
                                            </span>
                                            <span className="text-[11.5px] text-[#8F8E8D] truncate">
                                                {repo.owner}
                                            </span>
                                        </div>

                                        {/* Pin Button & GitHub Icon */}
                                        <div
                                            className="relative flex items-center gap-1 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {repo.status === 'COMPLETED' && (
                                                <Tooltip content="Unpin" position="top">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleTogglePin(repo)
                                                        }}
                                                        className="p-1 rounded-md text-[#D6D5C9] hover:bg-[#242323] hover:text-white transition-all cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                    >
                                                        <svg
                                                            width="13"
                                                            height="13"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                        >
                                                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                                                        </svg>
                                                    </button>
                                                </Tooltip>
                                            )}
                                            <Tooltip content="Open in GitHub" position="top">
                                                <a
                                                    href={`https://github.com/${repo.fullName}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-1 rounded-md text-[#8F8E8D] hover:bg-[#242323] hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                                                >
                                                    <svg
                                                        className="w-3.5 h-3.5 shrink-0"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                    >
                                                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                                    </svg>
                                                </a>
                                            </Tooltip>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center gap-1.5 text-[11px] text-[#7B7A79]">
                                            {getRelativeTime(repo.updatedAt) && (
                                                <>
                                                    <span>{getRelativeTime(repo.updatedAt)}</span>
                                                    <span>•</span>
                                                </>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <svg
                                                    width="10"
                                                    height="10"
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
                                                <span>{repo.defaultBranch || 'main'}</span>
                                            </div>
                                        </div>

                                        {/* Status / Generate Action Button */}
                                        {repo.status === 'GENERATING' ? (
                                            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[11px] font-medium flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                                Generating...
                                            </span>
                                        ) : (
                                            repo.status !== 'COMPLETED' && (
                                                <button
                                                    onClick={() =>
                                                        generateWikiMutation.mutate({
                                                            owner: repo.owner,
                                                            name: repo.name,
                                                        })
                                                    }
                                                    disabled={generateWikiMutation.isPending}
                                                    className="px-3 py-1 rounded-md bg-[#87B2F4] hover:bg-[#97C0F7] text-[#111111] font-semibold text-[11.5px] transition-colors cursor-pointer shadow-xs"
                                                >
                                                    Generate
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section 2: All Repositories */}
                <div className="flex flex-col gap-2">
                    {unpinnedList.length === 0 && pinnedList.length === 0 ? (
                        <div className="bg-[#1B1B1B] rounded-xl p-8 text-center flex flex-col items-center">
                            <Icons.Search className="w-6 h-6 text-[#444444] mb-2" />
                            <h3 className="text-sm font-medium text-white mb-1">
                                No repositories found
                            </h3>
                            <p className="text-xs text-[#7B7A79]">
                                {searchQuery
                                    ? `No repos matching "${searchQuery}"`
                                    : 'No GitHub repositories connected.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <span className="text-[12.5px] font-semibold text-[#8F8F8F]">
                                Repositories
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {unpinnedList.map((repo) => (
                                    <div
                                        key={repo.id}
                                        onClick={() => {
                                            if (
                                                repo.status === 'COMPLETED' &&
                                                repo.wikiId &&
                                                onOpenWiki
                                            ) {
                                                onOpenWiki(repo.wikiId)
                                            }
                                            if (repo.status === 'COMPLETED') {
                                                setSelectedRepo({
                                                    owner: repo.owner,
                                                    name: repo.name,
                                                })
                                            }
                                        }}
                                        className={`group relative bg-[#1B1B1B] rounded-xl p-2.5 transition-all duration-200 flex flex-col justify-between min-h-[72px] ${
                                            repo.status === 'COMPLETED'
                                                ? 'hover:bg-[#202020] cursor-pointer'
                                                : 'cursor-default'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="flex flex-col min-w-0">
                                                <span
                                                    onClick={(e) => {
                                                        if (repo.status !== 'COMPLETED') {
                                                            e.stopPropagation()
                                                            return
                                                        }
                                                        if (repo.wikiId && onOpenWiki) {
                                                            onOpenWiki(repo.wikiId)
                                                        }
                                                        setSelectedRepo({
                                                            owner: repo.owner,
                                                            name: repo.name,
                                                        })
                                                    }}
                                                    className={`text-[13px] font-semibold text-white transition-colors truncate ${
                                                        repo.status === 'COMPLETED'
                                                            ? 'cursor-pointer'
                                                            : 'cursor-default'
                                                    }`}
                                                >
                                                    {repo.name}
                                                </span>
                                                <span className="text-[11.5px] text-[#8F8E8D] truncate">
                                                    {repo.owner}
                                                </span>
                                            </div>

                                            {/* Pin Button & GitHub Icon */}
                                            <div
                                                className="relative flex items-center gap-1 shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {repo.status === 'COMPLETED' && (
                                                    <Tooltip content="Pin" position="top">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleTogglePin(repo)
                                                            }}
                                                            className="p-1 rounded-md text-[#7B7A79] hover:bg-[#242323] hover:text-[#D6D5C9] transition-all cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                        >
                                                            <svg
                                                                width="13"
                                                                height="13"
                                                                viewBox="0 0 24 24"
                                                                fill="currentColor"
                                                            >
                                                                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                                                            </svg>
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                <Tooltip content="Open in GitHub" position="top">
                                                    <a
                                                        href={`https://github.com/${repo.fullName}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1 rounded-md text-[#8F8E8D] hover:bg-[#242323] hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                                                    >
                                                        <svg
                                                            className="w-3.5 h-3.5 shrink-0"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                        >
                                                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                                        </svg>
                                                    </a>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center gap-1.5 text-[11px] text-[#7B7A79]">
                                                {getRelativeTime(repo.updatedAt) && (
                                                    <>
                                                        <span>
                                                            {getRelativeTime(repo.updatedAt)}
                                                        </span>
                                                        <span>•</span>
                                                    </>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <svg
                                                        width="10"
                                                        height="10"
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
                                                    <span>{repo.defaultBranch || 'main'}</span>
                                                </div>
                                            </div>

                                            {/* Status / Generate Action Button */}
                                            {repo.status === 'GENERATING' ? (
                                                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[11px] font-medium flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                                    Generating...
                                                </span>
                                            ) : (
                                                repo.status !== 'COMPLETED' && (
                                                    <button
                                                        onClick={() =>
                                                            generateWikiMutation.mutate({
                                                                owner: repo.owner,
                                                                name: repo.name,
                                                            })
                                                        }
                                                        disabled={generateWikiMutation.isPending}
                                                        className="px-3 py-1 rounded-md bg-[#87B2F4] hover:bg-[#97C0F7] text-[#111111] font-semibold text-[11.5px] transition-colors cursor-pointer shadow-xs"
                                                    >
                                                        Generate
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
