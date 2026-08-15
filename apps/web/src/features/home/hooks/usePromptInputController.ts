import { useQuery } from '@tanstack/react-query'
import { Code2, Puzzle, KeyRound, Folder } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'

import { profileAPI } from '@/features/profile/api/profile'
import { Icons } from '@/shared/components/ui/Icons'

export const MENTION_PROVIDERS = [
    {
        id: 'repos',
        trigger: 'repos:',
        icon: Icons.Github,
        title: 'Repositories',
        description: 'All repositories added to December',
    },
    {
        id: 'files',
        trigger: 'files:',
        icon: Code2,
        title: 'Codebase files',
        description: 'All indexed files',
    },
    {
        id: 'sessions',
        trigger: 'sessions:',
        icon: Folder,
        title: 'Sessions',
        description: 'Your previous sessions',
    },
    {
        id: 'skills',
        trigger: 'skills:',
        icon: Puzzle,
        title: 'Skills',
        description: 'Available skills from repos',
    },
    {
        id: 'secrets',
        trigger: 'secrets:',
        icon: KeyRound,
        title: 'Secrets',
        description: 'Your stored secrets',
    },
    {
        id: 'send_secrets',
        trigger: 'send-secrets:',
        icon: KeyRound, // Will rotate this in UI if needed
        title: 'Send secrets',
        description: 'Send a secret to a user',
    },
]

export const usePromptInputController = ({
    value,
    onChange,
    onSubmit,
    isAuthenticated,
    onOpenAuth,
    isLoading,
}: {
    value?: string
    onChange?: (val: string) => void
    onSubmit: (val: string) => void
    isAuthenticated?: boolean
    onOpenAuth?: () => void
    isLoading?: boolean
}) => {
    const [internalInput, setInternalInput] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [cursorPosition, setCursorPosition] = useState<number | null>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [selectedRepos, setSelectedRepos] = useState<any[]>([])
    const [forceClose, setForceClose] = useState(false)
    const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom')
    const voiceBaseRef = useRef('')
    const isVoiceActiveRef = useRef(false)

    const isControlled = value !== undefined
    const input = isControlled ? value : internalInput

    const handleAuthCheck = (action: () => void) => {
        if (!isAuthenticated && onOpenAuth) {
            onOpenAuth()
            return
        }
        action()
    }

    const handleInputChange = useCallback(
        (val: string) => {
            if (!isControlled) {
                setInternalInput(val)
            }
            onChange?.(val)
        },
        [isControlled, onChange]
    )

    const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)
    }

    const currentCursor = cursorPosition !== null ? cursorPosition : input.length
    const textBeforeCursor = input.slice(0, currentCursor)
    const reposMatch = textBeforeCursor?.match(/@repos:([^\s]*)$/)
    const isReposTriggered = !!reposMatch
    const repoSearchQuery = reposMatch ? reposMatch[1].toLowerCase() : ''

    const atMatch = textBeforeCursor?.match(/@([a-zA-Z0-9_-]*)$/)
    const isAtTriggered = !!atMatch && !atMatch[0].includes(':')
    const atSearchQuery = isAtTriggered ? atMatch[1].toLowerCase() : ''
    const filteredProviders = MENTION_PROVIDERS.filter(
        (p) =>
            p.title.toLowerCase().includes(atSearchQuery) ||
            p.id.toLowerCase().includes(atSearchQuery)
    )

    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
        enabled: isReposTriggered && !!isAuthenticated,
    })

    const { data: quickInfo } = useQuery({
        queryKey: ['quickinfo'],
        queryFn: profileAPI.getQuickInfo,
        enabled: isReposTriggered && !!isAuthenticated,
    })

    const isGithubConnected = profile?.githubConnected || (quickInfo?.githubConnected ?? false)

    const { data: repos = [], isLoading: isReposLoading } = useQuery({
        queryKey: ['github-repos'],
        queryFn: profileAPI.getGithubRepos,
        enabled: isReposTriggered && isGithubConnected,
    })

    const filteredRepos = repos.filter(
        (repo) =>
            repo.name.toLowerCase().includes(repoSearchQuery) ||
            repo.owner.login.toLowerCase().includes(repoSearchQuery)
    )

    useEffect(() => {
        setSelectedIndex(0)
    }, [atSearchQuery, repoSearchQuery, isAtTriggered, isReposTriggered])

    useEffect(() => {
        setForceClose(false)
    }, [input])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setForceClose(true)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if ((isAtTriggered || isReposTriggered) && textareaRef.current) {
            const rect = textareaRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            if (spaceBelow < 320 && rect.top > spaceBelow) {
                setDropdownPosition('top')
            } else {
                setDropdownPosition('bottom')
            }
        }
    }, [isAtTriggered, isReposTriggered])

    useEffect(() => {
        if (dropdownRef.current) {
            const activeEl = dropdownRef.current.querySelector(
                '.dropdown-item-active'
            ) as HTMLElement
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [selectedIndex])

    useEffect(() => {
        if (textareaRef.current) {
            const container = document.getElementById('main-scroll-container')
            const scrollPos = container?.scrollTop

            textareaRef.current.style.height = '0px'
            const scrollHeight = textareaRef.current.scrollHeight

            textareaRef.current.style.height = `${Math.min(scrollHeight, 400)}px`
            textareaRef.current.style.overflowY = scrollHeight >= 400 ? 'auto' : 'hidden'

            if (container && scrollPos !== undefined) {
                container.scrollTop = scrollPos
            }

            if (input?.endsWith('@repos:') && document.activeElement !== textareaRef.current) {
                textareaRef.current.focus()
                const len = input.length
                textareaRef.current.setSelectionRange(len, len)
                setCursorPosition(len)
            }
        }
    }, [input])

    const handleSubmit = (event?: React.FormEvent) => {
        event?.preventDefault()
        handleAuthCheck(() => {
            if ((!input?.trim() && selectedRepos.length === 0) || isLoading) return

            let finalPrompt = input || ''
            if (selectedRepos.length > 0) {
                const repoUrls = selectedRepos.map((r) => r.htmlUrl).join('\n')
                finalPrompt = finalPrompt.trim() ? `${repoUrls}\n\n${finalPrompt}` : repoUrls
            }

            onSubmit(finalPrompt)
            if (!isControlled) setInternalInput('')
            onChange?.('')
            setSelectedRepos([])
            if (textareaRef.current) textareaRef.current.style.height = 'auto'
        })
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
        const isDropdownOpen = (isAtTriggered && !isReposTriggered) || isReposTriggered
        const currentOptionsCount = isReposTriggered
            ? Math.min(filteredRepos.length, 10)
            : filteredProviders.length

        if (isDropdownOpen && currentOptionsCount > 0 && !forceClose) {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % currentOptionsCount)
                return
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + currentOptionsCount) % currentOptionsCount)
                return
            }
            if (event.key === 'Enter') {
                event.preventDefault()
                if (isReposTriggered) {
                    const repo = filteredRepos[selectedIndex]
                    if (repo) {
                        const newValue = (input || '').replace(/@repos:[^\s]*$/, '')
                        handleInputChange(newValue)
                        if (!selectedRepos.some((r) => r.id === repo.id)) {
                            setSelectedRepos((prev) => [...prev, repo])
                        }
                    }
                } else if (isAtTriggered) {
                    const provider = filteredProviders[selectedIndex]
                    if (provider) {
                        const newValue = (input || '').replace(
                            /@[a-zA-Z0-9_-]*$/,
                            `@${provider.trigger}`
                        )
                        handleInputChange(newValue)
                    }
                }
                return
            }
        }

        if (event.key === 'Backspace' && !input && selectedRepos.length > 0) {
            setSelectedRepos((prev) => prev.slice(0, -1))
            return
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            handleSubmit()
        }
    }

    const handleVoiceTranscript = useCallback(
        (text: string) => {
            if (!isVoiceActiveRef.current) {
                voiceBaseRef.current = isControlled ? value || '' : internalInput
                isVoiceActiveRef.current = true
            }
            const base = voiceBaseRef.current
            const separator = base && !base.endsWith(' ') ? ' ' : ''
            const newValue = base + separator + text
            handleInputChange(newValue)
        },
        [isControlled, value, internalInput, handleInputChange]
    )

    const handleVoiceStateChange = useCallback((isListening: boolean) => {
        if (!isListening) {
            isVoiceActiveRef.current = false
        }
    }, [])

    return {
        input,
        textareaRef,
        dropdownRef,
        selectedIndex,
        setSelectedIndex,
        selectedRepos,
        setSelectedRepos,
        forceClose,
        dropdownPosition,
        isAtTriggered,
        isReposTriggered,
        filteredProviders,
        filteredRepos,
        isGithubConnected,
        isReposLoading,
        handleInputChange,
        handleSelect,
        handleSubmit,
        handleKeyDown,
        handleVoiceTranscript,
        handleVoiceStateChange,
        handleAuthCheck,
    }
}
