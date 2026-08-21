import React, { useState } from 'react'

export const BentoGridSection: React.FC = () => {
    const [selectedMcp, setSelectedMcp] = useState<'postgres' | 'github' | 'search'>('postgres')

    const mcpConfigs = {
        postgres: {
            json: `{\n  "mcpServers": {\n    "postgres": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://dev:secret@localhost:5432/app"]\n    }\n  }\n}`,
            tools: ['postgres_query', 'postgres_describe_table', 'postgres_list_schemas'],
        },
        github: {
            json: `{\n  "mcpServers": {\n    "github": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-github"],\n      "env": { "GITHUB_TOKEN": "$GITHUB_PERSONAL_TOKEN" }\n    }\n  }\n}`,
            tools: ['github_create_issue', 'github_create_pull_request', 'github_search_code'],
        },
        search: {
            json: `{\n  "mcpServers": {\n    "brave-search": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-brave-search"],\n      "env": { "BRAVE_API_KEY": "$BRAVE_API_KEY" }\n    }\n  }\n}`,
            tools: ['brave_web_search', 'brave_local_search'],
        },
    }

    return (
        <section
            id="mcp-architecture"
            className="w-full border-t border-[#E4E4E7] bg-white py-24 px-6"
        >
            <div className="max-w-[1232px] mx-auto">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[#E4E4E7]">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[#71717A] flex items-center">
                        <span className="text-[#87B2F4] font-bold mr-1.5">〉</span>
                        04 // EXTENSIBILITY &amp; ARCHITECTURE
                    </span>
                    <span className="flex-1" />
                    <span className="font-mono text-[11px] text-[#A1A1AA] hidden sm:inline">
                        Model Context Protocol
                    </span>
                </div>

                {/* Headline & Description */}
                <div className="max-w-[780px] mb-14">
                    <h2 className="font-sans font-semibold text-[32px] sm:text-[42px] leading-[1.12] tracking-[-0.035em] text-[#0B1015] mb-4">
                        Native dynamic tools via Model Context Protocol (MCP).
                    </h2>
                    <p className="font-sans text-[16px] text-[#52525B] leading-relaxed">
                        Connect any external data source, database, API, or service. December
                        discovers MCP servers at initialization and registers them natively into the
                        agent’s tool catalog alongside built-in tools.
                    </p>
                </div>

                {/* 2-Column Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Left: Interactive MCP Explorer (7 cols) */}
                    <div className="lg:col-span-7 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-6 shadow-sm flex flex-col justify-between hover:border-[#87B2F4] hover:shadow-[0_8px_30px_rgba(135,178,244,0.18)] transition-all">
                        <div>
                            <div className="flex items-center justify-between pb-4 border-b border-[#E4E4E7]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#87B2F4] shadow-[0_0_8px_rgba(135,178,244,0.8)]" />
                                    <span className="font-sans font-semibold text-[15px] text-[#0B1015]">
                                        Workspace MCP Config
                                    </span>
                                </div>
                                <span className="font-mono text-[11.5px] text-[#71717A]">
                                    .december/mcp.json
                                </span>
                            </div>

                            {/* Server Selectors */}
                            <div className="flex gap-2 my-4">
                                {(['postgres', 'github', 'search'] as const).map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedMcp(key)}
                                        className={`px-3.5 py-1.5 rounded-lg text-[12px] font-mono transition-all cursor-pointer ${
                                            selectedMcp === key
                                                ? 'bg-[#87B2F4] text-[#0B1015] font-bold shadow-[0_0_12px_rgba(135,178,244,0.45)] border border-[#87B2F4]'
                                                : 'bg-white border border-[#E4E4E7] text-[#52525B] hover:text-[#0B1015] hover:border-[#87B2F4]'
                                        }`}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>

                            {/* Code preview */}
                            <div className="rounded-xl border border-[#27272A] bg-[#0F1117] p-4 text-[#87B2F4] font-mono text-[12px] overflow-x-auto">
                                <pre className="text-[#E4E4E7]">{mcpConfigs[selectedMcp].json}</pre>
                            </div>

                            {/* Dynamically Registered Tools badge list */}
                            <div className="mt-4">
                                <div className="text-[12px] font-mono text-[#71717A] mb-2 uppercase tracking-wider">
                                    Discovered Native Dynamic Tools:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {mcpConfigs[selectedMcp].tools.map((tool) => (
                                        <span
                                            key={tool}
                                            className="px-2.5 py-1 rounded-md bg-[#87B2F4]/20 border border-[#87B2F4]/50 text-[#0B1015] font-mono text-[11px] font-bold shadow-sm"
                                        >
                                            ⚡ {tool}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[#E4E4E7] text-[12px] text-[#71717A] flex items-center justify-between">
                            <span>Auto-discovered at session boot</span>
                            <span className="text-[#87B2F4] font-mono font-bold">
                                Standard Model Context Protocol
                            </span>
                        </div>
                    </div>

                    {/* Right: Multi-Model & Self-Verification Cards (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        {/* Multi-Model BYOK Card */}
                        <div className="p-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] shadow-sm flex-1 flex flex-col justify-between hover:border-[#87B2F4] hover:shadow-[0_8px_30px_rgba(135,178,244,0.18)] transition-all">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-[#87B2F4]/20 text-[#0B1015] border border-[#87B2F4]/50 flex items-center justify-center font-bold text-[14px] mb-3 shadow-sm">
                                    🧠
                                </div>
                                <h3 className="text-[17px] font-semibold text-[#0B1015] mb-1.5 font-sans">
                                    Bring Your Own Models (BYOK)
                                </h3>
                                <p className="text-[13.5px] text-[#52525B] leading-relaxed mb-4">
                                    Plug in API keys for your preferred foundation models, use local
                                    Ollama, or utilize December platform credits.
                                </p>
                                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                                    <span className="px-2 py-1 rounded bg-white border border-[#87B2F4]/40 text-[#18181B] shadow-sm">
                                        Claude 3.7 Sonnet
                                    </span>
                                    <span className="px-2 py-1 rounded bg-white border border-[#87B2F4]/40 text-[#18181B] shadow-sm">
                                        GPT-4o
                                    </span>
                                    <span className="px-2 py-1 rounded bg-white border border-[#87B2F4]/40 text-[#18181B] shadow-sm">
                                        Gemini 2.5
                                    </span>
                                    <span className="px-2 py-1 rounded bg-white border border-[#87B2F4]/40 text-[#18181B] shadow-sm">
                                        DeepSeek R1
                                    </span>
                                    <span className="px-2 py-1 rounded bg-white border border-[#87B2F4]/40 text-[#18181B] shadow-sm">
                                        Ollama Local
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[#E4E4E7] text-[11.5px] font-mono text-[#71717A]">
                                Centralized default model fallback
                            </div>
                        </div>

                        {/* Self-Verification Loop */}
                        <div className="p-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] shadow-sm flex-1 flex flex-col justify-between">
                            <div>
                                <div className="w-9 h-9 rounded-xl bg-[#10B981]/20 text-[#047857] flex items-center justify-center font-bold text-[14px] mb-3">
                                    🔄
                                </div>
                                <h3 className="text-[17px] font-semibold text-[#0B1015] mb-1.5 font-sans">
                                    Autonomous Self-Verification
                                </h3>
                                <p className="text-[13.5px] text-[#52525B] leading-relaxed">
                                    December never just writes code blindly. It executes test
                                    suites, inspects compiler and runtime stderr, and auto-resolves
                                    bugs before marking tasks as complete.
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[#E4E4E7] text-[11.5px] font-mono text-[#10B981] font-medium">
                                ✓ Automated Test &amp; Build Verification
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
