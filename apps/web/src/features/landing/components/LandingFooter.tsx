import React from 'react'

import { Icons } from '@/shared/components/ui/Icons'

interface LandingFooterProps {
    onLaunchApp: () => void
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onLaunchApp }) => {
    return (
        <footer className="w-full border-t border-[#E4E4E7] bg-white pt-16 pb-12 px-6">
            <div className="max-w-[1232px] mx-auto">
                {/* Big Bottom CTA Card */}
                <div className="rounded-2xl border-2 border-[#87B2F4]/40 bg-gradient-to-b from-white via-[#87B2F4]/10 to-[#87B2F4]/15 p-8 sm:p-12 text-center flex flex-col items-center mb-16 shadow-[0_12px_45px_-12px_rgba(135,178,244,0.3)] relative overflow-hidden">
                    <div className="w-12 h-12 rounded-xl bg-[#0B1015] border border-[#87B2F4]/40 flex items-center justify-center text-white mb-6 shadow-md">
                        <Icons.DecemberLogo className="w-7 h-7 text-[#87B2F4]" strokeWidth={1.2} />
                    </div>

                    <h2 className="font-sans font-semibold text-[30px] sm:text-[42px] leading-[1.12] tracking-[-0.035em] text-[#0B1015] mb-4 max-w-[620px]">
                        Start building autonomously with December today.
                    </h2>

                    <p className="font-sans text-[16px] text-[#52525B] max-w-[500px] mb-8">
                        Experience the speed of a terminal TUI paired with the power of isolated
                        cloud microVMs.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-[420px]">
                        <button
                            onClick={onLaunchApp}
                            className="w-full sm:w-auto flex-1 h-[46px] px-6 rounded-lg bg-[#87B2F4] hover:bg-[#9EC1F7] text-[#0B1015] text-[14.5px] font-semibold shadow-[0_4px_16px_rgba(135,178,244,0.4)] border border-[#87B2F4] transition-all cursor-pointer hover:scale-[1.02]"
                        >
                            Launch Web App
                        </button>
                        <a
                            href="https://github.com/phasehumans/december"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto flex-1 h-[46px] px-6 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#FAFAFA] hover:border-[#87B2F4] text-[14.5px] font-medium text-[#18181B] flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                            <Icons.Github className="w-4 h-4 text-[#18181B]" />
                            <span>View on GitHub</span>
                        </a>
                    </div>
                </div>

                {/* Footer Navigation Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-12 border-b border-[#E4E4E7] text-[14px]">
                    {/* Col 1: Brand Info */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded bg-[#0B1015] flex items-center justify-center text-white">
                                <Icons.DecemberLogo
                                    className="w-4 h-4 text-[#87B2F4]"
                                    strokeWidth={1.2}
                                />
                            </div>
                            <span className="font-semibold text-[#0B1015] font-sans">December</span>
                        </div>
                        <p className="text-[13px] text-[#71717A] leading-relaxed max-w-[280px]">
                            Autonomous AI coding agent platform for terminal and cloud sandboxes.
                        </p>
                    </div>

                    {/* Col 2: Platform */}
                    <div className="flex flex-col gap-2.5">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                            Platform
                        </span>
                        <a
                            href="#cli-section"
                            className="text-[#52525B] hover:text-[#0B1015] transition-colors"
                        >
                            December CLI
                        </a>
                        <a
                            href="#cloud-section"
                            className="text-[#52525B] hover:text-[#0B1015] transition-colors"
                        >
                            December Cloud
                        </a>
                        <a
                            href="#handoff-section"
                            className="text-[#52525B] hover:text-[#0B1015] transition-colors"
                        >
                            Session Handoff
                        </a>
                    </div>

                    {/* Col 3: Resources & Open Source */}
                    <div className="flex flex-col gap-2.5">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                            Resources
                        </span>
                        <a
                            href="/docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#52525B] hover:text-[#0B1015] transition-colors"
                        >
                            Documentation
                        </a>
                        <a
                            href="https://github.com/phasehumans/december"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#52525B] hover:text-[#0B1015] transition-colors"
                        >
                            GitHub Repository
                        </a>
                        <a
                            href="https://github.com/phasehumans/december/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#52525B] hover:text-[#0B1015] transition-colors"
                        >
                            Issue Tracker
                        </a>
                    </div>
                </div>

                {/* Bottom credits */}
                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#A1A1AA] font-mono">
                    <div>© {new Date().getFullYear()} December. Open source software.</div>
                    <div className="flex items-center gap-4">
                        <span>Terminal + Cloud Sandbox</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
