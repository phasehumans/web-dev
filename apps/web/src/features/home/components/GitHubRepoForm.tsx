import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import React, { useState } from 'react'

import { profileAPI } from '@/features/profile/api/profile'
import { Icons } from '@/shared/components/ui/Icons'

interface GitHubRepoFormProps {
    onClose: () => void
    onSubmitRepo?: (repoUrl: string) => Promise<void> | void
    isImporting?: boolean
    importMessage?: string | null
    importError?: string | null
    onResetImportState?: () => void
}

export const GitHubRepoForm: React.FC<GitHubRepoFormProps> = ({
    onClose,
    onSubmitRepo,
    isImporting = false,
    importMessage,
    importError,
    onResetImportState,
}) => {
    const [selectedRepo, setSelectedRepo] = useState('')
    const [connectError, setConnectError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showAllRepos, setShowAllRepos] = useState(false)

    // fetch quickinfo to check github connection status
    const { data: quickInfo, isLoading: isQuickInfoLoading } = useQuery({
        queryKey: ['quickinfo'],
        queryFn: profileAPI.getQuickInfo,
    })

    // profile for github auth state id
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
    })

    const isGithubConnected = profile?.githubConnected || (quickInfo?.githubConnected ?? false)

    // fetch github repositories if connected
    const { data: repos = [], isLoading: isReposLoading } = useQuery({
        queryKey: ['github-repos'],
        queryFn: profileAPI.getGithubRepos,
        enabled: isGithubConnected,
    })

    const handleConnectGithub = () => {
        try {
            setConnectError(null)

            if (!profile?.id) {
                setConnectError('Profile is still loading. Please try again.')
                return
            }

            window.location.href = profileAPI.getGithubConnectUrl(profile.id)
        } catch {
            setConnectError('Failed to connect to GitHub. Please try again.')
        }
    }

    const filteredRepos = repos.filter(
        (repo) =>
            repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repo.owner.login.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const visibleRepos =
        showAllRepos || searchQuery.length > 0 ? filteredRepos : filteredRepos.slice(0, 4)

    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[400px] mt-3 rounded-2xl bg-[#1E1E1E] border border-[#2E2D2C] shadow-lg shadow-black/40 overflow-hidden font-sans flex flex-col"
        >
            <div className="flex flex-col p-3 gap-3">
                {/* header row */}
                <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#CBCACA] ml-1">
                        Import from GitHub
                    </span>
                    <button
                        onClick={onClose}
                        className="text-[#8F8E8D] hover:text-[#CBCACA] transition-colors p-1.5 rounded-xl hover:bg-[#252525] outline-none"
                    >
                        <Icons.X className="w-[14px] h-[14px]" />
                    </button>
                </div>

                {isQuickInfoLoading ? (
                    // loading state
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-[#2E2D2C] border-t-[#8F8E8D] rounded-full animate-spin" />
                    </div>
                ) : !isGithubConnected ? (
                    // not connected state
                    <div
                        onClick={handleConnectGithub}
                        className="flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border border-dashed border-[#3A3938] hover:border-[#4A4948] hover:bg-[#252525]/30 cursor-pointer transition-all duration-200"
                    >
                        <Icons.Github className="w-8 h-8 text-[#8F8E8D] mb-1" />
                        <p className="text-[13px] font-medium text-[#E8E8E8]">Connect GitHub</p>
                        <p className="text-[12px] text-[#8F8E8D] text-center">
                            Authorize to browse and import your repositories directly.
                        </p>
                        {connectError && (
                            <p className="text-[11px] text-red-400 mt-2">{connectError}</p>
                        )}
                    </div>
                ) : (
                    // connected state
                    <div className="flex flex-col gap-3">
                        {/* search bar */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Icons.Search className="w-3.5 h-3.5 text-[#8F8E8D]" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search repositories..."
                                disabled={isImporting}
                                className="w-full bg-[#141414] border border-[#2E2D2C] focus:border-[#3A3938] rounded-xl h-[36px] pl-9 pr-3 text-[13px] text-[#E8E8E8] placeholder-[#656565] outline-none transition-colors"
                            />
                        </div>

                        {/* repo list */}
                        {isReposLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-4 h-4 border-2 border-[#2E2D2C] border-t-[#8F8E8D] rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-0.5">
                                {visibleRepos.length > 0 ? (
                                    <div
                                        className="flex flex-col gap-0.5 overflow-y-auto max-h-[260px] pr-1"
                                        style={{ scrollbarWidth: 'none' }}
                                    >
                                        {visibleRepos.map((repo) => (
                                            <button
                                                key={repo.id}
                                                onClick={() => onSubmitRepo?.(repo.htmlUrl)}
                                                disabled={isImporting}
                                                className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-[#252525] transition-colors text-left w-full disabled:opacity-50 group outline-none"
                                            >
                                                <Icons.Github className="w-[14px] h-[14px] text-[#8F8E8D] group-hover:text-[#CBCACA] shrink-0 mt-[2px] transition-colors" />
                                                <div className="flex flex-col min-w-0 leading-[1.3]">
                                                    <span className="text-[13px] font-medium text-[#E8E8E8] truncate">
                                                        {repo.name}
                                                    </span>
                                                    <span className="text-[11px] text-[#8F8E8D] truncate">
                                                        {repo.owner.login}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-[12px] text-[#8F8E8D]">
                                        No repositories found.
                                    </div>
                                )}

                                {!showAllRepos &&
                                    filteredRepos.length > 4 &&
                                    searchQuery.length === 0 && (
                                        <button
                                            onClick={() => setShowAllRepos(true)}
                                            className="text-[12px] text-[#8F8E8D] hover:text-[#CBCACA] font-medium mt-1.5 transition-colors py-1.5 rounded-xl hover:bg-[#252525]/50 outline-none w-full"
                                        >
                                            View all {filteredRepos.length} repositories
                                        </button>
                                    )}
                            </div>
                        )}

                        {/* status/error messages */}
                        {(importError || importMessage) && (
                            <div className="text-[12px] px-1">
                                <p
                                    className={
                                        importError ? 'text-red-400 font-medium' : 'text-[#8F8E8D]'
                                    }
                                >
                                    {importError || importMessage}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    )
}
