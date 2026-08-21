import React from 'react'

export const CloudDeepDiveSection: React.FC = () => {
    return (
        <section
            id="cloud-section"
            className="w-full border-t border-[#E4E4E7] bg-white py-24 px-6"
        >
            <div className="max-w-[1232px] mx-auto">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[#E4E4E7]">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[#71717A] flex items-center">
                        <span className="text-[#87B2F4] font-bold mr-1.5">〉</span>
                        02 // CLOUD MICROVM PLATFORM
                    </span>
                    <span className="flex-1" />
                    <span className="font-mono text-[11px] text-[#A1A1AA] hidden sm:inline">
                        trydecember.com
                    </span>
                </div>

                {/* Headline & Description */}
                <div className="max-w-[800px] mb-12">
                    <h2 className="font-sans font-semibold text-[32px] sm:text-[42px] leading-[1.12] tracking-[-0.035em] text-[#0B1015] mb-4">
                        December Cloud: Isolated microVM sandboxes, live browser preview &amp;
                        GitHub PRs.
                    </h2>
                    <p className="font-sans text-[16px] text-[#52525B] leading-relaxed">
                        Execute full-stack applications in remote microVMs with port forwarding,
                        visual canvas, interactive DOM inspection, and automatic pull request
                        generation.
                    </p>
                </div>

                {/* 3 Bento Cards for Cloud Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: MicroVM Sandboxes */}
                    <div className="p-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] hover:border-[#87B2F4] hover:shadow-[0_8px_30px_rgba(135,178,244,0.2)] transition-all flex flex-col justify-between group shadow-sm">
                        <div>
                            <div className="w-11 h-11 rounded-xl bg-[#87B2F4]/20 border border-[#87B2F4]/50 flex items-center justify-center text-[#0B1015] mb-4 shadow-sm group-hover:scale-105 transition-transform">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.75}
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-[18px] font-semibold text-[#0B1015] mb-2 font-sans group-hover:text-[#0B1015]">
                                Isolated MicroVM Sandboxes
                            </h3>
                            <p className="text-[14px] text-[#52525B] leading-relaxed">
                                Every cloud session runs in an ephemeral, secure Linux microVM with
                                instant port forwarding. Install any package, run background
                                servers, and compile code safely.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-[#E4E4E7] text-[12px] font-mono text-[#71717A] flex items-center justify-between">
                            <span>E2B Sandbox Engine</span>
                            <span className="text-[#10B981] font-semibold">● 100% Isolated</span>
                        </div>
                    </div>

                    {/* Card 2: Live Browser Preview */}
                    <div className="p-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] hover:border-[#87B2F4] hover:shadow-[0_8px_30px_rgba(135,178,244,0.2)] transition-all flex flex-col justify-between group shadow-sm">
                        <div>
                            <div className="w-11 h-11 rounded-xl bg-[#87B2F4]/20 border border-[#87B2F4]/50 flex items-center justify-center text-[#0B1015] mb-4 shadow-sm group-hover:scale-105 transition-transform">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.75}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.75}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-[18px] font-semibold text-[#0B1015] mb-2 font-sans">
                                Interactive Live Preview &amp; DOM Selector
                            </h3>
                            <p className="text-[14px] text-[#52525B] leading-relaxed">
                                See live web applications rendered directly in your browser. Click
                                on any UI element to highlight its code and instruct the agent to
                                modify its styles or logic.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-[#E4E4E7] text-[12px] font-mono text-[#71717A] flex items-center justify-between">
                            <span>Live DOM Inspector</span>
                            <span className="text-[#87B2F4] font-semibold">Instant Hot Reload</span>
                        </div>
                    </div>

                    {/* Card 3: GitHub PR Automation */}
                    <div className="p-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] hover:border-[#87B2F4] hover:shadow-[0_8px_30px_rgba(135,178,244,0.2)] transition-all flex flex-col justify-between group shadow-sm">
                        <div>
                            <div className="w-11 h-11 rounded-xl bg-[#87B2F4]/20 border border-[#87B2F4]/50 flex items-center justify-center text-[#0B1015] mb-4 shadow-sm group-hover:scale-105 transition-transform">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.75}
                                        d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-[18px] font-semibold text-[#0B1015] mb-2 font-sans">
                                GitHub App &amp; Auto PRs
                            </h3>
                            <p className="text-[14px] text-[#52525B] leading-relaxed">
                                Connect your GitHub repositories. When a task or bug fix is
                                finished, December opens a pull request with an executive summary,
                                test logs, and reviewable diffs.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-[#E4E4E7] text-[12px] font-mono text-[#71717A] flex items-center justify-between">
                            <span>GitHub Integration</span>
                            <span className="text-[#87B2F4] font-semibold">1-Click Merge</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
