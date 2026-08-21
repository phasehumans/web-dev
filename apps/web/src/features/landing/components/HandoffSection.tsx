import React from 'react'

export const HandoffSection: React.FC = () => {
    return (
        <section
            id="handoff-section"
            className="w-full border-t border-[#E4E4E7] bg-[#FAFAFA] py-24 px-6"
        >
            <div className="max-w-[1232px] mx-auto">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[#E4E4E7]">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[#71717A] flex items-center">
                        <span className="text-[#87B2F4] font-bold mr-1.5">〉</span>
                        03 // THE SESSION BRIDGE
                    </span>
                    <span className="flex-1" />
                    <span className="font-mono text-[11px] text-[#A1A1AA] hidden sm:inline">
                        /handoff
                    </span>
                </div>

                {/* Headline & Description */}
                <div className="max-w-[780px] mb-14">
                    <h2 className="font-sans font-semibold text-[32px] sm:text-[42px] leading-[1.12] tracking-[-0.035em] text-[#0B1015] mb-4">
                        The{' '}
                        <span className="text-[#0B1015] bg-[#87B2F4]/30 px-2 py-0.5 rounded-lg border border-[#87B2F4]/40 font-mono text-[30px] sm:text-[38px]">
                            /handoff
                        </span>{' '}
                        command: Terminal to Cloud in seconds.
                    </h2>
                    <p className="font-sans text-[16px] text-[#52525B] leading-relaxed">
                        No more lost context or restarting tasks. Start coding locally in your
                        terminal, and whenever you need full microVM test execution, a live browser
                        preview, or teammate collaboration, simply run <code>/handoff</code> to
                        transition immediately to December Cloud.
                    </p>
                </div>

                {/* Step-by-Step Architecture Pipeline (supermemory technical diagram style) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                    {/* Step 1 */}
                    <div className="p-5 rounded-xl border border-[#E4E4E7] bg-white shadow-sm flex flex-col justify-between hover:border-[#87B2F4] hover:shadow-[0_6px_24px_rgba(135,178,244,0.2)] transition-all">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11.5px] font-mono font-bold text-[#0B1015] px-2.5 py-0.5 rounded bg-[#87B2F4] border border-[#87B2F4] shadow-sm">
                                    STEP 01
                                </span>
                                <span className="text-[11px] font-mono text-[#71717A]">
                                    Local CLI
                                </span>
                            </div>
                            <h4 className="text-[15px] font-semibold text-[#0B1015] mb-1.5 font-sans">
                                Workspace Packaging
                            </h4>
                            <p className="text-[13px] text-[#52525B] leading-normal">
                                CLI packages local uncommitted changes, git metadata, and active
                                conversation history.
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#F4F4F5] text-[11px] font-mono text-[#71717A]">
                            tar.gz snapshot
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="p-5 rounded-xl border border-[#E4E4E7] bg-white shadow-sm flex flex-col justify-between hover:border-[#87B2F4] hover:shadow-[0_6px_24px_rgba(135,178,244,0.2)] transition-all">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11.5px] font-mono font-bold text-[#0B1015] px-2.5 py-0.5 rounded bg-[#87B2F4] border border-[#87B2F4] shadow-sm">
                                    STEP 02
                                </span>
                                <span className="text-[11px] font-mono text-[#71717A]">
                                    Direct S3
                                </span>
                            </div>
                            <h4 className="text-[15px] font-semibold text-[#0B1015] mb-1.5 font-sans">
                                Presigned S3 Upload
                            </h4>
                            <p className="text-[13px] text-[#52525B] leading-normal">
                                Fast, encrypted streaming upload via presigned S3 URLs directly to
                                object storage.
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#F4F4F5] text-[11px] font-mono text-[#71717A]">
                            Zero Server Bottleneck
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="p-5 rounded-xl border border-[#E4E4E7] bg-white shadow-sm flex flex-col justify-between hover:border-[#87B2F4] hover:shadow-[0_6px_24px_rgba(135,178,244,0.2)] transition-all">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11.5px] font-mono font-bold text-[#0B1015] px-2.5 py-0.5 rounded bg-[#87B2F4] border border-[#87B2F4] shadow-sm">
                                    STEP 03
                                </span>
                                <span className="text-[11px] font-mono text-[#71717A]">
                                    Cloud MicroVM
                                </span>
                            </div>
                            <h4 className="text-[15px] font-semibold text-[#0B1015] mb-1.5 font-sans">
                                MicroVM Sandbox Boot
                            </h4>
                            <p className="text-[13px] text-[#52525B] leading-normal">
                                Worker provisions an isolated Linux microVM sandbox, restores files,
                                and sets up dependencies.
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#F4F4F5] text-[11px] font-mono text-[#71717A]">
                            E2B MicroVM Instance
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="p-5 rounded-xl border-2 border-[#87B2F4] bg-gradient-to-b from-white to-[#87B2F4]/10 shadow-[0_8px_30px_rgba(135,178,244,0.25)] flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11.5px] font-mono font-bold text-[#0B1015] px-2.5 py-0.5 rounded bg-[#87B2F4] border border-[#87B2F4] shadow-sm">
                                    STEP 04
                                </span>
                                <span className="text-[11px] font-mono text-[#87B2F4] font-bold">
                                    ✓ Live Ready
                                </span>
                            </div>
                            <h4 className="text-[15px] font-semibold text-[#0B1015] mb-1.5 font-sans">
                                Zero-Amnesia Resume
                            </h4>
                            <p className="text-[13px] text-[#52525B] leading-normal">
                                Agent harness rehydrates full message memory and tool state for
                                seamless continuation.
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#87B2F4]/40 text-[11px] font-mono text-[#0B1015] font-bold">
                            ★ 100% Context Preserved
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
