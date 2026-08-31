import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Volume1, Volume2, VolumeX, FilePlus, Trash2, Loader2, FileText, Save } from 'lucide-react'
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
    generationSound: 'FIRST_GENERATION' | 'ALWAYS' | 'NEVER'
    onGenerationSoundChange: (value: 'FIRST_GENERATION' | 'ALWAYS' | 'NEVER') => void
}

export const ProfileGeneralSettings: React.FC<ProfileGeneralSettingsProps> = ({
    generationSound,
    onGenerationSoundChange,
}) => {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    // --- rules ---
    const rulesQuery = useQuery({
        queryKey: ['profile', 'rules'],
        queryFn: profileAPI.getRules,
    })

    const [rulesText, setRulesText] = useState('')
    const [rulesActive, setRulesActive] = useState(false)
    const [rulesDirty, setRulesDirty] = useState(false)

    useEffect(() => {
        if (rulesQuery.data?.rules) {
            setRulesText(rulesQuery.data.rules)
            setRulesActive(true)
        }
    }, [rulesQuery.data])

    const updateRulesMutation = useMutation({
        mutationFn: profileAPI.updateRules,
        onSuccess: () => {
            setRulesDirty(false)
            queryClient.invalidateQueries({ queryKey: ['profile', 'rules'] })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })

    const deleteRulesMutation = useMutation({
        mutationFn: profileAPI.deleteRules,
        onSuccess: () => {
            setRulesText('')
            setRulesActive(false)
            setRulesDirty(false)
            queryClient.invalidateQueries({ queryKey: ['profile', 'rules'] })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })

    const defaultRulesContent = `---
name: Custom Rules
description: Persistent instructions defining custom rules for how december should operate.
---

# Custom Rules
Use this template file to specify coding styles, design tokens, architecture patterns, and custom behavior rules for december to follow.`

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* preferences */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-4">Preferences</h1>
                <div className="flex flex-col gap-7 border-t border-[#242323] pt-6">
                    {/* completion sound */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                        <div className="flex flex-col gap-0.5 max-w-full sm:max-w-[60%]">
                            <span className="text-[14px] text-[#D6D5C9]">Completion sound</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Plays a satisfying sound notification when a generation is finished.
                            </span>
                        </div>
                        <div className="flex flex-col gap-2.5 sm:gap-3 shrink-0 pt-1 sm:pt-0">
                            <button
                                onClick={() => {
                                    onGenerationSoundChange('FIRST_GENERATION')
                                    playGenerationSoundPreview()
                                }}
                                className="flex items-center gap-3 text-[13px] font-medium group focus:outline-none cursor-pointer"
                            >
                                <div
                                    className={`flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] transition-all duration-200 shrink-0 ${generationSound === 'FIRST_GENERATION' ? 'border-[#87B2F4]' : 'border-[#383736] group-hover:border-[#7B7A79]'}`}
                                >
                                    {generationSound === 'FIRST_GENERATION' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#87B2F4] animate-in zoom-in duration-200" />
                                    )}
                                </div>
                                <Volume1
                                    className={`w-4 h-4 shrink-0 transition-colors duration-200 ${generationSound === 'FIRST_GENERATION' ? 'text-[#87B2F4]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                />
                                <span
                                    className={`transition-colors duration-200 whitespace-nowrap ${generationSound === 'FIRST_GENERATION' ? 'text-[#D6D5C9]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                >
                                    First generation
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    onGenerationSoundChange('ALWAYS')
                                    playGenerationSoundPreview()
                                }}
                                className="flex items-center gap-3 text-[13px] font-medium group focus:outline-none cursor-pointer"
                            >
                                <div
                                    className={`flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] transition-all duration-200 shrink-0 ${generationSound === 'ALWAYS' ? 'border-[#87B2F4]' : 'border-[#383736] group-hover:border-[#7B7A79]'}`}
                                >
                                    {generationSound === 'ALWAYS' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#87B2F4] animate-in zoom-in duration-200" />
                                    )}
                                </div>
                                <Volume2
                                    className={`w-4 h-4 shrink-0 transition-colors duration-200 ${generationSound === 'ALWAYS' ? 'text-[#87B2F4]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                />
                                <span
                                    className={`transition-colors duration-200 whitespace-nowrap ${generationSound === 'ALWAYS' ? 'text-[#D6D5C9]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                >
                                    Always
                                </span>
                            </button>
                            <button
                                onClick={() => onGenerationSoundChange('NEVER')}
                                className="flex items-center gap-3 text-[13px] font-medium group focus:outline-none cursor-pointer"
                            >
                                <div
                                    className={`flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] transition-all duration-200 shrink-0 ${generationSound === 'NEVER' ? 'border-[#87B2F4]' : 'border-[#383736] group-hover:border-[#7B7A79]'}`}
                                >
                                    {generationSound === 'NEVER' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#87B2F4] animate-in zoom-in duration-200" />
                                    )}
                                </div>
                                <VolumeX
                                    className={`w-4 h-4 shrink-0 transition-colors duration-200 ${generationSound === 'NEVER' ? 'text-[#87B2F4]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                />
                                <span
                                    className={`transition-colors duration-200 whitespace-nowrap ${generationSound === 'NEVER' ? 'text-[#D6D5C9]' : 'text-[#7B7A79] group-hover:text-[#D6D5C9]'}`}
                                >
                                    Never
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* custom rules */}
            <div className="flex flex-col mb-10">
                <h1 className="text-[16px] font-medium mb-4">Custom Rules</h1>
                <div className="flex flex-col gap-4 border-t border-[#242323] pt-6">
                    <p className="text-[13px] text-[#7B7A79] mb-4 leading-relaxed">
                        Create reusable guidelines and custom rules that december can apply during
                        conversations. Each rules configuration defines persistent instructions for
                        december.
                    </p>

                    {!rulesActive ? (
                        <div>
                            <button
                                onClick={() => {
                                    setRulesActive(true)
                                    if (!rulesText) {
                                        setRulesText(defaultRulesContent)
                                        setRulesDirty(true)
                                    }
                                }}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#191919] hover:bg-[#242323] border border-[#383736] text-[13px] font-medium text-[#D6D5C9] hover:text-white transition-colors cursor-pointer w-fit"
                            >
                                <FilePlus className="w-4 h-4 text-[#87B2F4]" />
                                <span>Create rules.md</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col border-0 sm:border sm:border-[#242323] rounded-none sm:rounded-xl bg-transparent sm:bg-[#141414] overflow-visible sm:overflow-hidden transition-all">
                            {/* Editor Header Bar */}
                            <div className="flex items-center justify-between px-0 sm:px-4 py-0 sm:py-2.5 mb-2.5 sm:mb-0 bg-transparent sm:bg-[#191919] border-0 sm:border-b sm:border-[#242323]">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#87B2F4]" />
                                    <span className="text-[13px] font-medium text-[#D6D5C9]">
                                        rules.md
                                    </span>
                                </div>
                                <span className="text-[11px] font-mono text-[#7B7A79] bg-[#191919] sm:bg-[#100E12] px-2 py-0.5 rounded border border-[#242323]">
                                    {rulesText.length} chars
                                </span>
                            </div>

                            {/* Editor Code Area */}
                            <textarea
                                className="w-full h-[280px] sm:h-[380px] bg-[#191919] sm:bg-transparent border border-[#242323] sm:border-0 rounded-xl sm:rounded-none p-3.5 sm:p-4 text-[13px] text-[#D6D5C9] placeholder:text-[#7B7A79] font-mono leading-relaxed resize-none focus:outline-none focus:border-[#383736] sm:focus:border-transparent transition-colors caret-[#87B2F4] selection:bg-[#2B2B2B] no-scrollbar"
                                spellCheck={false}
                                value={rulesText}
                                onChange={(e) => {
                                    setRulesText(e.target.value)
                                    setRulesDirty(true)
                                }}
                                placeholder="Enter custom rules and instructions..."
                            ></textarea>

                            {/* Editor Footer Bar */}
                            <div className="flex items-center justify-between px-0 sm:px-4 py-0 sm:py-2.5 mt-2.5 sm:mt-0 bg-transparent sm:bg-[#191919] border-0 sm:border-t sm:border-[#242323]">
                                <span className="text-[12px] text-[#7B7A79] hidden sm:inline">
                                    Persistent rules for december
                                </span>
                                <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
                                    <button
                                        onClick={() => deleteRulesMutation.mutate()}
                                        disabled={deleteRulesMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-[#7B7A79] hover:text-red-400 transition-colors rounded-lg disabled:opacity-30 cursor-pointer"
                                    >
                                        {deleteRulesMutation.isPending ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                        <span>Delete</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (rulesText.trim()) {
                                                updateRulesMutation.mutate({
                                                    rules: rulesText,
                                                })
                                            }
                                        }}
                                        disabled={!rulesDirty || updateRulesMutation.isPending}
                                        className={`px-3.5 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                            rulesDirty
                                                ? 'border-[#87B2F4] bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF]'
                                                : 'border-[#383736] bg-[#191919] text-[#D6D5C9] hover:bg-[#242323]'
                                        }`}
                                    >
                                        {updateRulesMutation.isPending ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                                        ) : (
                                            <Save className="w-3.5 h-3.5 text-current" />
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
