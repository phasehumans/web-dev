import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Volume1,
    Volume2,
    VolumeX,
    FilePlus,
    Trash2,
    Loader2,
    ExternalLink,
    FileText,
    Save,
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { profileAPI } from '@/features/profile/api/profile'

const playGenerationSoundPreview = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContext) {
            return
        }

        const ctx = new AudioContext()
        const now = ctx.currentTime

        const playBell = (freq: number, startTime: number, duration: number, vol: number) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            osc.type = 'triangle'
            osc.frequency.setValueAtTime(freq, startTime)

            const lfo = ctx.createOscillator()
            const lfoGain = ctx.createGain()
            lfo.frequency.value = 8
            lfoGain.gain.value = freq * 0.003
            lfo.connect(lfoGain)
            lfoGain.connect(osc.frequency)

            gain.gain.setValueAtTime(0, startTime)
            gain.gain.linearRampToValueAtTime(vol, startTime + 0.015)
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

            osc.connect(gain)
            gain.connect(ctx.destination)

            lfo.start(startTime)
            osc.start(startTime)

            lfo.stop(startTime + duration)
            osc.stop(startTime + duration)
        }

        const baseVolume = 0.28
        playBell(261.63, now, 1.2, baseVolume * 0.8)
        playBell(329.63, now + 0.055, 1.0, baseVolume * 0.9)
        playBell(392.0, now + 0.11, 0.9, baseVolume)
        playBell(523.25, now + 0.165, 0.8, baseVolume * 0.95)
        playBell(783.99, now + 0.22, 0.7, baseVolume * 0.7)
    } catch (err) {
        console.error('Failed to play generation notification sound:', err)
    }
}

interface ProfileGeneralSettingsProps {
    chatSuggestions: boolean
    generationSound: 'FIRST_GENERATION' | 'ALWAYS' | 'NEVER'
    onChatSuggestionsToggle: (value: boolean) => void
    onGenerationSoundChange: (value: 'FIRST_GENERATION' | 'ALWAYS' | 'NEVER') => void
}

export const ProfileGeneralSettings: React.FC<ProfileGeneralSettingsProps> = ({
    chatSuggestions,
    generationSound,
    onChatSuggestionsToggle,
    onGenerationSoundChange,
}) => {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    // --- design ---
    const designQuery = useQuery({
        queryKey: ['profile', 'design'],
        queryFn: profileAPI.getdesign,
    })

    const [designText, setdesignText] = useState('')
    const [designActive, setdesignActive] = useState(false)
    const [designDirty, setdesignDirty] = useState(false)

    useEffect(() => {
        if (designQuery.data?.design) {
            setdesignText(designQuery.data.design)
            setdesignActive(true)
        }
    }, [designQuery.data])

    const updatedesignMutation = useMutation({
        mutationFn: profileAPI.updatedesign,
        onSuccess: () => {
            setdesignDirty(false)
            queryClient.invalidateQueries({ queryKey: ['profile', 'design'] })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })

    const deletedesignMutation = useMutation({
        mutationFn: profileAPI.deletedesign,
        onSuccess: () => {
            setdesignText('')
            setdesignActive(false)
            setdesignDirty(false)
            queryClient.invalidateQueries({ queryKey: ['profile', 'design'] })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })

    const defaultdesignContent = `---
name: Custom Design
description: Persistent instructions defining custom rules for how december should generate layouts and components.
---

# Custom Design Rules
Use this template file to specify coding styles, design tokens, responsive grids, and layout rules for december to follow.`

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* preferences */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-4">Preferences</h1>
                <div className="flex flex-col gap-7 border-t border-[#242323] pt-6">
                    {/* chat suggestions */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-[#D6D5C9]">Chat suggestions</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Show helpful suggestions in the chat interface to enhance your
                                experience.
                            </span>
                        </div>
                        <button
                            role="switch"
                            onClick={() => onChatSuggestionsToggle(!chatSuggestions)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                chatSuggestions ? 'bg-[#87B2F4]' : 'bg-[#100E12] border-[#383736]'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                    chatSuggestions
                                        ? 'translate-x-4 bg-[#100E12]'
                                        : 'translate-x-0 bg-[#383736]'
                                }`}
                            />
                        </button>
                    </div>

                    {/* generation complete sound */}
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-0.5 max-w-[60%]">
                            <span className="text-[14px] text-[#D6D5C9]">
                                Generation complete sound
                            </span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Plays a satisfying sound notification when a generation is finished.
                            </span>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    onGenerationSoundChange('FIRST_GENERATION')
                                    playGenerationSoundPreview()
                                }}
                                className="flex items-center gap-3 text-[13px] font-medium group focus:outline-none"
                            >
                                <div
                                    className={`flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] transition-all duration-200 ${generationSound === 'FIRST_GENERATION' ? 'border-[#87B2F4]' : 'border-[#383736] group-hover:border-[#7B7A79]'}`}
                                >
                                    {generationSound === 'FIRST_GENERATION' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#87B2F4] animate-in zoom-in duration-200" />
                                    )}
                                </div>
                                <Volume1
                                    className={`w-4 h-4 transition-colors duration-200 ${generationSound === 'FIRST_GENERATION' ? 'text-[#87B2F4]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                />
                                <span
                                    className={`transition-colors duration-200 ${generationSound === 'FIRST_GENERATION' ? 'text-[#D6D5C9]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                >
                                    First generation
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    onGenerationSoundChange('ALWAYS')
                                    playGenerationSoundPreview()
                                }}
                                className="flex items-center gap-3 text-[13px] font-medium group focus:outline-none"
                            >
                                <div
                                    className={`flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] transition-all duration-200 ${generationSound === 'ALWAYS' ? 'border-[#87B2F4]' : 'border-[#383736] group-hover:border-[#7B7A79]'}`}
                                >
                                    {generationSound === 'ALWAYS' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#87B2F4] animate-in zoom-in duration-200" />
                                    )}
                                </div>
                                <Volume2
                                    className={`w-4 h-4 transition-colors duration-200 ${generationSound === 'ALWAYS' ? 'text-[#87B2F4]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                />
                                <span
                                    className={`transition-colors duration-200 ${generationSound === 'ALWAYS' ? 'text-[#D6D5C9]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                >
                                    Always
                                </span>
                            </button>
                            <button
                                onClick={() => onGenerationSoundChange('NEVER')}
                                className="flex items-center gap-3 text-[13px] font-medium group focus:outline-none"
                            >
                                <div
                                    className={`flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] transition-all duration-200 ${generationSound === 'NEVER' ? 'border-[#87B2F4]' : 'border-[#383736] group-hover:border-[#7B7A79]'}`}
                                >
                                    {generationSound === 'NEVER' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#87B2F4] animate-in zoom-in duration-200" />
                                    )}
                                </div>
                                <VolumeX
                                    className={`w-4 h-4 transition-colors duration-200 ${generationSound === 'NEVER' ? 'text-[#87B2F4]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                />
                                <span
                                    className={`transition-colors duration-200 ${generationSound === 'NEVER' ? 'text-[#D6D5C9]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                >
                                    Never
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* custom design */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-4">Custom Design</h1>
                <div className="flex flex-col gap-4 border-t border-[#242323] pt-6">
                    <p className="text-[13px] text-[#7B7A79] mb-4 leading-relaxed">
                        Create reusable design guidelines that december can apply during
                        conversations. Each design has a design.md that defines custom layout rules
                        and triggers.{' '}
                        <a
                            href="/docs#custom-design"
                            onClick={(e) => {
                                e.preventDefault()
                                navigate('/docs#custom-design')
                            }}
                            className="inline-flex items-center gap-1.5 text-[#87B2F4] hover:text-[#87B2F4]/80 transition-colors"
                        >
                            View sample design.md in docs
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </p>

                    {!designActive ? (
                        <div>
                            <button
                                onClick={() => {
                                    setdesignActive(true)
                                    if (!designText) {
                                        setdesignText(defaultdesignContent)
                                        setdesignDirty(true)
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#282828] border border-[#282828] text-[12.5px] font-medium text-[#D6D5C9] hover:text-white transition-colors cursor-pointer w-fit"
                            >
                                <FilePlus className="w-3.5 h-3.5" />
                                <span>Create design.md</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col border border-[#282828] rounded-xl overflow-hidden bg-[#202020] transition-all">
                            {/* Editor Header Bar */}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-[#202020] border-b border-[#282828]">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#87B2F4]" />
                                    <span className="text-[13px] font-medium text-[#D6D5C9]">
                                        design.md
                                    </span>
                                </div>
                                <span className="text-[11px] font-mono text-[#7B7A79] bg-[#181818] px-2 py-0.5 rounded border border-[#282828]">
                                    {designText.length} chars
                                </span>
                            </div>

                            {/* Editor Code Area */}
                            <textarea
                                className="w-full h-[450px] bg-[#181818] p-4 text-[13px] text-[#D6D5C9] placeholder:text-[#7B7A79] font-mono leading-[1.7] resize-none focus:outline-none transition-colors caret-[#87B2F4] selection:bg-[#2B2B2B] no-scrollbar border-none"
                                spellCheck={false}
                                value={designText}
                                onChange={(e) => {
                                    setdesignText(e.target.value)
                                    setdesignDirty(true)
                                }}
                                placeholder="Enter custom layout rules and instructions..."
                            ></textarea>

                            {/* Editor Footer Bar */}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-[#202020] border-t border-[#282828]">
                                <span className="text-[12px] text-[#7B7A79]">
                                    Persistent layout rules for december
                                </span>
                                <div className="flex items-center gap-2.5">
                                    <button
                                        onClick={() => deletedesignMutation.mutate()}
                                        disabled={deletedesignMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-[#7B7A79] hover:text-red-400 transition-colors rounded-lg disabled:opacity-30 cursor-pointer"
                                    >
                                        {deletedesignMutation.isPending ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                        <span>Delete</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (designText.trim()) {
                                                updatedesignMutation.mutate({
                                                    design: designText,
                                                })
                                            }
                                        }}
                                        disabled={!designDirty || updatedesignMutation.isPending}
                                        className="px-4 py-1.5 rounded-lg bg-[#181818] hover:bg-[#282828] border border-[#282828] text-[12.5px] font-medium text-[#D6D5C9] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                                    >
                                        {updatedesignMutation.isPending ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#87B2F4]" />
                                        ) : (
                                            <Save className="w-3.5 h-3.5 text-[#87B2F4]" />
                                        )}
                                        <span>Save</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
