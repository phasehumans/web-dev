import { useQuery } from '@tanstack/react-query'
import { Github, GitBranch, Clock, Lock, Globe, Search, RotateCw, Plus } from 'lucide-react'
import React, { useState } from 'react'

import { profileAPI, type GithubRepo } from '@/features/profile/api/profile'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Tooltip } from '@/shared/components/ui/Tooltip'

interface ProfileRepositoriesSettingsProps {
    isGithubConnected: boolean
    onConnectGithub: () => void
}

const languageColors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Rust: '#dea584',
    Go: '#00ADD8',
    Java: '#b07219',
    Ruby: '#701516',
    PHP: '#4F5D95',
    'C#': '#178600',
    'C++': '#f34b7d',
    C: '#555555',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Lua: '#000080',
    Vue: '#41b883',
    Svelte: '#ff3e00',
    MDX: '#fcb32c',
}

const formatTimeAgo = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const ProfileRepositoriesSettings: React.FC<ProfileRepositoriesSettingsProps> = ({
    isGithubConnected,
    onConnectGithub,
}) => {
    const [searchQuery, setSearchQuery] = useState('')

    const reposQuery = useQuery({
        queryKey: ['integrations', 'github', 'repos'],
        queryFn: profileAPI.getGithubRepos,
        enabled: isGithubConnected,
        staleTime: 5 * 60 * 1000,
    })

    const githubConnected = isGithubConnected
    const allRepos = reposQuery.data ?? []

    const filteredRepos = allRepos.filter(
        (repo) =>
            repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-4">Repositories</h1>

                <div className="flex flex-col border-t border-[#242323] pt-6">
                    {/* Top Control Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
                        <div className="relative w-full max-w-full sm:max-w-[340px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7A79]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search repositories..."
                                className="w-full pl-9 pr-3 py-1.5 bg-[#202020] border border-[#282828] rounded-lg text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#5A5A5A] transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Tooltip position="top" content="Refresh repositories">
                                <button
                                    onClick={() => reposQuery.refetch()}
                                    className="p-2 rounded-lg border border-[#282828] bg-[#202020] hover:bg-[#282828] text-[#949494] hover:text-white transition-colors cursor-pointer"
                                >
                                    <RotateCw
                                        className={`w-3.5 h-3.5 ${reposQuery.isRefetching ? 'animate-spin text-[#87B2F4]' : ''}`}
                                    />
                                </button>
                            </Tooltip>
                            <button
                                onClick={onConnectGithub}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#202020] hover:bg-[#282828] border border-[#282828] text-[12.5px] font-medium text-[#D6D5C9] hover:text-white transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Connect GitHub</span>
                            </button>
                        </div>
                    </div>

                    {!githubConnected ? (
                        <div className="border border-dashed border-[#383736] rounded-xl py-16 flex flex-col items-center justify-center gap-4 bg-[#100E12]/30 hover:border-[#4A4948] transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-[#191919] border border-[#383736] flex items-center justify-center">
                                <Github className="w-6 h-6 text-[#7B7A79]" />
                            </div>
                            <div className="flex flex-col items-center gap-1 text-center">
                                <span className="text-[14px] font-medium text-[#D6D5C9]">
                                    Connect GitHub to view all repositories
                                </span>
                                <span className="text-[13px] text-[#7B7A79] max-w-[320px]">
                                    Import any repository to start working on it with december.
                                </span>
                            </div>
                            <button
                                onClick={onConnectGithub}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-[#383736] text-[13px] font-medium text-[#D6D5C9] bg-[#242323] hover:bg-[#2F2E2E] transition-colors mt-1"
                            >
                                <Github className="w-4 h-4" />
                                Connect GitHub
                            </button>
                        </div>
                    ) : reposQuery.isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="p-3.5 bg-[#1B1B1B] rounded-xl flex flex-col justify-between gap-3 h-[100px]"
                                >
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-36 bg-white/[0.06] rounded" />
                                        <Skeleton className="h-4 w-14 bg-white/[0.04] rounded" />
                                    </div>
                                    <Skeleton className="h-3.5 w-full bg-white/[0.04] rounded" />
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-3 w-14 bg-white/[0.04] rounded" />
                                        <Skeleton className="h-3 w-12 bg-white/[0.04] rounded" />
                                        <Skeleton className="h-3 w-16 bg-white/[0.04] rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : reposQuery.isError ? (
                        <div className="border border-[#242323] rounded-xl py-16 flex flex-col items-center justify-center gap-3 bg-[#1B1B1B]">
                            <span className="text-[13px] text-red-400">
                                Failed to load repositories.
                            </span>
                            <button
                                onClick={() => reposQuery.refetch()}
                                className="px-4 py-1.5 rounded-xl border border-[#383736] text-[13px] text-[#D6D5C9] bg-[#202020] hover:bg-[#282828] transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : allRepos.length === 0 ? (
                        <div className="border border-[#242323] rounded-xl py-16 flex flex-col items-center justify-center gap-3 bg-[#1B1B1B]">
                            <Github className="w-6 h-6 text-[#7B7A79]" />
                            <span className="text-[13px] text-[#7B7A79]">
                                No repositories found on this account.
                            </span>
                        </div>
                    ) : (
                        /* Repositories Grid View */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {filteredRepos.map((repo: GithubRepo) => {
                                const [owner, name] = repo.fullName.split('/')
                                return (
                                    <div
                                        key={repo.id}
                                        className="group relative bg-[#1B1B1B] hover:bg-[#202020] rounded-xl p-3.5 transition-all duration-200 flex flex-col justify-between min-h-[96px] cursor-pointer"
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[13px] font-semibold text-white truncate">
                                                    {name || repo.fullName}
                                                </span>
                                                <span className="text-[11.5px] text-[#8F8E8D] truncate">
                                                    {owner || repo.fullName}
                                                </span>
                                            </div>

                                            {/* Public / Private Badge */}
                                            {repo.private ? (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#2B2A29] text-[10px] text-[#8F8E8D] bg-[#202020] shrink-0">
                                                    <Lock className="w-2.5 h-2.5" />
                                                    Private
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#2B2A29] text-[10px] text-[#8F8E8D] bg-[#202020] shrink-0">
                                                    <Globe className="w-2.5 h-2.5" />
                                                    Public
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {repo.description && (
                                            <p className="text-[12px] text-[#8F8E8D] line-clamp-2 leading-relaxed my-2">
                                                {repo.description}
                                            </p>
                                        )}

                                        {/* Meta Footer */}
                                        <div className="flex items-center gap-3.5 pt-1 text-[11px] text-[#8F8E8D] mt-auto">
                                            {repo.language && (
                                                <span className="flex items-center gap-1.5 truncate">
                                                    <span
                                                        className="w-2 h-2 rounded-full inline-block shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                languageColors[repo.language] ??
                                                                '#7B7A79',
                                                        }}
                                                    />
                                                    {repo.language}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 shrink-0">
                                                <GitBranch className="w-3 h-3 text-[#8F8E8D]" />
                                                {repo.defaultBranch}
                                            </span>
                                            <span className="flex items-center gap-1 shrink-0">
                                                <Clock className="w-3 h-3 text-[#8F8E8D]" />
                                                {formatTimeAgo(repo.updatedAt)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
