import React, { useState } from 'react'

export const CliDeepDiveSection: React.FC = () => {
    const [selectedCommand, setSelectedCommand] = useState<'december' | 'handoff' | 'help'>(
        'december'
    )

    return (
        <section
            id="cli-section"
            className="w-full border-t border-[#E4E4E7] bg-[#FAFAFA] py-24 px-6"
        >
            <div className="max-w-[1232px] mx-auto">
                {/* Section Header (supermemory style) */}
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[#E4E4E7]">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[#71717A] flex items-center">
                        <span className="text-[#87B2F4] font-bold mr-1.5">〉</span>
                        01 // THE TERMINAL FIRST WORKFLOW
                    </span>
                    <span className="flex-1" />
                    <span className="font-mono text-[11px] text-[#A1A1AA] hidden sm:inline">
                        @trydecember/cli
                    </span>
                </div>

                {/* Headline & Description */}
                <div className="max-w-[800px] mb-10">
                    <h2 className="font-sans font-semibold text-[32px] sm:text-[42px] leading-[1.12] tracking-[-0.035em] text-[#0B1015] mb-4">
                        December CLI: Lightning fast, local TUI, full autonomy.
                    </h2>
                    <p className="font-sans text-[16px] text-[#52525B] leading-relaxed">
                        Run December directly inside your local terminal. It autonomously inspects
                        your codebase, edits files, executes tests, and verifies diffs in real-time
                        — with zero cloud lag and full access to your local filesystem and custom
                        MCP servers.
                    </p>
                </div>

                {/* Interactive Terminal Simulator (supermemory interactive aesthetic) */}
                <div className="w-full rounded-2xl border-2 border-[#87B2F4]/40 bg-[#0F1117] text-white p-4 sm:p-6 shadow-[0_12px_45px_-12px_rgba(135,178,244,0.25)] overflow-hidden font-mono relative">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#87B2F4] to-transparent" />
                    {/* Simulator Header & Command Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#27272A] text-[13px]">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                            <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                            <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                            <span className="ml-2 text-[#A1A1AA] text-[12px]">
                                december-tui — fish
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#18181B] p-1 rounded-lg border border-[#27272A]">
                            <button
                                onClick={() => setSelectedCommand('december')}
                                className={`px-3 py-1 rounded text-[12px] transition-all cursor-pointer ${
                                    selectedCommand === 'december'
                                        ? 'bg-[#87B2F4] text-[#0B1015] font-bold shadow-[0_0_12px_rgba(135,178,244,0.5)]'
                                        : 'text-[#A1A1AA] hover:text-white'
                                }`}
                            >
                                $ december
                            </button>
                            <button
                                onClick={() => setSelectedCommand('handoff')}
                                className={`px-3 py-1 rounded text-[12px] transition-all cursor-pointer ${
                                    selectedCommand === 'handoff'
                                        ? 'bg-[#87B2F4] text-[#0B1015] font-bold shadow-[0_0_12px_rgba(135,178,244,0.5)]'
                                        : 'text-[#A1A1AA] hover:text-white'
                                }`}
                            >
                                $ /handoff
                            </button>
                            <button
                                onClick={() => setSelectedCommand('help')}
                                className={`px-3 py-1 rounded text-[12px] transition-all cursor-pointer ${
                                    selectedCommand === 'help'
                                        ? 'bg-[#87B2F4] text-[#0B1015] font-bold shadow-[0_0_12px_rgba(135,178,244,0.5)]'
                                        : 'text-[#A1A1AA] hover:text-white'
                                }`}
                            >
                                $ december --help
                            </button>
                        </div>
                    </div>

                    {/* Output Screen */}
                    <div className="pt-5 text-[13px] sm:text-[13.5px] leading-relaxed overflow-x-auto">
                        {selectedCommand === 'december' && (
                            <div className="space-y-3">
                                <div className="text-[#A1A1AA]">
                                    <span className="text-[#10B981]">~/code/my-saas-app</span>{' '}
                                    (main) $ december "Fix memory leak in websocket reconnection and
                                    write tests"
                                </div>
                                <div className="text-[#87B2F4] font-semibold">
                                    [DECEMBER AGENT v0.3.9] Initialized in
                                    /home/dev/code/my-saas-app
                                </div>
                                <div className="text-[#A1A1AA]">
                                    • Discovered MCP Servers:{' '}
                                    <span className="text-[#E4E4E7]">
                                        postgres, brave-search, github
                                    </span>{' '}
                                    (14 native tools active)
                                </div>
                                <div className="bg-[#18181B]/80 border border-[#27272A] rounded-lg p-3 text-[#E4E4E7] space-y-1.5">
                                    <div className="text-[#38BDF8] flex items-center gap-2">
                                        <span className="animate-spin">⠋</span> [1/3] Reading
                                        src/shared/ws-client.ts and tracing heartbeat timers...
                                    </div>
                                    <div className="text-[#10B981]">
                                        ✓ Found unclosed setInterval timer in reconnectLoop() [Line
                                        42-58]
                                    </div>
                                    <div className="text-[#FBBF24]">
                                        [2/3] Editing src/shared/ws-client.ts
                                    </div>
                                    <div className="bg-[#09090B] p-2.5 rounded border border-[#27272A] text-[12px]">
                                        <span className="text-[#EF4444]">
                                            - this.reconnectTimer = setInterval(this.retry, 2000)
                                        </span>
                                        <br />
                                        <span className="text-[#10B981]">
                                            + if (this.reconnectTimer)
                                            clearInterval(this.reconnectTimer)
                                        </span>
                                        <br />
                                        <span className="text-[#10B981]">
                                            + this.reconnectTimer = setInterval(() =&gt;
                                            this.safeRetry(), 2000)
                                        </span>
                                    </div>
                                    <div className="text-[#34D399] flex items-center gap-2 pt-1">
                                        ✓ [3/3] Self-Verification: Executed `bun test
                                        test/ws.test.ts` (4 passed, 0 failed, 12ms)
                                    </div>
                                </div>
                                <div className="text-[#A1A1AA] pt-1">
                                    ✨ Task completed in 4.2s. Type{' '}
                                    <span className="text-[#87B2F4]">/handoff</span> to migrate this
                                    session to December Cloud.
                                </div>
                            </div>
                        )}

                        {selectedCommand === 'handoff' && (
                            <div className="space-y-3">
                                <div className="text-[#A1A1AA]">
                                    <span className="text-[#10B981]">~/code/my-saas-app</span>{' '}
                                    (main) $ december /handoff
                                </div>
                                <div className="text-[#87B2F4] font-semibold">
                                    [DECEMBER CLOUD MIGRATION] Uploading session to
                                    trydecember.com...
                                </div>
                                <div className="space-y-1 text-[#E4E4E7]">
                                    <div>
                                        [1/4] Packaging local workspace snapshot (excluding
                                        node_modules, .git, secrets)...
                                    </div>
                                    <div>
                                        [2/4] Uploading archive to encrypted S3 object storage (2.4
                                        MB)...
                                    </div>
                                    <div>
                                        [3/4] Provisioning isolated E2B microVM cloud sandbox...
                                    </div>
                                    <div className="text-[#10B981]">
                                        [4/4] Restored 8 conversation turns and synchronized
                                        workspace state.
                                    </div>
                                </div>
                                <div className="bg-[#18181B] p-3 rounded-lg border border-[#87B2F4]/40 text-[#87B2F4]">
                                    🔗 Session live at:{' '}
                                    <span className="underline text-white">
                                        https://trydecember.com/sessions/sess_9f81a2bc
                                    </span>
                                    <div className="text-[12px] text-[#A1A1AA] mt-1">
                                        Full conversational context, diffs, and live browser preview
                                        are now available on Web.
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedCommand === 'help' && (
                            <div className="space-y-2 text-[#E4E4E7]">
                                <div className="text-[#87B2F4] font-semibold">
                                    December CLI — Autonomous AI Coding Agent
                                </div>
                                <div className="text-[#A1A1AA]">
                                    Usage: december [prompt] [options]
                                </div>
                                <div className="pt-2 text-[12.5px] space-y-1 text-[#A1A1AA]">
                                    <div>
                                        <span className="text-[#E4E4E7] font-semibold">
                                            -m, --model &lt;name&gt;
                                        </span>{' '}
                                        Model to use (claude-3-7-sonnet, gpt-4o, gemini-2.5,
                                        deepseek-r1)
                                    </div>
                                    <div>
                                        <span className="text-[#E4E4E7] font-semibold">
                                            --mcp-config &lt;path&gt;
                                        </span>{' '}
                                        Custom Model Context Protocol JSON config path
                                    </div>
                                    <div>
                                        <span className="text-[#E4E4E7] font-semibold">--yolo</span>{' '}
                                        Execute tools autonomously without confirmation prompts
                                    </div>
                                    <div>
                                        <span className="text-[#E4E4E7] font-semibold">login</span>{' '}
                                        Authenticate your terminal with December Cloud
                                    </div>
                                    <div>
                                        <span className="text-[#E4E4E7] font-semibold">eval</span>{' '}
                                        Run terminal evaluation benchmarks (HumanEval, SWE-bench)
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
