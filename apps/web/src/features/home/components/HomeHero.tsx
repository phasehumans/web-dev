import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Laptop, Star } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { HomeHeader } from './HomeHeader'
import { OnboardingModal } from './OnboardingModal'
import PromptInput from './PromptInput'

import type { HomeHeroProps } from '@/features/home/types'

import { useAppStore } from '@/app/store'
import { OutOfCreditsModal } from '@/features/billing/components/OutOfCreditsModal'
import { useBillingOverview } from '@/features/billing/hooks/useBillingData'
import { profileAPI } from '@/features/profile/api/profile'
import { ProfileFeedbackModal } from '@/features/profile/components/ProfileFeedbackModal'
import { Icons } from '@/shared/components/ui/Icons'
import { getGithubAppName } from '@/shared/config/env'

export const HomeHero: React.FC<HomeHeroProps> = ({
    onPromptSubmit,
    onOpenAuth,
    onOpenProject: _onOpenProject,
    onImportGithub,
    onImportZip,
    onResetImportState,
}) => {
    const {
        isGenerating,
        isAuthenticated,
        activeProjectId: projectId,
        importState,
        showOutOfCreditsModal,
        setShowOutOfCreditsModal,
    } = useAppStore()
    const { data: overview } = useBillingOverview(Boolean(isAuthenticated))
    const navigate = useNavigate()
    const [prompt, setPrompt] = React.useState('')
    const [activeImportForm, setActiveImportForm] = useState<'github' | null>(null)
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const [chatMode, setChatMode] = useState<'agent' | 'search'>('agent')
    const [isLogoAnimating, setIsLogoAnimating] = useState(false)

    const queryClient = useQueryClient()
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
        enabled: isAuthenticated,
    })

    const completeOnboardingMutation = useMutation({
        mutationFn: profileAPI.completeOnboarding,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })

    const [showOnboarding, setShowOnboarding] = useState(false)
    const [showFeedbackModal, setShowFeedbackModal] = useState(false)
    const [unauthDismissedCards, setUnauthDismissedCards] = useState<{
        github?: boolean
        star?: boolean
        feedback?: boolean
    }>({})

    const dismissCardMutation = useMutation({
        mutationFn: profileAPI.dismissOnboardingCard,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })

    const handleDismissCard = (card: 'github' | 'star' | 'feedback') => {
        if (isAuthenticated) {
            dismissCardMutation.mutate(card === 'star' ? 'welcome' : card)
        } else {
            setUnauthDismissedCards((prev) => ({ ...prev, [card]: true }))
        }
    }

    const isGithubDone = isAuthenticated
        ? Boolean(profile?.githubAppInstall || profile?.githubCardDone)
        : Boolean(unauthDismissedCards.github)
    const isStarDone = isAuthenticated
        ? Boolean(profile?.welcomeCardDone)
        : Boolean(unauthDismissedCards.star)
    const isFeedbackDone = isAuthenticated
        ? Boolean(profile?.feedbackCardDone)
        : Boolean(unauthDismissedCards.feedback)

    const handleConnectGithub = () => {
        if (isAuthenticated && profile?.id) {
            window.location.href = profileAPI.getGithubConnectUrl(profile.id)
        } else {
            const appName = getGithubAppName() || 'trydecember'
            window.location.href = `https://github.com/apps/${appName}`
        }
    }

    useEffect(() => {
        let timer: any = null
        if (isAuthenticated && profile && profile.hasCompletedOnboarding === false) {
            timer = setTimeout(() => {
                setShowOnboarding(true)
            }, 800)
        } else {
            setShowOnboarding(false)
        }
        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [isAuthenticated, profile])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
                e.preventDefault()
                setChatMode((prev) => (prev === 'agent' ? 'search' : 'agent'))
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const toggleImportForm = (form: 'github') => {
        if (!isAuthenticated) {
            onOpenAuth()
            return
        }

        onResetImportState?.()
        setActiveImportForm((prev) => (prev === form ? null : form))
    }

    return (
        <main
            id="main-scroll-container"
            className="h-full min-h-0 overflow-hidden md:overflow-y-auto no-scrollbar scroll-smooth relative flex flex-col"
        >
            <HomeHeader isAuthenticated={isAuthenticated} onOpenAuth={onOpenAuth} />

            <div className="flex flex-col items-center justify-start pt-[19vh] md:pt-[26vh] h-full flex-1 gap-6 animate-in fade-in duration-500 max-w-4xl mx-auto px-4 w-full shrink-0 relative">
                {/* hidden original logo to preserve exact vertical layout flow */}
                <div
                    className="flex flex-col items-center gap-3 text-center relative -left-[8px] opacity-0 pointer-events-none select-none"
                    aria-hidden="true"
                >
                    <div className="flex items-center gap-2.5">
                        <Icons.DecemberLogo
                            className="w-7 h-7 md:w-9 md:h-9 text-white"
                            strokeWidth={1}
                        />
                        <h1 className="text-[24px] md:text-[32px] font-sohne font-medium tracking-tight text-[#D6D5D4]">
                            December
                        </h1>
                    </div>
                </div>
                <div className="w-full max-w-[638px] px-2 md:px-0 relative -top-[1px] -left-[4px]">
                    <div className="absolute bottom-[calc(100%+10px)] left-2 md:left-0 right-2 md:right-0 z-10 flex justify-between items-end">
                        <div className="flex items-center gap-2 select-none mb-1 ml-1.5 md:ml-2 group cursor-default">
                            <Icons.DecemberLogo
                                className={`w-[22px] h-[22px] md:w-[26px] md:h-[26px] text-white transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isLogoAnimating ? '-rotate-12 scale-95' : 'rotate-0 scale-100'}`}
                                strokeWidth={1}
                            />
                            <h2 className="text-[20px] md:text-[23px] font-sohne font-normal tracking-tight text-white flex items-center gap-1.5 leading-none">
                                December
                                <span className="text-[#87B2F4] font-normal relative inline-grid overflow-hidden py-1">
                                    <span
                                        className={`col-start-1 row-start-1 transition-all duration-300 ease-out ${
                                            chatMode === 'agent'
                                                ? 'opacity-100 translate-y-0'
                                                : 'opacity-0 -translate-y-4 pointer-events-none'
                                        }`}
                                    >
                                        Agent
                                    </span>
                                    <span
                                        className={`col-start-1 row-start-1 transition-all duration-300 ease-out ${
                                            chatMode === 'search'
                                                ? 'opacity-100 translate-y-0'
                                                : 'opacity-0 translate-y-4 pointer-events-none'
                                        }`}
                                    >
                                        Search
                                    </span>
                                </span>
                            </h2>
                        </div>
                        <div className="relative flex items-center bg-[#252525] rounded-full shadow-lg shadow-black/40 w-[94px] overflow-hidden mr-1.5 md:mr-2">
                            {/* sliding indicator */}
                            <div
                                className={`absolute left-0 top-0 bottom-0 w-1/2 rounded-full bg-[#87B2F4] transition-transform duration-300 ease-out shadow-lg shadow-black/40 ${
                                    chatMode === 'agent' ? 'translate-x-0' : 'translate-x-full'
                                }`}
                            />

                            <button
                                onClick={() => setChatMode('agent')}
                                className={`relative z-10 flex-1 flex justify-center items-center py-[5px] rounded-full text-[11px] transition-colors duration-300 ${
                                    chatMode === 'agent'
                                        ? 'text-[#111111] font-semibold'
                                        : 'text-[#B4B4B4] hover:text-[#E8E8E8] font-medium'
                                }`}
                            >
                                Agent
                            </button>
                            <button
                                onClick={() => setChatMode('search')}
                                className={`relative z-10 flex-1 flex justify-center items-center py-[5px] rounded-full text-[11px] transition-colors duration-300 ${
                                    chatMode === 'search'
                                        ? 'text-[#111111] font-semibold'
                                        : 'text-[#B4B4B4] hover:text-[#E8E8E8] font-medium'
                                }`}
                            >
                                Search
                            </button>
                        </div>
                    </div>
                    <PromptInput
                        value={prompt}
                        onChange={setPrompt}
                        onSubmit={(submittedPrompt) => {
                            if (chatMode === 'search') {
                                if (
                                    isAuthenticated &&
                                    overview !== undefined &&
                                    (overview.creditBalance ?? 0) <= 0
                                ) {
                                    setShowOutOfCreditsModal(true)
                                    return
                                }
                                navigate(`/search?prompt=${encodeURIComponent(submittedPrompt)}`)
                            } else {
                                if (
                                    isAuthenticated &&
                                    overview !== undefined &&
                                    (overview.creditBalance ?? 0) <= 0
                                ) {
                                    setShowOutOfCreditsModal(true)
                                    return
                                }
                                onPromptSubmit(submittedPrompt)
                            }
                        }}
                        isLoading={isGenerating}
                        onUpload={() => {}}
                        isAuthenticated={isAuthenticated}
                        onOpenAuth={onOpenAuth}
                        onFocus={() => {
                            setIsLogoAnimating(true)
                            setTimeout(() => setIsLogoAnimating(false), 500)
                        }}
                        mode={chatMode}
                    />

                    {/* Get Started Section - Desktop View */}
                    {(!isGithubDone || !isStarDone || !isFeedbackDone) && (
                        <div className="mt-8 w-full hidden md:flex flex-col gap-3.5 select-none animate-in fade-in duration-300">
                            <div className="flex flex-col gap-0.5 text-left px-1.5">
                                <h3 className="text-[13px] md:text-[14px] font-sans font-semibold text-[#D6D5D4] tracking-tight">
                                    Get Started
                                </h3>
                                <p className="text-[11px] md:text-[11.5px] font-sans text-[#8F8E8D] leading-tight">
                                    Start your journey with December by completing your onboarding
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                                {/* Card 1: Connect GitHub */}
                                {!isGithubDone && (
                                    <div className="relative flex flex-col justify-between p-4 rounded-[15px] bg-[#141414] border border-dashed border-[#333333] min-h-[172px] text-left">
                                        <button
                                            onClick={() => handleDismissCard('github')}
                                            className="absolute top-3 right-3 text-[#8F8E8D] hover:text-white transition-colors cursor-pointer"
                                            title="Dismiss card"
                                        >
                                            <Icons.X className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="flex flex-col gap-2.5">
                                            <Icons.Github className="w-5 h-5 text-white" />
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-[13px] font-sans font-semibold text-[#E8E8E8]">
                                                    Connect GitHub
                                                </h4>
                                                <p className="text-[11px] font-sans text-[#8F8E8D] leading-normal font-medium">
                                                    Connect your repositories so that December can
                                                    open Pull Requests and review code.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={
                                                isAuthenticated ? handleConnectGithub : onOpenAuth
                                            }
                                            className="mt-5 w-full py-1.5 rounded-[7px] bg-[#191919] border border-[#262626] text-[#9A9998] hover:text-[#E8E8E8] text-[11.5px] font-sans font-medium text-center cursor-pointer select-none transition-transform duration-75 active:scale-[0.98] active:translate-y-[0.5px]"
                                        >
                                            {isAuthenticated
                                                ? 'Install Integration'
                                                : 'Sign In to Connect'}
                                        </button>
                                    </div>
                                )}

                                {/* Card 2: Star on GitHub */}
                                {!isStarDone && (
                                    <div className="relative flex flex-col justify-between p-4 rounded-[15px] bg-[#141414] border border-dashed border-[#333333] min-h-[172px] text-left">
                                        <button
                                            onClick={() => handleDismissCard('star')}
                                            className="absolute top-3 right-3 text-[#8F8E8D] hover:text-white transition-colors cursor-pointer"
                                            title="Dismiss card"
                                        >
                                            <Icons.X className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="flex flex-col gap-2.5">
                                            <Star className="w-5 h-5 text-white" />
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-[13px] font-sans font-semibold text-[#E8E8E8]">
                                                    Star on GitHub
                                                </h4>
                                                <p className="text-[11px] font-sans text-[#8F8E8D] leading-normal font-medium">
                                                    Support December by starring our repository on
                                                    GitHub and following our roadmap.
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href="https://github.com/phasehumans/december"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-5 w-full py-1.5 rounded-[7px] bg-[#191919] border border-[#262626] text-[#9A9998] hover:text-[#E8E8E8] text-[11.5px] font-sans font-medium text-center cursor-pointer block select-none transition-transform duration-75 active:scale-[0.98] active:translate-y-[0.5px]"
                                        >
                                            Star on GitHub
                                        </a>
                                    </div>
                                )}

                                {/* Card 3: Feedback */}
                                {!isFeedbackDone && (
                                    <div className="relative flex flex-col justify-between p-4 rounded-[15px] bg-[#141414] border border-dashed border-[#333333] min-h-[172px] text-left">
                                        <button
                                            onClick={() => handleDismissCard('feedback')}
                                            className="absolute top-3 right-3 text-[#8F8E8D] hover:text-white transition-colors cursor-pointer"
                                            title="Dismiss card"
                                        >
                                            <Icons.X className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="flex flex-col gap-2.5">
                                            <MessageSquare className="w-5 h-5 text-white" />
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-[13px] font-sans font-semibold text-[#E8E8E8]">
                                                    Give feedback
                                                </h4>
                                                <p className="text-[11px] font-sans text-[#8F8E8D] leading-normal font-medium">
                                                    Help us improve December by sharing your
                                                    thoughts and feature requests.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={
                                                isAuthenticated
                                                    ? () => setShowFeedbackModal(true)
                                                    : onOpenAuth
                                            }
                                            className="mt-5 w-full py-1.5 rounded-[7px] bg-[#191919] border border-[#262626] text-[#9A9998] hover:text-[#E8E8E8] text-[11.5px] font-sans font-medium text-center cursor-pointer select-none transition-transform duration-75 active:scale-[0.98] active:translate-y-[0.5px]"
                                        >
                                            Share feedback
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Minimal Mobile Notice: Best experience on desktop (Option B) */}
            <div className="md:hidden fixed bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-1.5 text-[11px] font-sans font-medium text-[#666666] pointer-events-none select-none tracking-tight">
                <Laptop className="w-3 h-3 text-[#666666]" />
                <span>Best experience on desktop</span>
            </div>

            <OutOfCreditsModal
                isOpen={showOutOfCreditsModal || showUpgradeModal}
                onClose={() => {
                    setShowOutOfCreditsModal(false)
                    setShowUpgradeModal(false)
                }}
            />

            <OnboardingModal
                isOpen={showOnboarding}
                onClose={() => {
                    completeOnboardingMutation.mutate()
                    setShowOnboarding(false)
                }}
                onConfirm={() => {
                    completeOnboardingMutation.mutate()
                    setShowOnboarding(false)
                }}
            />

            <ProfileFeedbackModal
                isOpen={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
            />
        </main>
    )
}
