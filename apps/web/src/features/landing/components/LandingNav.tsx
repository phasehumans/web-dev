import React, { useState } from 'react'

import { Icons } from '@/shared/components/ui/Icons'

interface LandingNavProps {
    onLaunchApp: () => void
    onSignIn: () => void
}

export const LandingNav: React.FC<LandingNavProps> = ({ onLaunchApp, onSignIn }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[#E4E4E7] bg-white/90 backdrop-blur-md transition-all">
            <div className="mx-auto w-full max-w-[1232px] px-6 py-3.5 flex items-center justify-between">
                {/* Brand Logo */}
                <a href="/" className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-lg bg-[#0B1015] flex items-center justify-center text-white transition-transform group-hover:scale-105 shadow-sm">
                        <Icons.DecemberLogo className="w-5 h-5 text-white" strokeWidth={1.2} />
                    </div>
                    <div className="flex items-center gap-1.5 font-sans">
                        <span className="text-[19px] font-semibold tracking-tight text-[#0B1015]">
                            December
                        </span>
                        <span className="text-[10px] uppercase font-mono font-medium tracking-widest px-1.5 py-0.5 rounded bg-[#0B1015] text-[#87B2F4] border border-[#87B2F4]/40">
                            Agent
                        </span>
                    </div>
                </a>

                {/* Desktop Nav Links */}
                <div className="hidden lg:flex items-center gap-7">
                    <a
                        href="#cli-section"
                        className="text-[14px] font-medium text-[#52525B] hover:text-[#0B1015] transition-colors"
                    >
                        CLI
                    </a>
                    <a
                        href="#cloud-section"
                        className="text-[14px] font-medium text-[#52525B] hover:text-[#0B1015] transition-colors"
                    >
                        Cloud
                    </a>
                    <a
                        href="#handoff-section"
                        className="text-[14px] font-medium text-[#52525B] hover:text-[#0B1015] transition-colors"
                    >
                        Handoff
                    </a>
                    <a
                        href="#mcp-architecture"
                        className="text-[14px] font-medium text-[#52525B] hover:text-[#0B1015] transition-colors"
                    >
                        MCP
                    </a>
                    <a
                        href="#faq-section"
                        className="text-[14px] font-medium text-[#52525B] hover:text-[#0B1015] transition-colors"
                    >
                        FAQ
                    </a>
                    <a
                        href="/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] font-medium text-[#52525B] hover:text-[#0B1015] transition-colors flex items-center gap-1"
                    >
                        Docs
                        <svg className="w-3 h-3 text-[#A1A1AA]" viewBox="0 0 12 12" fill="none">
                            <path
                                d="M3.5 8.5L8.5 3.5M8.5 3.5H4.5M8.5 3.5V7.5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </a>
                </div>

                {/* Right CTAs */}
                <div className="flex items-center gap-3">
                    <a
                        href="https://github.com/phasehumans/december"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E4E4E7] bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[13px] font-medium text-[#18181B] transition-colors"
                        title="GitHub Star"
                    >
                        <Icons.Github className="w-4 h-4 text-[#18181B]" />
                        <span>Star</span>
                    </a>

                    <button
                        onClick={onSignIn}
                        className="hidden sm:inline-flex text-[14px] font-medium text-[#52525B] hover:text-[#0B1015] px-3 py-1.5 transition-colors cursor-pointer"
                    >
                        Sign in
                    </button>

                    <button
                        onClick={onLaunchApp}
                        className="group inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-[#87B2F4] hover:bg-[#9EC1F7] text-[#0B1015] text-[13.5px] font-semibold shadow-[0_2px_12px_rgba(135,178,244,0.35)] border border-[#87B2F4] transition-all cursor-pointer hover:scale-[1.02]"
                    >
                        <span>Launch Web</span>
                        <svg
                            viewBox="0 0 14 14"
                            className="w-3.5 h-3.5 text-[#0B1015] transition-transform duration-200 group-hover:translate-x-0.5"
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

                    {/* Mobile menu trigger */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden p-2 text-[#52525B] hover:text-[#0B1015]"
                        aria-label="Toggle menu"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {isMobileMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {isMobileMenuOpen && (
                <div className="lg:hidden border-t border-[#E4E4E7] bg-white px-6 py-4 flex flex-col gap-3 shadow-lg">
                    <a
                        href="#founder-video"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-[14px] font-medium text-[#52525B] py-1"
                    >
                        Overview
                    </a>
                    <a
                        href="#cli-section"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-[14px] font-medium text-[#52525B] py-1"
                    >
                        CLI TUI
                    </a>
                    <a
                        href="#cloud-section"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-[14px] font-medium text-[#52525B] py-1"
                    >
                        Cloud MicroVM
                    </a>
                    <a
                        href="#handoff-section"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-[14px] font-medium text-[#52525B] py-1"
                    >
                        Session Handoff
                    </a>
                    <a
                        href="#mcp-architecture"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-[14px] font-medium text-[#52525B] py-1"
                    >
                        MCP Tools
                    </a>
                    <a
                        href="#faq-section"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-[14px] font-medium text-[#52525B] py-1"
                    >
                        FAQ
                    </a>
                    <div className="pt-2 border-t border-[#E4E4E7] flex flex-col gap-2">
                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false)
                                onSignIn()
                            }}
                            className="w-full py-2 text-center text-[14px] font-medium text-[#18181B] bg-[#F4F4F5] rounded-lg"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false)
                                onLaunchApp()
                            }}
                            className="w-full py-2 text-center text-[14px] font-semibold text-[#0B1015] bg-[#87B2F4] hover:bg-[#9EC1F7] rounded-lg shadow-sm"
                        >
                            Launch Web
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}
