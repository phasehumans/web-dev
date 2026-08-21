import React, { useState } from 'react'

interface LandingHeroProps {
    onLaunchApp: () => void
    youtubeVideoId?: string
}

export const LandingHero: React.FC<LandingHeroProps> = ({
    onLaunchApp,
    youtubeVideoId = 'dQw4w9WgXcQ', // default placeholder YouTube video id, easily updated
}) => {
    const [copied, setCopied] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText('npm install -g @trydecember/cli')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <section className="relative w-full pt-32 pb-20 px-6 overflow-hidden flex flex-col items-center text-center bg-[#FFFFFF]">
            {/* Subtle grid pattern */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.45]"
                style={{
                    backgroundImage: `radial-gradient(#E4E4E7 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                }}
            />

            {/* Gradient glow at the top */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[820px] h-[420px] bg-[#87B2F4]/20 blur-[130px] rounded-full pointer-events-none -z-10" />

            <div className="relative z-10 max-w-[960px] mx-auto flex flex-col items-center">
                {/* Announcement Chip (supermemory style) */}
                <a
                    href="#handoff-section"
                    className="group mb-7 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#87B2F4]/60 bg-[#87B2F4]/15 hover:bg-[#87B2F4]/25 transition-all text-[12.5px] font-medium text-[#0B1015] shadow-[0_2px_8px_rgba(135,178,244,0.15)]"
                >
                    <span className="flex h-2 w-2 rounded-full bg-[#87B2F4] animate-pulse" />
                    <span className="font-semibold text-[#0B1015] bg-[#87B2F4] px-2 py-0.5 rounded text-[11px] shadow-sm">
                        New
                    </span>
                    <span className="text-[#87B2F4] font-bold">/</span>
                    <span className="text-[#1F2937]">CLI-to-Cloud Session Handoff is now live</span>
                    <svg
                        viewBox="0 0 12 12"
                        className="w-3 h-3 text-[#87B2F4] transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                        <path
                            d="M3 6h6m0 0L6 3m3 3L6 9"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    </svg>
                </a>

                {/* Main Headline */}
                <h1 className="font-sans font-semibold text-[#0B1015] text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.05] tracking-[-0.045em] max-w-[900px] mb-6">
                    The autonomous AI coding agent for{' '}
                    <span className="relative inline-block text-[#0B1015] bg-[#87B2F4]/25 px-2.5 py-0.5 rounded-lg border border-[#87B2F4]/60 shadow-sm">
                        terminal
                    </span>{' '}
                    &amp;{' '}
                    <span className="relative inline-block text-[#0B1015] bg-[#87B2F4]/25 px-2.5 py-0.5 rounded-lg border border-[#87B2F4]/60 shadow-sm">
                        cloud
                    </span>
                    <span className="text-[#87B2F4]">.</span>
                </h1>

                {/* Subtitle */}
                <p className="font-sans text-[16px] sm:text-[18px] text-[#52525B] leading-relaxed max-w-[660px] mb-9 font-normal">
                    Plan, code, and self-verify autonomously — locally in your interactive terminal
                    TUI or remotely inside isolated Linux microVM sandboxes with live preview and
                    GitHub PRs.
                </p>

                {/* Dual CTAs (supermemory style) */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-[500px] mb-14">
                    {/* Primary Button */}
                    <button
                        onClick={onLaunchApp}
                        className="w-full sm:w-auto flex-1 h-[48px] px-6 rounded-lg bg-[#87B2F4] hover:bg-[#9EC1F7] text-[#0B1015] text-[15px] font-semibold shadow-[0_4px_20px_rgba(135,178,244,0.45)] border border-[#87B2F4] flex items-center justify-center gap-2 group transition-all cursor-pointer hover:scale-[1.02]"
                    >
                        <span>Start on Cloud</span>
                        <svg
                            viewBox="0 0 14 14"
                            className="w-4 h-4 text-[#0B1015] transition-transform duration-200 group-hover:translate-x-1"
                        >
                            <path
                                d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                        </svg>
                    </button>

                    {/* NPM Install Pill with 1-click copy */}
                    <button
                        onClick={handleCopy}
                        className="w-full sm:w-auto flex-1 h-[48px] px-4 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-white hover:border-[#87B2F4] text-[13.5px] font-mono text-[#18181B] flex items-center justify-between gap-3 shadow-sm transition-all cursor-pointer group hover:shadow-[0_2px_12px_rgba(135,178,244,0.2)]"
                    >
                        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                            <span className="text-[#87B2F4] font-bold text-[15px] select-none">
                                $
                            </span>
                            <span className="truncate font-medium">npm i -g @trydecember/cli</span>
                        </div>
                        <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded bg-white border border-[#E4E4E7] text-[#52525B] group-hover:text-[#0B1015] group-hover:border-[#87B2F4]">
                            {copied ? '✓ Copied' : 'Copy'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Founder Explainer Video Section (id="founder-video") */}
            <div id="founder-video" className="w-full max-w-[1060px] mx-auto mt-4 px-2">
                <div className="relative rounded-2xl border-2 border-[#87B2F4]/30 bg-[#FAFAFA] p-2.5 sm:p-4 shadow-[0_12px_45px_-12px_rgba(135,178,244,0.2)]">
                    {/* Top Bar with window dots + title */}
                    <div className="flex items-center justify-between pb-3 px-2 border-b border-[#E4E4E7]/70 text-[#71717A] text-[12px] font-mono">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80" />
                            <span className="ml-2 font-sans font-medium text-[#27272A] hidden sm:inline">
                                December Overview &amp; Founder Walkthrough
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded bg-[#0B1015] text-[#87B2F4] font-mono text-[11px] font-semibold border border-[#87B2F4]/40 shadow-sm">
                                4K Video
                            </span>
                        </div>
                    </div>

                    {/* Video Container */}
                    <div className="relative mt-3 w-full aspect-video rounded-xl overflow-hidden bg-[#0B1015] border border-[#27272A]/40 flex items-center justify-center">
                        {isPlaying ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1`}
                                title="December Founder Walkthrough"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full border-0"
                            />
                        ) : (
                            <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-[#18181B] to-[#09090B]">
                                {/* Backdrop visual glow */}
                                <div className="absolute inset-0 bg-radial from-[#87B2F4]/20 via-[#87B2F4]/5 to-transparent pointer-events-none" />

                                {/* Play Button Overlay */}
                                <button
                                    onClick={() => setIsPlaying(true)}
                                    className="group relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#87B2F4] hover:bg-[#9EC1F7] text-[#0B1015] flex items-center justify-center shadow-[0_0_40px_rgba(135,178,244,0.6)] border-4 border-white/60 transition-all hover:scale-110 cursor-pointer mb-4"
                                    aria-label="Play Founder Video"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="w-9 h-9 sm:w-10 sm:h-10 ml-1 text-[#0B1015]"
                                    >
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </button>

                                <div className="relative z-10">
                                    <h3 className="text-white text-[18px] sm:text-[22px] font-semibold tracking-tight mb-1 font-sans">
                                        What is December? Full Technical Architecture
                                    </h3>
                                    <p className="text-[#A1A1AA] text-[13px] sm:text-[14px] max-w-[480px] font-sans">
                                        Watch the deep dive on how December runs autonomous coding
                                        sessions across local terminals and cloud sandboxes.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
