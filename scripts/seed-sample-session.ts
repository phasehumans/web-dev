import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { prisma } from '@december/database'

const S3_BUCKET = process.env.S3_BUCKET || 'december-storage'
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'
const S3_REGION = process.env.S3_REGION || 'us-east-1'
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'decemberadmin'
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minio@2004'

const s3 = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    },
})

const TARGET_EMAIL = 'phasehumans@gmail.com'
const SAMPLE_SESSION_ID = 'd3c00001-beef-4000-8000-000000000001'

async function uploadToMinio(
    key: string,
    content: string,
    contentType = 'text/plain; charset=utf-8'
) {
    await s3.send(
        new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: content,
            ContentType: contentType,
            ContentLength: Buffer.byteLength(content, 'utf8'),
        })
    )
}

// ==========================================
// SOURCE FILES FOR MINIO WORKSPACE
// ==========================================

const INDEX_HTML_CONTENT = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cloud Telemetry & AI Agent Workspace</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                    },
                    colors: {
                        bgDark: '#0C0D0E',
                        panelDark: '#141517',
                        borderDark: '#232529',
                        hoverDark: '#1C1E22',
                        accent: '#3B82F6',
                        accentGlow: '#60A5FA',
                    }
                }
            }
        }
    </script>
    <style>
        body {
            background-color: #0C0D0E;
            color: #EDEDED;
            font-family: 'Plus Jakarta Sans', sans-serif;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: #27272A;
            border-radius: 4px;
        }
        .glow-metric {
            box-shadow: 0 0 25px -5px rgba(59, 130, 246, 0.08);
        }
        .chart-glow {
            filter: drop-shadow(0px 6px 16px rgba(59, 130, 246, 0.25));
        }
        .badge-pulse {
            animation: pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: .4; transform: scale(1.15); }
        }
        .flash-new {
            animation: highlight-row 1.5s ease-out;
        }
        @keyframes highlight-row {
            0% { background-color: rgba(59, 130, 246, 0.3); }
            100% { background-color: transparent; }
        }
    </style>
</head>
<body class="bg-[#0C0D0E] text-[#EDEDED] antialiased selection:bg-blue-500/20">
    <div class="flex h-screen w-full overflow-hidden">
        <!-- Sidebar Navigation -->
        <aside class="w-64 bg-[#111214] border-r border-[#222428] flex flex-col justify-between shrink-0 select-none">
            <div>
                <!-- Brand Header -->
                <div class="h-16 px-5 flex items-center gap-3 border-b border-[#222428]">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                            Telemetry AI
                            <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">v2.4</span>
                        </div>
                        <div class="text-[11px] text-zinc-500 font-medium">Enterprise Suite</div>
                    </div>
                </div>

                <!-- Navigation Links -->
                <div class="p-3 space-y-1">
                    <div class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 py-1.5 font-mono">Platform</div>
                    <button onclick="switchView('overview')" id="nav-overview" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1C1E22] text-white text-xs font-semibold border border-[#2B2D33] shadow-sm transition-colors text-left cursor-pointer">
                        <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                        <span>Telemetry Overview</span>
                    </button>
                    <button onclick="switchView('traces')" id="nav-traces" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#18191C] text-xs font-medium transition-colors text-left cursor-pointer">
                        <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        <span>Live Traces & Logs</span>
                    </button>
                    <button onclick="switchView('agents')" id="nav-agents" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#18191C] text-xs font-medium transition-colors text-left cursor-pointer">
                        <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                        <span>Agent Orchestration</span>
                    </button>
                    <button onclick="switchView('usage')" id="nav-usage" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#18191C] text-xs font-medium transition-colors text-left cursor-pointer">
                        <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>Usage & Token Costs</span>
                    </button>
                </div>
            </div>

            <!-- Cluster Status Footer -->
            <div class="p-3 border-t border-[#222428] space-y-2">
                <div class="flex items-center justify-between p-2 rounded-lg bg-[#16171A] border border-[#24262B]">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-emerald-400 badge-pulse"></div>
                        <span class="text-[11px] font-medium text-zinc-300">Cluster us-east</span>
                    </div>
                    <span class="text-[10px] font-mono text-emerald-400 font-semibold">99.98%</span>
                </div>
                <div class="text-[10px] text-zinc-500 text-center font-mono">Workspace: phasehumans-dev</div>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-1 flex flex-col h-full bg-[#0C0D0E] overflow-y-auto min-w-0">
            <!-- Top Navbar -->
            <header class="h-16 border-b border-[#222428] bg-[#111214]/80 backdrop-blur px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
                <div class="flex items-center gap-4">
                    <h1 id="pageTitle" class="text-sm font-bold text-white tracking-wide">Cloud Telemetry & AI Agent Workspace</h1>
                    <div class="h-4 w-[1px] bg-zinc-800"></div>
                    <div class="flex items-center gap-2 text-xs text-zinc-400 bg-[#17181C] px-3 py-1.5 rounded-lg border border-[#26282E]">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        <span>Auto-refreshing: <strong class="text-zinc-200 font-mono">2s</strong></span>
                    </div>
                </div>

                <!-- Header Actions -->
                <div class="flex items-center gap-3">
                    <button onclick="simulateTraffic()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E2024] hover:bg-[#282A30] text-blue-400 hover:text-blue-300 border border-blue-500/20 text-xs font-semibold transition-all cursor-pointer">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        <span>Simulate Traffic</span>
                    </button>

                    <button onclick="toggleCommandPalette()" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18191C] hover:bg-[#202226] text-zinc-400 hover:text-zinc-200 border border-[#27292F] text-xs font-mono transition-colors shadow-sm cursor-pointer">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <span>Search actions...</span>
                        <kbd class="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700">⌘K</kbd>
                    </button>

                    <div class="relative">
                        <button onclick="toggleNotifications()" class="p-2 rounded-lg bg-[#18191C] hover:bg-[#202226] text-zinc-400 hover:text-zinc-200 border border-[#27292F] transition-colors relative cursor-pointer">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                            <span id="notifDot" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500"></span>
                        </button>

                        <!-- Notification Dropdown -->
                        <div id="notificationDropdown" class="hidden absolute right-0 mt-2 w-80 bg-[#16171A] border border-[#2A2C32] rounded-xl shadow-2xl z-50 p-2 space-y-1">
                            <div class="flex items-center justify-between px-3 py-2 border-b border-[#25272D]">
                                <span class="text-xs font-bold text-white">Notifications</span>
                                <span onclick="markAllRead()" class="text-[10px] text-blue-400 font-semibold cursor-pointer hover:underline">Mark all read</span>
                            </div>
                            <div class="p-2.5 rounded-lg bg-[#1E2024] border border-[#2C2E35] space-y-1">
                                <div class="flex items-center justify-between text-xs font-semibold text-zinc-200">
                                    <span>Agent #42 completed task</span>
                                    <span class="text-[10px] text-zinc-500 font-mono">1m ago</span>
                                </div>
                                <div class="text-[11px] text-zinc-400 leading-snug">Autonomous refactor for telemetry restyling completed with zero errors.</div>
                            </div>
                            <div class="p-2.5 rounded-lg hover:bg-[#1A1C20] space-y-1">
                                <div class="flex items-center justify-between text-xs font-semibold text-zinc-200">
                                    <span>Rate limit threshold (92%)</span>
                                    <span class="text-[10px] text-amber-400 font-mono">5m ago</span>
                                </div>
                                <div class="text-[11px] text-zinc-400 leading-snug">Claude 3.7 Sonnet rate limit threshold approached on cluster us-east.</div>
                            </div>
                        </div>
                    </div>

                    <button onclick="exportCSV()" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        <span>Export CSV</span>
                    </button>
                </div>
            </header>

            <!-- Dashboard Content Grid -->
            <div id="mainDashboardView" class="p-6 space-y-6 max-w-7xl mx-auto w-full">
                <!-- 4 Metrics Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Metric 1 -->
                    <div class="p-4 rounded-2xl bg-[#141517] border border-[#232529] glow-metric flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-zinc-400">Total Telemetry Requests</span>
                            <span class="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">+14.6%</span>
                        </div>
                        <div class="mt-3 flex items-baseline gap-2">
                            <span id="metricRequests" class="text-2xl font-bold text-white tracking-tight font-mono">4,821,904</span>
                            <span class="text-xs text-zinc-500">reqs</span>
                        </div>
                        <div class="mt-3 h-8 w-full">
                            <svg class="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                                <path d="M0,20 Q15,5 30,15 T60,8 T85,18 T100,4" fill="none" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round"/>
                            </svg>
                        </div>
                    </div>

                    <!-- Metric 2 -->
                    <div class="p-4 rounded-2xl bg-[#141517] border border-[#232529] glow-metric flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-zinc-400">P99 Response Latency</span>
                            <span class="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">-18.2%</span>
                        </div>
                        <div class="mt-3 flex items-baseline gap-2">
                            <span id="metricLatency" class="text-2xl font-bold text-white tracking-tight font-mono">42.8</span>
                            <span class="text-xs text-zinc-500">ms</span>
                        </div>
                        <div class="mt-3 h-8 w-full">
                            <svg class="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                                <path d="M0,10 Q20,22 40,12 T70,16 T90,6 T100,10" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
                            </svg>
                        </div>
                    </div>

                    <!-- Metric 3 -->
                    <div class="p-4 rounded-2xl bg-[#141517] border border-[#232529] glow-metric flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-zinc-400">Active Autonomous Agents</span>
                            <span class="text-[11px] font-semibold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-800/40">+8 active</span>
                        </div>
                        <div class="mt-3 flex items-baseline gap-2">
                            <span id="metricAgents" class="text-2xl font-bold text-white tracking-tight font-mono">128</span>
                            <span class="text-xs text-zinc-500">instances</span>
                        </div>
                        <div class="mt-3 h-8 w-full">
                            <svg class="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                                <path d="M0,18 Q25,8 50,14 T80,5 T100,2" fill="none" stroke="#8B5CF6" stroke-width="2.5" stroke-linecap="round"/>
                            </svg>
                        </div>
                    </div>

                    <!-- Metric 4 -->
                    <div class="p-4 rounded-2xl bg-[#141517] border border-[#232529] glow-metric flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-zinc-400">Execution Success Rate</span>
                            <span class="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">Stable</span>
                        </div>
                        <div class="mt-3 flex items-baseline gap-2">
                            <span id="metricSuccess" class="text-2xl font-bold text-white tracking-tight font-mono">99.94</span>
                            <span class="text-xs text-zinc-500">%</span>
                        </div>
                        <div class="mt-3 h-8 w-full">
                            <svg class="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                                <path d="M0,8 Q30,6 60,7 T90,5 T100,5" fill="none" stroke="#EC4899" stroke-width="2.5" stroke-linecap="round"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Main Activity Chart Card -->
                <div class="p-5 rounded-2xl bg-[#141517] border border-[#232529]">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222428]">
                        <div>
                            <h2 class="text-sm font-bold text-white">Throughput & LLM Token Telemetry</h2>
                            <p class="text-xs text-zinc-400 mt-0.5">Real-time aggregate token generation vs latency over time</p>
                        </div>
                        <div class="flex items-center gap-1.5 bg-[#0C0D0E] p-1 rounded-xl border border-[#232529]">
                            <button onclick="setChartRange('24h')" id="btn-24h" class="px-3 py-1 text-xs font-semibold rounded-lg bg-[#22242A] text-white shadow-sm transition-all">24h</button>
                            <button onclick="setChartRange('7d')" id="btn-7d" class="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-all">7d</button>
                            <button onclick="setChartRange('30d')" id="btn-30d" class="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-all">30d</button>
                        </div>
                    </div>

                    <!-- SVG Chart Area -->
                    <div class="relative mt-4 h-64 w-full">
                        <svg id="activitySvgChart" class="w-full h-full chart-glow" viewBox="0 0 800 200" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.35"/>
                                    <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.0"/>
                                </linearGradient>
                            </defs>
                            <line x1="0" y1="50" x2="800" y2="50" stroke="#1F2126" stroke-dasharray="4"/>
                            <line x1="0" y1="100" x2="800" y2="100" stroke="#1F2126" stroke-dasharray="4"/>
                            <line x1="0" y1="150" x2="800" y2="150" stroke="#1F2126" stroke-dasharray="4"/>
                            <path id="chartArea" d="M0,160 Q100,80 200,120 T400,60 T600,100 T800,40 L800,200 L0,200 Z" fill="url(#chartGradient)"/>
                            <path id="chartLine" d="M0,160 Q100,80 200,120 T400,60 T600,100 T800,40" fill="none" stroke="#3B82F6" stroke-width="3" stroke-linecap="round"/>
                        </svg>
                    </div>
                </div>

                <!-- Searchable / Filterable Trace Logs Table -->
                <div class="rounded-2xl bg-[#141517] border border-[#232529] overflow-hidden">
                    <div class="p-4 border-b border-[#222428] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <h3 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Real-time Trace Logs</h3>
                            <span id="rowCountBadge" class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">8 traces</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <select id="statusFilter" onchange="filterTable()" class="bg-[#0C0D0E] text-xs text-zinc-300 px-3 py-1.5 rounded-xl border border-[#282A30] focus:outline-none focus:border-blue-500">
                                <option value="all">All Statuses</option>
                                <option value="200">200 OK</option>
                                <option value="201">201 CREATED</option>
                                <option value="429">429 Rate Limit</option>
                                <option value="500">500 Error</option>
                            </select>
                            <div class="relative w-full sm:w-64">
                                <input
                                    id="tableSearch"
                                    type="text"
                                    oninput="filterTable()"
                                    placeholder="Search traces by route..."
                                    class="w-full bg-[#0C0D0E] text-xs text-white placeholder-zinc-500 pl-8 pr-3 py-1.5 rounded-xl border border-[#282A30] focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <svg class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </div>
                        </div>
                    </div>

                    <!-- Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs font-sans">
                            <thead>
                                <tr class="border-b border-[#222428] bg-[#111214] text-zinc-400 font-mono text-[11px]">
                                    <th class="py-3 px-4 font-semibold">Timestamp</th>
                                    <th class="py-3 px-4 font-semibold">Endpoint / Service</th>
                                    <th class="py-3 px-4 font-semibold">Method</th>
                                    <th class="py-3 px-4 font-semibold">Status</th>
                                    <th class="py-3 px-4 font-semibold">Latency</th>
                                    <th class="py-3 px-4 font-semibold">Tokens</th>
                                </tr>
                            </thead>
                            <tbody id="traceTableBody" class="divide-y divide-[#1D1F24] font-mono text-[11.5px]">
                                <tr class="hover:bg-[#1A1C20] transition-colors">
                                    <td class="py-3 px-4 text-zinc-400">11:28:44.821</td>
                                    <td class="py-3 px-4 text-white font-semibold">POST /api/v1/sessions/generate</td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 text-[10px]">POST</span></td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px]">200 OK</span></td>
                                    <td class="py-3 px-4 text-zinc-300">38.4 ms</td>
                                    <td class="py-3 px-4 text-zinc-300">1,482</td>
                                </tr>
                                <tr class="hover:bg-[#1A1C20] transition-colors">
                                    <td class="py-3 px-4 text-zinc-400">11:28:42.110</td>
                                    <td class="py-3 px-4 text-white font-semibold">GET /api/v1/projects/d3c00001</td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">GET</span></td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px]">200 OK</span></td>
                                    <td class="py-3 px-4 text-zinc-300">12.1 ms</td>
                                    <td class="py-3 px-4 text-zinc-300">0</td>
                                </tr>
                                <tr class="hover:bg-[#1A1C20] transition-colors">
                                    <td class="py-3 px-4 text-zinc-400">11:28:39.950</td>
                                    <td class="py-3 px-4 text-white font-semibold">POST /api/v1/agent/orchestrate</td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 text-[10px]">POST</span></td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px]">201 CREATED</span></td>
                                    <td class="py-3 px-4 text-zinc-300">142.9 ms</td>
                                    <td class="py-3 px-4 text-zinc-300">4,209</td>
                                </tr>
                                <tr class="hover:bg-[#1A1C20] transition-colors">
                                    <td class="py-3 px-4 text-zinc-400">11:28:35.402</td>
                                    <td class="py-3 px-4 text-white font-semibold">PUT /api/v1/sessions/tags</td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 text-[10px]">PUT</span></td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px]">200 OK</span></td>
                                    <td class="py-3 px-4 text-zinc-300">18.6 ms</td>
                                    <td class="py-3 px-4 text-zinc-300">0</td>
                                </tr>
                                <tr class="hover:bg-[#1A1C20] transition-colors">
                                    <td class="py-3 px-4 text-zinc-400">11:28:31.008</td>
                                    <td class="py-3 px-4 text-white font-semibold">POST /api/v1/canvas/sync</td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 text-[10px]">POST</span></td>
                                    <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px]">200 OK</span></td>
                                    <td class="py-3 px-4 text-zinc-300">22.4 ms</td>
                                    <td class="py-3 px-4 text-zinc-300">512</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Command Palette Modal -->
    <div id="cmdPaletteModal" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
        <div class="bg-[#141517] border border-[#2A2C32] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div class="p-3 border-b border-[#222428] flex items-center gap-3">
                <svg class="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input id="cmdPaletteInput" type="text" placeholder="Type a command or search telemetry..." class="w-full bg-transparent text-sm text-white focus:outline-none placeholder-zinc-500 font-sans" />
                <kbd class="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700">ESC</kbd>
            </div>
            <div class="p-2 space-y-1 max-h-72 overflow-y-auto">
                <div class="text-[10px] font-mono text-zinc-500 px-3 py-1 uppercase tracking-wider">Quick Actions</div>
                <button onclick="toggleCommandPalette(); exportCSV();" class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-zinc-200 hover:bg-[#1E2024] transition-colors cursor-pointer">
                    <span class="font-medium">Export Current Telemetry to CSV</span>
                    <span class="text-[10px] font-mono text-zinc-500">Action</span>
                </button>
                <button onclick="toggleCommandPalette(); setChartRange('24h');" class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-zinc-200 hover:bg-[#1E2024] transition-colors cursor-pointer">
                    <span class="font-medium">Switch Telemetry Period to 24 Hours</span>
                    <span class="text-[10px] font-mono text-zinc-500">View</span>
                </button>
                <button onclick="toggleCommandPalette(); setChartRange('7d');" class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-zinc-200 hover:bg-[#1E2024] transition-colors cursor-pointer">
                    <span class="font-medium">Switch Telemetry Period to 7 Days</span>
                    <span class="text-[10px] font-mono text-zinc-500">View</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Client-side Interactive Logic -->
    <script>
        function switchView(view) {
            ['overview', 'traces', 'agents', 'usage'].forEach(v => {
                const btn = document.getElementById('nav-' + v);
                if (btn) {
                    if (v === view) {
                        btn.className = 'w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1C1E22] text-white text-xs font-semibold border border-[#2B2D33] shadow-sm transition-colors text-left cursor-pointer';
                    } else {
                        btn.className = 'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#18191C] text-xs font-medium transition-colors text-left cursor-pointer';
                    }
                }
            });
            const titleMap = {
                overview: 'Cloud Telemetry & AI Agent Workspace',
                traces: 'Real-time Distributed Traces Explorer',
                agents: 'Autonomous Agent Fleet Orchestrator',
                usage: 'Token Compute & Model Cost Analytics'
            };
            document.getElementById('pageTitle').innerText = titleMap[view] || 'Telemetry Platform';
        }

        function simulateTraffic() {
            const routes = [
                { ep: 'POST /api/v1/agent/orchestrate', method: 'POST', status: '200 OK', badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40', latency: '44.2 ms', tokens: '2,840' },
                { ep: 'GET /api/v1/sessions/insights', method: 'GET', status: '200 OK', badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40', latency: '15.1 ms', tokens: '0' },
                { ep: 'POST /api/v1/llm/stream', method: 'POST', status: '200 OK', badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40', latency: '88.9 ms', tokens: '3,120' },
                { ep: 'GET /api/v1/metrics/cluster', method: 'GET', status: '200 OK', badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40', latency: '9.4 ms', tokens: '0' }
            ];
            const item = routes[Math.floor(Math.random() * routes.length)];
            const time = new Date().toTimeString().split(' ')[0] + '.' + Math.floor(Math.random()*900 + 100);

            const tbody = document.getElementById('traceTableBody');
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-[#1A1C20] transition-colors flash-new';
            tr.innerHTML = '<td class="py-3 px-4 text-zinc-400">' + time + '</td>' +
                '<td class="py-3 px-4 text-white font-semibold">' + item.ep + '</td>' +
                '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 text-[10px]">' + item.method + '</span></td>' +
                '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded border text-[10px] ' + item.badge + '">' + item.status + '</span></td>' +
                '<td class="py-3 px-4 text-zinc-300">' + item.latency + '</td>' +
                '<td class="py-3 px-4 text-zinc-300">' + item.tokens + '</td>';
            tbody.insertBefore(tr, tbody.firstChild);

            const reqCount = document.getElementById('metricRequests');
            if (reqCount) {
                const current = parseInt(reqCount.innerText.replace(/,/g, ''));
                reqCount.innerText = (current + 1).toLocaleString();
            }
            filterTable();
        }

        function markAllRead() {
            const dot = document.getElementById('notifDot');
            if (dot) dot.classList.add('hidden');
            const dropdown = document.getElementById('notificationDropdown');
            if (dropdown) dropdown.classList.add('hidden');
        }

        function toggleNotifications() {
            const dropdown = document.getElementById('notificationDropdown');
            dropdown.classList.toggle('hidden');
        }

        function toggleCommandPalette() {
            const modal = document.getElementById('cmdPaletteModal');
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) {
                document.getElementById('cmdPaletteInput').focus();
            }
        }

        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleCommandPalette();
            }
            if (e.key === 'Escape') {
                document.getElementById('cmdPaletteModal').classList.add('hidden');
                document.getElementById('notificationDropdown').classList.add('hidden');
            }
        });

        function setChartRange(range) {
            ['24h', '7d', '30d'].forEach(r => {
                const btn = document.getElementById('btn-' + r);
                if (btn) {
                    if (r === range) {
                        btn.className = 'px-3 py-1 text-xs font-semibold rounded-lg bg-[#22242A] text-white shadow-sm transition-all';
                    } else {
                        btn.className = 'px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-all';
                    }
                }
            });

            const area = document.getElementById('chartArea');
            const line = document.getElementById('chartLine');
            if (range === '24h') {
                area.setAttribute('d', 'M0,160 Q100,80 200,120 T400,60 T600,100 T800,40 L800,200 L0,200 Z');
                line.setAttribute('d', 'M0,160 Q100,80 200,120 T400,60 T600,100 T800,40');
            } else if (range === '7d') {
                area.setAttribute('d', 'M0,140 Q150,50 300,90 T500,40 T700,70 T800,30 L800,200 L0,200 Z');
                line.setAttribute('d', 'M0,140 Q150,50 300,90 T500,40 T700,70 T800,30');
            } else {
                area.setAttribute('d', 'M0,110 Q200,150 400,40 T600,90 T800,20 L800,200 L0,200 Z');
                line.setAttribute('d', 'M0,110 Q200,150 400,40 T600,90 T800,20');
            }
        }

        function filterTable() {
            const query = document.getElementById('tableSearch').value.toLowerCase();
            const statusVal = document.getElementById('statusFilter').value;
            const rows = document.querySelectorAll('#traceTableBody tr');
            let visibleCount = 0;
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                const matchesQuery = text.includes(query);
                const matchesStatus = statusVal === 'all' || text.includes(statusVal);
                if (matchesQuery && matchesStatus) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });
            document.getElementById('rowCountBadge').innerText = visibleCount + ' traces';
        }

        function exportCSV() {
            const rows = [
                ['Timestamp', 'Endpoint', 'Method', 'Status', 'Latency', 'Tokens'],
                ['11:28:44.821', '/api/v1/sessions/generate', 'POST', '200 OK', '38.4 ms', '1482'],
                ['11:28:42.110', '/api/v1/projects/d3c00001', 'GET', '200 OK', '12.1 ms', '0'],
                ['11:28:39.950', '/api/v1/agent/orchestrate', 'POST', '201 CREATED', '142.9 ms', '4209'],
                ['11:28:35.402', '/api/v1/sessions/tags', 'PUT', '200 OK', '18.6 ms', '0'],
                ['11:28:31.008', '/api/v1/canvas/sync', 'POST', '200 OK', '22.4 ms', '512']
            ];
            const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'telemetry_traces_' + new Date().toISOString().slice(0,10) + '.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    </script>
</body>
</html>`

const PACKAGE_JSON_CONTENT = `{
  "name": "cloud-telemetry-workspace",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.475.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.1"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.3",
    "vite": "^6.1.0",
    "vitest": "^3.0.7",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.1"
  }
}`

const TSCONFIG_JSON_CONTENT = `{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "test"]
}`

const VITE_CONFIG_CONTENT = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  }
})`

const SRC_MAIN_TSX_CONTENT = `import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`

const SRC_APP_TSX_CONTENT = `import React, { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { MetricsOverview } from './components/MetricsOverview'
import { ActivityChart } from './components/ActivityChart'
import { TransactionsTable } from './components/TransactionsTable'
import { CommandPalette } from './components/CommandPalette'
import { NotificationCenter } from './components/NotificationCenter'
import { useTelemetryData } from './hooks/useTelemetryData'

export const App: React.FC = () => {
  const [chartRange, setChartRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const { metrics, traces, isLive, toggleLiveStream } = useTelemetryData()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCmdPaletteOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setIsCmdPaletteOpen(false)
        setIsNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen w-full bg-[#0C0D0E] text-[#EDEDED] font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Header 
          isLive={isLive}
          onToggleLive={toggleLiveStream}
          onOpenCmdPalette={() => setIsCmdPaletteOpen(true)}
          onToggleNotifications={() => setIsNotificationsOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">
          <MetricsOverview metrics={metrics} />
          <ActivityChart 
            range={chartRange}
            onRangeChange={setChartRange}
          />
          <TransactionsTable 
            traces={traces}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </main>
      </div>

      <CommandPalette 
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onSelectRange={setChartRange}
      />
      <NotificationCenter 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  )
}`

const SRC_TYPES_TELEMETRY_TS = `export interface TelemetryMetric {
  id: string
  label: string
  value: string
  unit: string
  change: string
  positive: boolean
  color: string
}

export interface TraceRecord {
  id: string
  timestamp: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  status: '200 OK' | '201 CREATED' | '429 RATE_LIMIT' | '500 ERROR'
  latencyMs: number
  tokensUsed: number
  serviceName: string
}

export interface AgentInstance {
  id: string
  name: string
  status: 'IDLE' | 'EXECUTING' | 'WAITING' | 'ERRORED'
  model: string
  currentTask: string
  uptimeSeconds: number
}
`

const SRC_API_TELEMETRY_CLIENT_TS = `import type { TraceRecord } from '../types/telemetry'

const INITIAL_TRACES: TraceRecord[] = [
  { id: 'tr-1', timestamp: '11:28:44.821', endpoint: 'POST /api/v1/sessions/generate', method: 'POST', status: '200 OK', latencyMs: 38.4, tokensUsed: 1482, serviceName: 'gateway' },
  { id: 'tr-2', timestamp: '11:28:42.110', endpoint: 'GET /api/v1/projects/d3c00001', method: 'GET', status: '200 OK', latencyMs: 12.1, tokensUsed: 0, serviceName: 'session-store' },
  { id: 'tr-3', timestamp: '11:28:39.950', endpoint: 'POST /api/v1/agent/orchestrate', method: 'POST', status: '201 CREATED', latencyMs: 142.9, tokensUsed: 4209, serviceName: 'agent-orchestrator' },
  { id: 'tr-4', timestamp: '11:28:35.402', endpoint: 'PUT /api/v1/sessions/tags', method: 'PUT', status: '200 OK', latencyMs: 18.6, tokensUsed: 0, serviceName: 'session-store' },
  { id: 'tr-5', timestamp: '11:28:31.008', endpoint: 'POST /api/v1/canvas/sync', method: 'POST', status: '200 OK', latencyMs: 22.4, tokensUsed: 512, serviceName: 'canvas-service' },
]

export const TelemetryClient = {
  async fetchLiveTraces(): Promise<TraceRecord[]> {
    return Promise.resolve(INITIAL_TRACES)
  },
  async exportCsvReport(traces: TraceRecord[]): Promise<string> {
    const headers = ['Timestamp', 'Endpoint', 'Method', 'Status', 'Latency', 'Tokens', 'Service']
    const rows = traces.map(t => [t.timestamp, t.endpoint, t.method, t.status, \`\${t.latencyMs}ms\`, t.tokensUsed, t.serviceName])
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\\n')
  }
}
`

const SRC_HOOKS_USE_TELEMETRY_DATA_TS = `import { useState, useEffect, useCallback } from 'react'
import type { TraceRecord, TelemetryMetric } from '../types/telemetry'
import { TelemetryClient } from '../api/telemetryClient'

export const useTelemetryData = () => {
  const [traces, setTraces] = useState<TraceRecord[]>([])
  const [isLive, setIsLive] = useState(true)
  const [metrics, setMetrics] = useState<TelemetryMetric[]>([
    { id: 'm1', label: 'Total Telemetry Requests', value: '4,821,904', unit: 'reqs', change: '+14.6%', color: '#3B82F6', positive: true },
    { id: 'm2', label: 'P99 Response Latency', value: '42.8', unit: 'ms', change: '-18.2%', color: '#10B981', positive: true },
    { id: 'm3', label: 'Active Autonomous Agents', value: '128', unit: 'instances', change: '+8 active', color: '#8B5CF6', positive: true },
    { id: 'm4', label: 'Execution Success Rate', value: '99.94', unit: '%', change: 'Stable', color: '#EC4899', positive: true },
  ])

  useEffect(() => {
    void TelemetryClient.fetchLiveTraces().then(setTraces)
  }, [])

  const toggleLiveStream = useCallback(() => {
    setIsLive(prev => !prev)
  }, [])

  return { metrics, traces, isLive, toggleLiveStream }
}
`

const SRC_UTILS_CSV_EXPORTER_TS = `import type { TraceRecord } from '../types/telemetry'

export function exportTracesToCsvFile(traces: TraceRecord[], filename = 'telemetry_traces.csv') {
  const headers = ['Timestamp', 'Endpoint', 'Method', 'Status', 'Latency', 'Tokens', 'Service']
  const rows = traces.map(t => [
    t.timestamp,
    \`"\${t.endpoint}"\`,
    t.method,
    t.status,
    \`\${t.latencyMs}ms\`,
    t.tokensUsed,
    t.serviceName
  ])
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\\n')
  const encoded = encodeURI(csvContent)
  const anchor = document.createElement('a')
  anchor.setAttribute('href', encoded)
  anchor.setAttribute('download', filename)
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}
`

const TEST_TELEMETRY_TEST_TS = `import { describe, it, expect } from 'vitest'
import { TelemetryClient } from '../src/api/telemetryClient'

describe('TelemetryClient API and Exporter', () => {
  it('loads initial traces properly', async () => {
    const traces = await TelemetryClient.fetchLiveTraces()
    expect(traces.length).toBeGreaterThan(0)
    expect(traces[0].endpoint).toContain('/api/v1/')
  })

  it('generates valid RFC-4180 CSV content', async () => {
    const traces = await TelemetryClient.fetchLiveTraces()
    const csv = await TelemetryClient.exportCsvReport(traces)
    expect(csv).toContain('Timestamp,Endpoint,Method,Status')
    expect(csv.split('\\n').length).toBe(traces.length + 1)
  })
})
`

const SRC_COMPONENTS_SIDEBAR_TSX = `import React from 'react'
import { Activity, Terminal, Cpu, DollarSign } from 'lucide-react'

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-[#111214] border-r border-[#222428] flex flex-col justify-between shrink-0 select-none">
      <div>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#222428]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              Telemetry AI
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">v2.4</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium">Enterprise Suite</div>
          </div>
        </div>

        <div className="p-3 space-y-1">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 py-1.5 font-mono">Platform</div>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1C1E22] text-white text-xs font-semibold border border-[#2B2D33] shadow-sm transition-colors text-left">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Telemetry Overview</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#18191C] text-xs font-medium transition-colors text-left">
            <Terminal className="w-4 h-4 text-zinc-500" />
            <span>Live Traces & Logs</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#18191C] text-xs font-medium transition-colors text-left">
            <Cpu className="w-4 h-4 text-zinc-500" />
            <span>Agent Orchestration</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#18191C] text-xs font-medium transition-colors text-left">
            <DollarSign className="w-4 h-4 text-zinc-500" />
            <span>Usage & Token Costs</span>
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-[#222428] space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#16171A] border border-[#24262B]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-[11px] font-medium text-zinc-300">Cluster us-east</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold">99.98%</span>
        </div>
        <div className="text-[10px] text-zinc-500 text-center font-mono">Workspace: phasehumans-dev</div>
      </div>
    </aside>
  )
}`

const SRC_COMPONENTS_HEADER_TSX = `import React from 'react'
import { Bell, Command } from 'lucide-react'

interface HeaderProps {
  isLive?: boolean
  onToggleLive?: () => void
  onOpenCmdPalette: () => void
  onToggleNotifications: () => void
}

export const Header: React.FC<HeaderProps> = ({ isLive = true, onToggleLive, onOpenCmdPalette, onToggleNotifications }) => {
  return (
    <header className="h-16 border-b border-[#222428] bg-[#111214]/80 backdrop-blur px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-bold text-white tracking-wide">Cloud Telemetry & AI Agent Workspace</h1>
        <div className="h-4 w-[1px] bg-zinc-800"></div>
        <button 
          onClick={onToggleLive}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 bg-[#17181C] hover:bg-[#1E2024] px-3 py-1.5 rounded-lg border border-[#26282E] transition-colors cursor-pointer"
        >
          <span className={"w-1.5 h-1.5 rounded-full " + (isLive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")}></span>
          <span>Streaming: <strong className="text-zinc-200 font-mono">{isLive ? "2s Live" : "Paused"}</strong></span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenCmdPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18191C] hover:bg-[#202226] text-zinc-400 hover:text-zinc-200 border border-[#27292F] text-xs font-mono transition-colors shadow-sm cursor-pointer"
        >
          <Command className="w-3.5 h-3.5" />
          <span>Search actions...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700">⌘K</kbd>
        </button>

        <button 
          onClick={onToggleNotifications}
          className="p-2 rounded-lg bg-[#18191C] hover:bg-[#202226] text-zinc-400 hover:text-zinc-200 border border-[#27292F] transition-colors relative cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500"></span>
        </button>
      </div>
    </header>
  )
}`

const SRC_COMPONENTS_METRICS_OVERVIEW_TSX = `import React from 'react'
import type { TelemetryMetric } from '../types/telemetry'

interface MetricsOverviewProps {
  metrics?: TelemetryMetric[]
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  const defaultMetrics: TelemetryMetric[] = [
    { id: '1', label: 'Total Telemetry Requests', value: '4,821,904', unit: 'reqs', change: '+14.6%', color: '#3B82F6', positive: true },
    { id: '2', label: 'P99 Response Latency', value: '42.8', unit: 'ms', change: '-18.2%', color: '#10B981', positive: true },
    { id: '3', label: 'Active Autonomous Agents', value: '128', unit: 'instances', change: '+8 active', color: '#8B5CF6', positive: true },
    { id: '4', label: 'Execution Success Rate', value: '99.94', unit: '%', change: 'Stable', color: '#EC4899', positive: true },
  ]
  const list = metrics && metrics.length > 0 ? metrics : defaultMetrics

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {list.map((m) => (
        <div key={m.id} className="p-4 rounded-2xl bg-[#141517] border border-[#232529] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">{m.label}</span>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">{m.change}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight font-mono">{m.value}</span>
            <span className="text-xs text-zinc-500">{m.unit}</span>
          </div>
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
              <path d="M0,18 Q25,8 50,14 T80,5 T100,2" fill="none" stroke={m.color} strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}`

const SRC_COMPONENTS_ACTIVITY_CHART_TSX = `import React from 'react'

interface ActivityChartProps {
  range: '24h' | '7d' | '30d'
  onRangeChange: (range: '24h' | '7d' | '30d') => void
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ range, onRangeChange }) => {
  return (
    <div className="p-5 rounded-2xl bg-[#141517] border border-[#232529]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222428]">
        <div>
          <h2 className="text-sm font-bold text-white">Throughput & LLM Token Telemetry</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time aggregate token generation vs latency over time</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#0C0D0E] p-1 rounded-xl border border-[#232529]">
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={"px-3 py-1 text-xs rounded-lg font-medium transition-all " + (
                range === r
                  ? "bg-[#22242A] text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4 h-64 w-full">
        <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradientTS" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          <line x1="0" y1="50" x2="800" y2="50" stroke="#1F2126" strokeDasharray="4"/>
          <line x1="0" y1="100" x2="800" y2="100" stroke="#1F2126" strokeDasharray="4"/>
          <line x1="0" y1="150" x2="800" y2="150" stroke="#1F2126" strokeDasharray="4"/>
          <path d="M0,160 Q100,80 200,120 T400,60 T600,100 T800,40 L800,200 L0,200 Z" fill="url(#chartGradientTS)"/>
          <path d="M0,160 Q100,80 200,120 T400,60 T600,100 T800,40" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  )
}`

const SRC_COMPONENTS_TRANSACTIONS_TABLE_TSX = `import React from 'react'
import { Download, Search } from 'lucide-react'
import type { TraceRecord } from '../types/telemetry'
import { exportTracesToCsvFile } from '../utils/csvExporter'

interface TransactionsTableProps {
  traces?: TraceRecord[]
  searchQuery: string
  onSearchChange: (query: string) => void
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ traces = [], searchQuery, onSearchChange }) => {
  const filtered = traces.filter(t => 
    t.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleExportCSV = () => {
    exportTracesToCsvFile(filtered)
  }

  return (
    <div className="rounded-2xl bg-[#141517] border border-[#232529] overflow-hidden">
      <div className="p-4 border-b border-[#222428] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Real-time Trace Logs</h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
            {filtered.length} traces
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search traces..."
              className="w-full bg-[#0C0D0E] text-xs text-white placeholder-zinc-500 pl-8 pr-3 py-1.5 rounded-xl border border-[#282A30] focus:outline-none focus:border-blue-500"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1E2024] hover:bg-[#282A30] text-zinc-200 text-xs font-semibold border border-[#2E3036] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-sans">
          <thead>
            <tr className="border-b border-[#222428] bg-[#111214] text-zinc-400 font-mono text-[11px]">
              <th className="py-3 px-4 font-semibold">Timestamp</th>
              <th className="py-3 px-4 font-semibold">Endpoint / Service</th>
              <th className="py-3 px-4 font-semibold">Method</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Latency</th>
              <th className="py-3 px-4 font-semibold">Tokens</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1D1F24] font-mono text-[11.5px]">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-[#1A1C20] transition-colors">
                <td className="py-3 px-4 text-zinc-400">{t.timestamp}</td>
                <td className="py-3 px-4 text-white font-semibold">{t.endpoint}</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 text-[10px]">{t.method}</span></td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px]">{t.status}</span></td>
                <td className="py-3 px-4 text-zinc-300">{t.latencyMs} ms</td>
                <td className="py-3 px-4 text-zinc-300">{t.tokensUsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}`

const SRC_COMPONENTS_COMMAND_PALETTE_TSX = `import React from 'react'
import { Search } from 'lucide-react'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSelectRange: (range: '24h' | '7d' | '30d') => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelectRange }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="bg-[#141517] border border-[#2A2C32] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-[#222428] flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search telemetry..."
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-zinc-500 font-sans"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700">ESC</kbd>
        </div>
        <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
          <div className="text-[10px] font-mono text-zinc-500 px-3 py-1 uppercase tracking-wider">Quick Actions</div>
          <button
            onClick={() => { onSelectRange('24h'); onClose(); }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-zinc-200 hover:bg-[#1E2024] transition-colors"
          >
            <span className="font-medium">Switch Telemetry Period to 24 Hours</span>
            <span className="text-[10px] font-mono text-zinc-500">View</span>
          </button>
          <button
            onClick={() => { onSelectRange('7d'); onClose(); }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-zinc-200 hover:bg-[#1E2024] transition-colors"
          >
            <span className="font-medium">Switch Telemetry Period to 7 Days</span>
            <span className="text-[10px] font-mono text-zinc-500">View</span>
          </button>
        </div>
      </div>
    </div>
  )
}`

const SRC_COMPONENTS_NOTIFICATION_CENTER_TSX = `import React from 'react'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="absolute right-6 top-16 mt-2 w-80 bg-[#16171A] border border-[#2A2C32] rounded-xl shadow-2xl z-50 p-2 space-y-1">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#25272D]">
        <span className="text-xs font-bold text-white">Notifications</span>
        <button onClick={onClose} className="text-[10px] text-blue-400 font-semibold cursor-pointer">Mark all read</button>
      </div>
      <div className="p-2.5 rounded-lg bg-[#1E2024] border border-[#2C2E35] space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
          <span>Agent #42 completed task</span>
          <span className="text-[10px] text-zinc-500 font-mono">1m ago</span>
        </div>
        <div className="text-[11px] text-zinc-400 leading-snug">Autonomous refactor for TUI restyling completed with zero errors.</div>
      </div>
      <div className="p-2.5 rounded-lg hover:bg-[#1A1C20] space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
          <span>Rate limit warning (92%)</span>
          <span className="text-[10px] text-amber-400 font-mono">5m ago</span>
        </div>
        <div className="text-[11px] text-zinc-400 leading-snug">Claude 3.7 Sonnet rate limit threshold approached on cluster us-east.</div>
      </div>
    </div>
  )
}`

const SRC_STYLES_INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-[#0C0D0E] text-[#EDEDED] antialiased;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #27272A;
  border-radius: 4px;
}`

const README_MD_CONTENT = `# Cloud Telemetry & AI Agent Workspace

Production-grade real-time telemetry monitoring, trace exploration, and autonomous agent orchestration platform built with React 19, TypeScript, and TailwindCSS.

## Features
- **Real-Time Telemetry Metrics**: Sparkline trends, P99 latency tracking, token usage breakdown.
- **Interactive SVG Throughput Chart**: Multi-range filter (24h, 7d, 30d) with cubic-bezier transition curves.
- **Trace Logs Explorer**: Sub-millisecond client filtering, multi-status pill badges, and direct CSV export.
- **Modular Architecture**: Clean separation between API, custom hooks, typed interfaces, and presentation components.
- **Unit & Integration Tests**: Comprehensive Vitest suites.
- **Command Palette**: Full keyboard navigation with quick actions.
- **Notification Center**: Real-time agent task notifications with unread indicators.

## Quickstart
\`\`\`bash
bun install
bun run dev
bun test
\`\`\`
`

const TASK_MD_CONTENT = `# Cloud Telemetry & AI Agent Workspace Roadmap

- [x] Initialize project structure and baseline Vite + React 19 + TypeScript configuration
- [x] Build high-density MetricsOverview cards with sparkline telemetry indicators
- [x] Implement ActivityChart component with dynamic SVG throughput bezier curves (24h / 7d / 30d range selector)
- [x] Develop TransactionsTable with instant search query filtering across routes, latency, and HTTP statuses
- [x] Implement client-side RFC-4180 CSV trace report exporter utility (src/utils/csvExporter.ts)
- [x] Refactor monolithic architecture: delete legacy files, create typed models in src/types/telemetry.ts
- [x] Build async TelemetryClient service layer and extract useTelemetryData streaming React hook
- [x] Create and run comprehensive Vitest unit test suites (test/telemetry.test.ts) with 100% pass rate
- [x] Implement global Cmd+K (⌘K) Command Palette with backdrop blur and timeframe navigation dispatchers
- [x] Implement NotificationCenter dropdown tray with real-time agent status indicators and unread tags
- [x] Wire up Header controls with live streaming pulse indicator (2s Live vs Paused)
- [ ] Add WebGL GPU accelerated particle visualization for 100k+ parallel cluster trace streams
- [ ] Integrate OpenTelemetry (OTel) gRPC exporter plugin for distributed spans
- [ ] Add customizable widget grid layout with drag-and-drop dashboard reordering
- [ ] Final production bundle audit, P99 render profiling, and automated pull request generation
`

const CANVAS_JSON_CONTENT = JSON.stringify({
    version: 1,
    items: [
        {
            id: 'node-1',
            type: 'card',
            x: 80,
            y: 80,
            width: 300,
            height: 200,
            title: 'Telemetry Ingestion Gateway',
            content:
                'Ingests real-time OpenTelemetry traces and token metrics across distributed agent sandboxes with 42ms p99 latency.',
            color: '#3B82F6',
        },
        {
            id: 'node-2',
            type: 'card',
            x: 440,
            y: 80,
            width: 300,
            height: 200,
            title: 'Agent Orchestration Fleet',
            content:
                'Manages autonomous agent execution loops, verification sandboxes, and rate-limited LLM inference pipelines.',
            color: '#10B981',
        },
        {
            id: 'node-3',
            type: 'card',
            x: 260,
            y: 340,
            width: 320,
            height: 180,
            title: 'Storage & Analytics Engine',
            content:
                'MinIO S3 bucket and Postgres transactional database powering instant CSV exports and time-series aggregations.',
            color: '#8B5CF6',
        },
    ],
    connections: [
        { from: 'node-1', to: 'node-2', label: 'gRPC stream (2s)' },
        { from: 'node-2', to: 'node-3', label: 'trace sync' },
        { from: 'node-1', to: 'node-3', label: 'metrics batch' },
    ],
    hasInteracted: true,
})

// ==========================================
// SEED PIPELINE EXECUTION
// ==========================================

async function main() {
    console.log('🚀 Starting enhanced sample session generation for', TARGET_EMAIL)

    const user = await prisma.user.findUnique({
        where: { email: TARGET_EMAIL },
    })

    if (!user) {
        throw new Error('User with email "' + TARGET_EMAIL + '" not found in database.')
    }

    console.log('✅ Found user:', user.name, '(' + user.id + ')')

    // 1. Reset old data for clean state
    await prisma.pullRequestReview.deleteMany({ where: { sessionId: SAMPLE_SESSION_ID } })
    await prisma.usageEvent.deleteMany({ where: { sessionId: SAMPLE_SESSION_ID } })
    await prisma.session.deleteMany({ where: { id: SAMPLE_SESSION_ID } })

    // 2. Create Session
    const session = await prisma.session.create({
        data: {
            id: SAMPLE_SESSION_ID,
            userId: user.id,
            title: 'Cloud Telemetry & AI Agent Workspace',
            description:
                'Production-grade cloud analytics dashboard with interactive metrics, SVG charts, modular React architecture, trace logs, and dark theme',
            type: 'WEB',
            vmStatus: 'STOPPED',
            tags: ['production', 'analytics', 'react', 'telemetry'],
            minioPrefix: 'sessions/' + SAMPLE_SESSION_ID + '/workspace/',
            githubRepoName: 'december',
            githubRepoOwner: 'phasehumans',
            githubRepoUrl: 'https://github.com/phasehumans/december',
            settings: {
                create: {
                    config: {
                        theme: 'dark',
                        autoSave: true,
                        linter: 'eslint',
                        telemetry: true,
                        activeTab: 'desktop',
                        fontSize: 13,
                        tabSize: 2,
                    },
                },
            },
            reviews: {
                createMany: {
                    data: [
                        {
                            content:
                                'lgtm: clean modular architecture! the separation between telemetryclient, usetelemetrydata hook, and csvexporter is very clean.',
                            prUrl: 'https://github.com/phasehumans/december/pull/42',
                            githubCommentId: 'gh-comment-42891',
                        },
                        {
                            content:
                                'verified: verified responsive breakpoints across desktop, tablet, and mobile frames with 60fps svg chart animations.',
                            prUrl: 'https://github.com/phasehumans/december/pull/42',
                            githubCommentId: 'gh-comment-42892',
                        },
                    ],
                },
            },
            memories: {
                createMany: {
                    data: [
                        {
                            key: 'architecture',
                            value: 'React 19 + TypeScript 5 + Tailwind CSS + Lucide',
                        },
                        { key: 'theme', value: 'December Dark Pro (#0C0D0E)' },
                        { key: 'primary_framework', value: 'vite-react' },
                        {
                            key: 'csv_export_standard',
                            value: 'RFC-4180 compliant client blob generation',
                        },
                        { key: 'test_framework', value: 'Vitest 3' },
                    ],
                },
            },
        },
    })

    console.log('✅ Created Session record:', session.id)

    // 3. Create PullRequestReview Record
    await prisma.pullRequestReview.create({
        data: {
            userId: user.id,
            sessionId: session.id,
            prUrl: 'https://github.com/phasehumans/december/pull/42',
            prNumber: 42,
            repository: 'phasehumans/december',
            title: 'feat: restyle tui and add cloud telemetry workspace',
            author: 'phasehumans',
            authorAvatar: 'https://avatars.githubusercontent.com/u/105274511',
            status: 'COMPLETED',
            isAutoReview: true,
            score: 98,
            summary:
                'Comprehensive cloud telemetry workspace implementation. Clean module boundaries, full TypeScript coverage, and verified responsive layouts.',
            findings: [
                {
                    id: 'f-1',
                    category: 'SECURITY',
                    severity: 'LOW',
                    title: 'Input sanitization on search filter',
                    message: 'Client query escaping implemented properly.',
                },
                {
                    id: 'f-2',
                    category: 'PERFORMANCE',
                    severity: 'INFO',
                    title: 'Sub-millisecond trace sorting',
                    message: 'Memoized table filtering maintains 60 FPS.',
                },
                {
                    id: 'f-3',
                    category: 'CLEAN_CODE',
                    severity: 'INFO',
                    title: 'Legacy code purged',
                    message:
                        'Successfully deleted LegacyTelemetry.tsx and mockData.ts in favor of typed API hooks.',
                },
            ],
            preferences: { strictness: 'STANDARD', autoFix: true },
        },
    })

    // 4. Create UsageEvent Records
    const now = new Date()
    const usageData = [
        {
            userId: user.id,
            sessionId: session.id,
            model: 'gemini-2.5-pro',
            inputTokens: 14200,
            outputTokens: 3840,
            totalTokens: 18040,
            costInCents: 4,
            periodStart: new Date(now.getTime() - 3600000),
            periodEnd: now,
            metadata: { operation: 'scaffold_platform', toolCalls: 8 },
        },
        {
            userId: user.id,
            sessionId: session.id,
            model: 'claude-3-7-sonnet',
            inputTokens: 8900,
            outputTokens: 2150,
            totalTokens: 11050,
            costInCents: 3,
            periodStart: new Date(now.getTime() - 1800000),
            periodEnd: now,
            metadata: { operation: 'refactor_and_purge_legacy', toolCalls: 6 },
        },
    ]
    for (const u of usageData) {
        await prisma.usageEvent.create({ data: u })
    }

    // 5. Create Realistic Multi-turn Chat Messages with All Supported Block Types
    const messagesData = [
        // Turn 1: User Request
        {
            sessionId: session.id,
            sequence: 1,
            role: 'USER' as const,
            content:
                'Can you build a high-performance Cloud Telemetry & AI Agent Workspace dashboard in React and TypeScript? It needs real-time metric cards with sparklines, interactive telemetry activity charts, filterable trace logs with status badges and CSV export, plus a modern dark mode aesthetic.',
            status: 'done',
            blocks: null,
        },
        // Turn 2: Assistant Response with Initial Build Blocks
        {
            sessionId: session.id,
            sequence: 2,
            role: 'ASSISTANT' as const,
            content:
                'I have scaffolded the complete Cloud Telemetry & AI Agent Workspace platform with real-time metric sparklines, interactive telemetry activity charts, trace tables with status badges, and modular React components.',
            status: 'done',
            blocks: [
                {
                    type: 'thinking',
                    content:
                        'The user wants a high-performance, dark-themed Cloud Telemetry & AI Agent Workspace dashboard in React and TypeScript. To make this feel like a state-of-the-art developer platform, I should focus on high data density, clear visual hierarchy, and instant interactive feedback. I will design four primary telemetry metric cards tracking total requests, P99 latency, active agent fleet size, and execution success rates, embedding responsive inline SVG sparklines for trend visualization. For the central visualization, an SVG throughput chart with smooth bezier curves and timeframe toggling between 24 hours, 7 days, and 30 days will provide immediate context on cluster health. I also need a real-time trace log table with status badges and fast query filtering. Structuring the codebase into modular components—Sidebar, Header, MetricsOverview, ActivityChart, and TransactionsTable—alongside clean CSS utility tokens in index.css will ensure high maintainability and crisp typography.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_init_list',
                    toolName: 'list_dir',
                    toolInput: { DirectoryPath: '/workspace' },
                    status: 'success',
                    output: 'package.json, src/, public/',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_pkg',
                    toolName: 'write_to_file',
                    toolInput: { TargetFile: 'package.json', CodeContent: PACKAGE_JSON_CONTENT },
                    status: 'success',
                    output: 'Wrote 748 bytes to package.json',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_task_md',
                    toolName: 'write_to_file',
                    toolInput: { TargetFile: 'TASK.md', CodeContent: TASK_MD_CONTENT },
                    status: 'success',
                    output: 'Wrote 1240 bytes to TASK.md',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_css',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/styles/index.css',
                        CodeContent: SRC_STYLES_INDEX_CSS,
                    },
                    status: 'success',
                    output: 'Wrote 312 bytes to src/styles/index.css',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_sidebar',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/components/Sidebar.tsx',
                        CodeContent: SRC_COMPONENTS_SIDEBAR_TSX,
                    },
                    status: 'success',
                    output: 'Wrote 2410 bytes to src/components/Sidebar.tsx',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_metrics',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/components/MetricsOverview.tsx',
                        CodeContent: SRC_COMPONENTS_METRICS_OVERVIEW_TSX,
                    },
                    status: 'success',
                    output: 'Wrote 1890 bytes to src/components/MetricsOverview.tsx',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_chart',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/components/ActivityChart.tsx',
                        CodeContent: SRC_COMPONENTS_ACTIVITY_CHART_TSX,
                    },
                    status: 'success',
                    output: 'Wrote 1980 bytes to src/components/ActivityChart.tsx',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_table',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/components/TransactionsTable.tsx',
                        CodeContent: SRC_COMPONENTS_TRANSACTIONS_TABLE_TSX,
                    },
                    status: 'success',
                    output: 'Wrote 3420 bytes to src/components/TransactionsTable.tsx',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_app',
                    toolName: 'write_to_file',
                    toolInput: { TargetFile: 'src/App.tsx', CodeContent: SRC_APP_TSX_CONTENT },
                    status: 'success',
                    output: 'Wrote 2150 bytes to src/App.tsx',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_html',
                    toolName: 'write_to_file',
                    toolInput: { TargetFile: 'index.html', CodeContent: INDEX_HTML_CONTENT },
                    status: 'success',
                    output: 'Wrote 16420 bytes to index.html',
                },
                {
                    type: 'file_change',
                    filePath: 'index.html',
                    action: 'created',
                    diff: '--- /dev/null\n+++ b/index.html\n@@ -0,0 +1,180 @@\n+<!DOCTYPE html>\n+<html lang="en" class="dark">\n+<head>\n+    <meta charset="UTF-8" />\n+    <title>Cloud Telemetry & AI Agent Workspace</title>\n+    <script src="https://cdn.tailwindcss.com"></script>\n+    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">\n+</head>\n+<body class="bg-[#0C0D0E] text-[#EDEDED]">\n+    <div class="flex h-screen w-full overflow-hidden">\n+        <!-- Telemetry Dashboard Viewport -->\n+    </div>\n+</body>\n+</html>',
                },
                {
                    type: 'file_change',
                    filePath: 'src/App.tsx',
                    action: 'created',
                    diff: "--- /dev/null\n+++ b/src/App.tsx\n@@ -0,0 +1,55 @@\n+import React, { useState } from 'react'\n+import { Sidebar } from './components/Sidebar'\n+import { Header } from './components/Header'\n+import { MetricsOverview } from './components/MetricsOverview'\n+import { ActivityChart } from './components/ActivityChart'\n+import { TransactionsTable } from './components/TransactionsTable'\n+\n+export const App: React.FC = () => {\n+  const [chartRange, setChartRange] = useState<'24h' | '7d' | '30d'>('24h')\n  return (\n    <div className=\"flex h-screen w-full bg-[#0C0D0E] text-[#EDEDED]\">\n      <Sidebar />\n      <div className=\"flex-1 flex flex-col\">\n        <Header />\n        <main className=\"p-6 space-y-6\">\n          <MetricsOverview />\n          <ActivityChart range={chartRange} onRangeChange={setChartRange} />\n          <TransactionsTable />\n        </main>\n      </div>\n    </div>\n  )\n}",
                },
                {
                    type: 'file_change',
                    filePath: 'src/components/MetricsOverview.tsx',
                    action: 'created',
                    diff: '--- /dev/null\n+++ b/src/components/MetricsOverview.tsx\n@@ -0,0 +1,35 @@\n+import React from \'react\'\n+\n+export const MetricsOverview: React.FC = () => {\n+  return (\n+    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">\n+      {/* 4 Telemetry Metrics Cards */}\n+    </div>\n+  )\n+}',
                },
                {
                    type: 'text',
                    content:
                        '### Initial Platform Scaffold Complete\n- **Live Desktop Preview**: Rendered interactive dashboard with responsive device containers.\n- **Metrics Engine**: 4 high-density metric sparkline cards.\n- **Activity Chart**: Throughput telemetry visualization.\n- **Trace Logs**: Real-time table ready for query filtering.',
                },
            ],
        },
        // Turn 3: User Normal Query / Prompt
        {
            sessionId: session.id,
            sequence: 3,
            role: 'USER' as const,
            content:
                'how can i give you access to push changes directly and open pull requests on phasehumans/december?',
            status: 'done',
            blocks: null,
        },
        // Turn 4: Assistant Normal Conversational Response (Devin Style)
        {
            sessionId: session.id,
            sequence: 4,
            role: 'ASSISTANT' as const,
            content:
                'We push branches and open pull requests through the GitHub App integration. To grant write access to `phasehumans/december`, you have two common options:\n\n### 1. Install or Authorize the GitHub App (Recommended)\n1. Navigate to **Integrations / GitHub Settings** in your dashboard (`/settings/integrations`).\n2. Click **"Configure GitHub"** / **"Manage Repositories"** to open GitHub\'s app installation page.\n3. Under **"Repository access"**, select **"Only select repositories"** → pick `phasehumans/december` (or choose *"All repositories"*), then click **Save & Install**.\n\n### 2. Configure GitHub Organization Permissions Directly\n1. On GitHub, go to your Organization Settings: `https://github.com/organizations/phasehumans/settings/installations`.\n2. Find the application and click **Configure**.\n3. Under **Repository Access**, ensure `december` is selected and verify the app has **Read & write** permissions for **Contents** and **Pull requests**.\n\n> **Note**: If `december` is owned by an organization (`phasehumans`), an organization owner or repository admin must approve the request before branch pushes can proceed.\n\nOnce that is configured, let me know and I will push the branch and open the pull request immediately!',
            status: 'done',
            blocks: [
                {
                    type: 'thinking',
                    content:
                        'The user is inquiring about repository write permissions and how to authorize automated branch pushes and pull request generation for phasehumans/december. I should provide clear, actionable instructions detailing both the dashboard integration flow and GitHub organization settings, highlighting permission scopes (Contents and Pull requests) and organization administrator approval requirements.',
                },
                {
                    type: 'text',
                    content:
                        'We push branches and open pull requests through the GitHub App integration. To grant write access to `phasehumans/december`, you have two common options:\n\n### 1. Install or Authorize the GitHub App (Recommended)\n1. Navigate to **Integrations / GitHub Settings** in your dashboard (`/settings/integrations`).\n2. Click **"Configure GitHub"** / **"Manage Repositories"** to open GitHub\'s app installation page.\n3. Under **"Repository access"**, select **"Only select repositories"** → pick `phasehumans/december` (or choose *"All repositories"*), then click **Save & Install**.\n\n### 2. Configure GitHub Organization Permissions Directly\n1. On GitHub, go to your Organization Settings: `https://github.com/organizations/phasehumans/settings/installations`.\n2. Find the application and click **Configure**.\n3. Under **Repository Access**, ensure `december` is selected and verify the app has **Read & write** permissions for **Contents** and **Pull requests**.\n\n> **Note**: If `december` is owned by an organization (`phasehumans`), an organization owner or repository admin must approve the request before branch pushes can proceed.\n\nOnce that is configured, let me know and I will push the branch and open the pull request immediately!',
                },
            ],
        },
        // Turn 5: User Follow-up
        {
            sessionId: session.id,
            sequence: 5,
            role: 'USER' as const,
            content:
                'Great progress! Can we now add real-time column sorting and CSV export to the traces table, plus smooth cubic-bezier transitions on the telemetry chart period toggles?',
            status: 'done',
            blocks: null,
        },
        // Turn 6: Assistant Response with Modifies & Search
        {
            sessionId: session.id,
            sequence: 6,
            role: 'ASSISTANT' as const,
            content:
                'I have updated `TransactionsTable.tsx` with multi-column sorting and instant CSV export, and enhanced `ActivityChart.tsx` with smooth SVG curve interpolation and period switching.',
            status: 'done',
            blocks: [
                {
                    type: 'thinking',
                    content:
                        'Analyzing the requirement for trace log sorting, CSV export, and smoother SVG chart interpolation. For CSV export, client-side blob generation formatted per RFC-4180 is the cleanest approach since it does not require extra server roundtrips and allows immediate downloading with timestamped filenames. For the telemetry activity chart, switching between 24h, 7d, and 30d timeframes should interpolate control points smoothly using cubic-bezier curves and subtle gradient area fills. I will locate TransactionsTable and ActivityChart using ripgrep, edit the components to wire up live filtering and range handlers, and then verify everything compiles cleanly with the TypeScript compiler.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_grep_table',
                    toolName: 'grep_search',
                    toolInput: { Query: 'TransactionsTable', SearchPath: '/workspace/src' },
                    status: 'success',
                    output: 'src/components/TransactionsTable.tsx:12:export const TransactionsTable',
                },
                {
                    type: 'command',
                    toolCallId: 'call_edit_table',
                    toolName: 'replace_file_content',
                    toolInput: {
                        TargetFile: 'src/components/TransactionsTable.tsx',
                        Instruction: 'Add CSV export and search filter logic',
                    },
                    status: 'success',
                    output: 'Updated src/components/TransactionsTable.tsx',
                },
                {
                    type: 'command',
                    toolCallId: 'call_edit_chart',
                    toolName: 'replace_file_content',
                    toolInput: {
                        TargetFile: 'src/components/ActivityChart.tsx',
                        Instruction: 'Add range period selector and gradient styling',
                    },
                    status: 'success',
                    output: 'Updated src/components/ActivityChart.tsx',
                },
                {
                    type: 'command',
                    toolCallId: 'call_check_types',
                    toolName: 'run_command',
                    toolInput: { CommandLine: 'bun run typecheck' },
                    status: 'success',
                    output: '✓ TypeScript compilation finished with 0 errors.',
                },
                {
                    type: 'file_change',
                    filePath: 'src/components/TransactionsTable.tsx',
                    action: 'modified',
                    diff: '--- a/src/components/TransactionsTable.tsx\n+++ b/src/components/TransactionsTable.tsx\n@@ -8,22 +8,36 @@\n interface TransactionsTableProps {\n-  data: any[]\n-  query: string\n+  traces?: TraceRecord[]\n+  searchQuery: string\n+  onSearchChange: (query: string) => void\n }\n \n-export const TransactionsTable = ({ data, query }: TransactionsTableProps) => {\n-  const filtered = data.filter(d => d.name.includes(query))\n-  const handleExport = () => alert(\'Exporting...\')\n+export const TransactionsTable: React.FC<TransactionsTableProps> = ({ traces = [], searchQuery, onSearchChange }) => {\n+  const filtered = traces.filter(t => \n+    t.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||\n+    t.status.toLowerCase().includes(searchQuery.toLowerCase()) ||\n+    t.serviceName.toLowerCase().includes(searchQuery.toLowerCase())\n+  )\n+\n+  const handleExportCSV = () => {\n+    exportTracesToCsvFile(filtered)\n+  }\n \n   return (\n-    <div className="old-table-container">\n-      <input value={query} onChange={() => {}} />\n-      <button onClick={handleExport}>Download</button>\n+    <div className="rounded-2xl bg-[#141517] border border-[#232529] overflow-hidden">\n+      <div className="p-4 border-b border-[#222428] flex flex-col sm:flex-row sm:items-center justify-between gap-3">\n+        <div className="flex items-center gap-3">\n+          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Real-time Trace Logs</h3>\n+          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">\n+            {filtered.length} traces\n+          </span>\n+        </div>',
                },
                {
                    type: 'file_change',
                    filePath: 'src/components/ActivityChart.tsx',
                    action: 'modified',
                    diff: '--- a/src/components/ActivityChart.tsx\n+++ b/src/components/ActivityChart.tsx\n@@ -10,18 +10,32 @@\n export const ActivityChart: React.FC<ActivityChartProps> = ({ range, onRangeChange }) => {\n-  // Static SVG fallback\n-  return (\n-    <div className="chart-box">\n-      <p>Static Chart</p>\n-      <svg><line x1="0" y1="50" x2="800" y2="50" /></svg>\n-    </div>\n-  )\n+  return (\n+    <div className="p-5 rounded-2xl bg-[#141517] border border-[#232529]">\n+      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222428]">\n+        <div>\n+          <h2 className="text-sm font-bold text-white">Throughput & LLM Token Telemetry</h2>\n+          <p className="text-xs text-zinc-400 mt-0.5">Real-time aggregate token generation vs latency over time</p>\n+        </div>\n+        <div className="flex items-center gap-1.5 bg-[#0C0D0E] p-1 rounded-xl border border-[#232529]">\n+          {(["24h", "7d", "30d"] as const).map((r) => (\n+            <button\n+              key={r}\n+              onClick={() => onRangeChange(r)}\n+              className={"px-3 py-1 text-xs rounded-lg font-medium transition-all " + (\n+                range === r\n+                  ? "bg-[#22242A] text-white font-semibold shadow-sm"\n+                  : "text-zinc-400 hover:text-white"\n+              )}\n+            >\n+              {r}\n+            </button>\n+          ))}\n+        </div>\n+      </div>',
                },
                {
                    type: 'text',
                    content:
                        '### Trace Export & Chart Enhancements\n- **CSV Export**: Added instant client-side CSV download button.\n- **Range Switching**: Integrated 24h / 7d / 30d telemetry curves.\n- **Search Query Filter**: Instant sub-millisecond filtering across routes and HTTP statuses.',
                },
            ],
        },
        // Turn 7: User Request for Refactoring & Deleting Legacy Code
        {
            sessionId: session.id,
            sequence: 7,
            role: 'USER' as const,
            content:
                'Please refactor the data fetching layer: delete the monolithic `LegacyTelemetry.tsx` and `mockData.ts` files, extract typed hooks (`useTelemetryData.ts`), add `TelemetryClient`, and create unit tests in Vitest.',
            status: 'done',
            blocks: null,
        },
        // Turn 8: Assistant Response with Deleted Diffs, Created Hooks, and Vitest Execution
        {
            sessionId: session.id,
            sequence: 8,
            role: 'ASSISTANT' as const,
            content:
                'I have refactored the project architecture: purged deprecated legacy files, created `src/types/telemetry.ts`, `src/api/telemetryClient.ts`, `src/hooks/useTelemetryData.ts`, `src/utils/csvExporter.ts`, and added passing Vitest suites.',
            status: 'done',
            blocks: [
                {
                    type: 'thinking',
                    content:
                        'Refactoring the data fetching layer to replace the deprecated monolithic components with a clean, decoupled architecture. I should first safely delete LegacyTelemetry.tsx and mockData.ts to eliminate obsolete types and mock states. Next, I will establish a centralized type definitions file in src/types/telemetry.ts defining strict interfaces for metrics, traces, and agent statuses. Then, I will build TelemetryClient as an async service layer and wrap it in a custom useTelemetryData React hook that manages polling state, live stream toggles, and memory cleanup. To support robust data export, I will extract csvExporter.ts into a standalone utility. Finally, I will write comprehensive Vitest unit and integration test suites in test/telemetry.test.ts to validate both trace data ingestion and CSV generation, running the test suite to ensure 100% pass rates.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_search_web',
                    toolName: 'search_web',
                    toolInput: {
                        query: 'React 19 custom hooks best practices streaming telemetry',
                    },
                    status: 'success',
                    output: 'Found 4 authoritative references on useEffect cleanup, async abort controllers, and memoized aggregations.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_types',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/types/telemetry.ts',
                        CodeContent: SRC_TYPES_TELEMETRY_TS,
                    },
                    status: 'success',
                    output: 'Wrote 780 bytes to src/types/telemetry.ts',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_client',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/api/telemetryClient.ts',
                        CodeContent: SRC_API_TELEMETRY_CLIENT_TS,
                    },
                    status: 'success',
                    output: 'Wrote 1120 bytes to src/api/telemetryClient.ts',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_hook',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/hooks/useTelemetryData.ts',
                        CodeContent: SRC_HOOKS_USE_TELEMETRY_DATA_TS,
                    },
                    status: 'success',
                    output: 'Wrote 1040 bytes to src/hooks/useTelemetryData.ts',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_csv_util',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/utils/csvExporter.ts',
                        CodeContent: SRC_UTILS_CSV_EXPORTER_TS,
                    },
                    status: 'success',
                    output: 'Wrote 720 bytes to src/utils/csvExporter.ts',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_test',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'test/telemetry.test.ts',
                        CodeContent: TEST_TELEMETRY_TEST_TS,
                    },
                    status: 'success',
                    output: 'Wrote 680 bytes to test/telemetry.test.ts',
                },
                {
                    type: 'command',
                    toolCallId: 'call_run_vitest_initial',
                    toolName: 'run_command',
                    toolInput: { CommandLine: 'bun test test/telemetry.test.ts' },
                    status: 'error',
                    output: 'FAIL  test/telemetry.test.ts > TelemetryClient API > generates valid RFC-4180 CSV content\nAssertionError: expected undefined to deeply equal "Timestamp,Endpoint,Method,Status,Latency,Tokens"\n  - Expected: "Timestamp,Endpoint,Method,Status,Latency,Tokens"\n  + Received: undefined\n    at test/telemetry.test.ts:18:24\n\nTests: 1 failed, 1 passed, 2 total\nTime: 42ms',
                },
                {
                    type: 'error',
                    error: 'Vitest Assertion Error: test/telemetry.test.ts:18:24 - expected CSV header string but received undefined',
                },
                {
                    type: 'thinking',
                    content:
                        'The CSV export test in test/telemetry.test.ts failed because exportCsvReport returned undefined when no options were passed. I will use replace_file_content to fix the export header generator in src/utils/csvExporter.ts and src/api/telemetryClient.ts, and then re-execute the test suite.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_fix_csv_util',
                    toolName: 'replace_file_content',
                    toolInput: {
                        TargetFile: 'src/utils/csvExporter.ts',
                        Instruction: 'Ensure default CSV header is returned when traces are empty',
                    },
                    status: 'success',
                    output: 'Updated src/utils/csvExporter.ts with default header fallback.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_run_vitest_retry',
                    toolName: 'run_command',
                    toolInput: { CommandLine: 'bun test test/telemetry.test.ts' },
                    status: 'success',
                    output: '✓ test/telemetry.test.ts (2 tests passed, 28ms)\n  ✓ loads initial traces properly\n  ✓ generates valid RFC-4180 CSV content',
                },
                // DELETED DIFF 1
                {
                    type: 'file_change',
                    filePath: 'src/components/LegacyTelemetry.tsx',
                    action: 'deleted',
                    diff: '--- a/src/components/LegacyTelemetry.tsx\n+++ /dev/null\n@@ -1,45 +0,0 @@\n-// Deprecated monolithic telemetry component\n-export function LegacyTelemetry() {\n-  const data = [1, 2, 3];\n-  return (\n-    <div>\n-      <h3>Old Monolithic Telemetry</h3>\n-      <p>Hardcoded metrics</p>\n-    </div>\n-  );\n-}',
                },
                // DELETED DIFF 2
                {
                    type: 'file_change',
                    filePath: 'src/utils/mockData.ts',
                    action: 'deleted',
                    diff: '--- a/src/utils/mockData.ts\n+++ /dev/null\n@@ -1,60 +0,0 @@\n-// Legacy raw mock data without schema types\n-export const RAW_TRACES = [\n-  { id: 1, name: "old_req", duration: 100 },\n-  { id: 2, name: "old_req_2", duration: 200 }\n-];',
                },
                // CREATED DIFFS
                {
                    type: 'file_change',
                    filePath: 'src/types/telemetry.ts',
                    action: 'created',
                    diff: "--- /dev/null\n+++ b/src/types/telemetry.ts\n@@ -0,0 +1,28 @@\n+export interface TelemetryMetric {\n+  id: string\n+  label: string\n+  value: string\n+  unit: string\n+  change: string\n+  positive: boolean\n+  color: string\n+}\n+\n+export interface TraceRecord {\n+  id: string\n+  timestamp: string\n+  endpoint: string\n+  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'\n+  status: '200 OK' | '201 CREATED' | '429 RATE_LIMIT' | '500 ERROR'\n+  latencyMs: number\n+  tokensUsed: number\n+  serviceName: string\n+}",
                },
                {
                    type: 'file_change',
                    filePath: 'src/api/telemetryClient.ts',
                    action: 'created',
                    diff: "--- /dev/null\n+++ b/src/api/telemetryClient.ts\n@@ -0,0 +1,22 @@\n+import type { TraceRecord } from '../types/telemetry'\n+\n+export const TelemetryClient = {\n+  async fetchLiveTraces(): Promise<TraceRecord[]> {\n+    return Promise.resolve(INITIAL_TRACES)\n+  },\n+  async exportCsvReport(traces: TraceRecord[]): Promise<string> {\n+    const headers = ['Timestamp', 'Endpoint', 'Method', 'Status', 'Latency', 'Tokens']\n+    return headers.join(',')\n+  }\n+}",
                },
                {
                    type: 'file_change',
                    filePath: 'src/hooks/useTelemetryData.ts',
                    action: 'created',
                    diff: "--- /dev/null\n+++ b/src/hooks/useTelemetryData.ts\n@@ -0,0 +1,25 @@\n+import { useState, useEffect } from 'react'\n+import type { TraceRecord } from '../types/telemetry'\n+import { TelemetryClient } from '../api/telemetryClient'\n+\n+export const useTelemetryData = () => {\n+  const [traces, setTraces] = useState<TraceRecord[]>([])\n+  const [isLive, setIsLive] = useState(true)\n+  useEffect(() => {\n+    void TelemetryClient.fetchLiveTraces().then(setTraces)\n+  }, [])\n  return { traces, isLive }\n+}",
                },
                {
                    type: 'file_change',
                    filePath: 'test/telemetry.test.ts',
                    action: 'created',
                    diff: "--- /dev/null\n+++ b/test/telemetry.test.ts\n@@ -0,0 +1,18 @@\n+import { describe, it, expect } from 'vitest'\n+import { TelemetryClient } from '../src/api/telemetryClient'\n+\n+describe('TelemetryClient API', () => {\n+  it('loads initial traces properly', async () => {\n+    const traces = await TelemetryClient.fetchLiveTraces()\n+    expect(traces.length).toBeGreaterThan(0)\n+  })\n+})",
                },
                {
                    type: 'text',
                    content:
                        '### Architecture Cleaned & Tested\n- **Deleted Legacy Files**: Removed `LegacyTelemetry.tsx` and `mockData.ts`.\n- **Extracted Typed Hook**: Created `useTelemetryData()` with live status controls.\n- **Test Coverage**: Added Vitest test suites in `test/telemetry.test.ts` (100% pass rate).',
                },
            ],
        },
        // Turn 9: User Request for Command Palette & Notifications
        {
            sessionId: session.id,
            sequence: 9,
            role: 'USER' as const,
            content:
                "Let's add a global Cmd+K Command Palette and a real-time Notification Center dropdown with unread status indicators.",
            status: 'done',
            blocks: null,
        },
        // Turn 10: Assistant Response for Cmd+K and Notifications
        {
            sessionId: session.id,
            sequence: 10,
            role: 'ASSISTANT' as const,
            content:
                'I have implemented the Cmd+K Command Palette (`CommandPalette.tsx`) and the real-time Notification Center (`NotificationCenter.tsx`), integrating them seamlessly into `Header.tsx` and `App.tsx`.',
            status: 'done',
            blocks: [
                {
                    type: 'compaction',
                    summary:
                        'Scaffolded telemetry dashboard, added CSV exporter, resolved Vitest test assertion failures, and purged deprecated legacy modules.',
                },
                {
                    type: 'thinking',
                    content:
                        'Now implementing the global Cmd+K command palette and the real-time notification center dropdown requested by the user. The command palette needs a lightweight modal overlay with backdrop blur, keyboard navigation listeners for ⌘K to open and Escape to dismiss, and instant action dispatchers for switching timeframes and exporting reports. For the notification center, an accessible dropdown tray positioned beneath the header bell icon with unread status indicators, timestamps, and mark-as-read callbacks will provide clear visibility into autonomous agent events and cluster alerts. I will check for any legacy notification templates, create the new components, update Header.tsx and App.tsx, and verify all responsive breakpoints.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_check_old_notif',
                    toolName: 'view_file',
                    toolInput: { AbsolutePath: '/workspace/src/components/LegacyNotification.tsx' },
                    status: 'error',
                    output: "Error: ENOENT: no such file or directory, open '/workspace/src/components/LegacyNotification.tsx'",
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_cmd',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/components/CommandPalette.tsx',
                        CodeContent: SRC_COMPONENTS_COMMAND_PALETTE_TSX,
                    },
                    status: 'success',
                    output: 'Wrote 1840 bytes to src/components/CommandPalette.tsx',
                },
                {
                    type: 'command',
                    toolCallId: 'call_write_notif',
                    toolName: 'write_to_file',
                    toolInput: {
                        TargetFile: 'src/components/NotificationCenter.tsx',
                        CodeContent: SRC_COMPONENTS_NOTIFICATION_CENTER_TSX,
                    },
                    status: 'success',
                    output: 'Wrote 1520 bytes to src/components/NotificationCenter.tsx',
                },
                {
                    type: 'command',
                    toolCallId: 'call_update_app',
                    toolName: 'replace_file_content',
                    toolInput: {
                        TargetFile: 'src/App.tsx',
                        Instruction: 'Wire up CommandPalette and NotificationCenter states',
                    },
                    status: 'success',
                    output: 'Updated src/App.tsx',
                },
                {
                    type: 'file_change',
                    filePath: 'src/components/CommandPalette.tsx',
                    action: 'created',
                    diff: "--- /dev/null\n+++ b/src/components/CommandPalette.tsx\n@@ -0,0 +1,48 @@\n+import React from 'react'\n+import { Search, Command } from 'lucide-react'\n+\n+export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelectRange }) => {\n+  if (!isOpen) return null\n+  return (\n+    <div className=\"fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 p-4\">\n+      {/* Command Palette Modal Body */}\n+    </div>\n+  )\n+}",
                },
                {
                    type: 'file_change',
                    filePath: 'src/components/NotificationCenter.tsx',
                    action: 'created',
                    diff: '--- /dev/null\n+++ b/src/components/NotificationCenter.tsx\n@@ -0,0 +1,32 @@\n+import React from \'react\'\n+\n+export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {\n+  if (!isOpen) return null\n+  return (\n+    <div className="absolute right-6 top-16 mt-2 w-80 bg-[#16171A] border border-[#2A2C32] rounded-xl shadow-2xl z-50 p-2">\n+      {/* Notification Center Tray */}\n+    </div>\n+  )\n+}',
                },
                {
                    type: 'file_change',
                    filePath: 'src/App.tsx',
                    action: 'modified',
                    diff: "--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -9,16 +9,28 @@\n export const App: React.FC = () => {\n   const [chartRange, setChartRange] = useState<'24h' | '7d' | '30d'>('24h')\n   const [searchQuery, setSearchQuery] = useState('')\n-  const [legacyLoading, setLegacyLoading] = useState(false)\n+  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false)\n+  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)\n+  const { metrics, traces, isLive, toggleLiveStream } = useTelemetryData()\n \n   return (\n     <div className=\"flex h-screen w-full bg-[#0C0D0E] text-[#EDEDED] font-sans overflow-hidden\">\n       <Sidebar />\n       <div className=\"flex-1 flex flex-col h-full min-w-0 overflow-hidden\">\n-        <Header onOpenCmdPalette={() => {}} />\n+        <Header \n+          isLive={isLive}\n+          onToggleLive={toggleLiveStream}\n+          onOpenCmdPalette={() => setIsCmdPaletteOpen(true)}\n+          onToggleNotifications={() => setIsNotificationsOpen(prev => !prev)}\n+        />\n         <main className=\"flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full\">\n-          <MetricsOverview />\n+          <MetricsOverview metrics={metrics} />\n           <ActivityChart range={chartRange} onRangeChange={setChartRange} />\n-          <TransactionsTable />\n+          <TransactionsTable \n            traces={traces}\n            searchQuery={searchQuery}\n            onSearchChange={setSearchQuery}\n          />\n         </main>\n       </div>\n+\n+      <CommandPalette \n+        isOpen={isCmdPaletteOpen}\n+        onClose={() => setIsCmdPaletteOpen(false)}\n+        onSelectRange={setChartRange}\n+      />\n+      <NotificationCenter \n+        isOpen={isNotificationsOpen}\n+        onClose={() => setIsNotificationsOpen(false)}\n+      />\n     </div>\n   )\n }",
                },
                {
                    type: 'file_change',
                    filePath: 'src/components/Header.tsx',
                    action: 'modified',
                    diff: '--- a/src/components/Header.tsx\n+++ b/src/components/Header.tsx\n@@ -4,14 +4,26 @@\n interface HeaderProps {\n-  title?: string\n+  isLive?: boolean\n+  onToggleLive?: () => void\n   onOpenCmdPalette: () => void\n   onToggleNotifications: () => void\n }\n \n-export const Header: React.FC<HeaderProps> = ({ title }) => {\n+export const Header: React.FC<HeaderProps> = ({ isLive = true, onToggleLive, onOpenCmdPalette, onToggleNotifications }) => {\n   return (\n     <header className="h-16 border-b border-[#222428] bg-[#111214]/80 backdrop-blur px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">\n       <div className="flex items-center gap-4">\n-        <h1 className="text-sm font-bold text-white">{title || \'Telemetry AI\'}</h1>\n+        <h1 className="text-sm font-bold text-white tracking-wide">Cloud Telemetry & AI Agent Workspace</h1>\n+        <div className="h-4 w-[1px] bg-zinc-800"></div>\n+        <button \n+          onClick={onToggleLive}\n+          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 bg-[#17181C] hover:bg-[#1E2024] px-3 py-1.5 rounded-lg border border-[#26282E] transition-colors cursor-pointer"\n+        >\n+          <span className={"w-1.5 h-1.5 rounded-full " + (isLive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")}></span>\n+          <span>Streaming: <strong className="text-zinc-200 font-mono">{isLive ? "2s Live" : "Paused"}</strong></span>\n+        </button>\n       </div>',
                },
                {
                    type: 'text',
                    content:
                        '### Command Palette & Notification Center Ready\n- **Command Palette (`⌘K`)**: Instant action dispatching and timeframe navigation.\n- **Notification Center**: Real-time agent status updates with unread badges.\n- **Full Workspace Ready**: All changes tested and deployed to workspace storage.',
                },
            ],
        },
        // Turn 11: User Request (To Be Interrupted)
        {
            sessionId: session.id,
            sequence: 11,
            role: 'USER' as const,
            content:
                'Can you also generate a legacy Python scraper backend script for this cluster?',
            status: 'done',
            blocks: null,
        },
        // Turn 12: Assistant Interrupted Response
        {
            sessionId: session.id,
            sequence: 12,
            role: 'ASSISTANT' as const,
            content: 'Interrupted by user.',
            status: 'done',
            blocks: [
                {
                    type: 'thinking',
                    content:
                        'The user initiated a request for a Python telemetry scraper script, but the execution was interrupted before file writes or environment changes took place.',
                },
                {
                    type: 'interrupt',
                },
            ],
        },
        // Turn 13: User Redirection
        {
            sessionId: session.id,
            sequence: 13,
            role: 'USER' as const,
            content: "Never mind, let's keep it purely frontend in React and TypeScript.",
            status: 'done',
            blocks: null,
        },
        // Turn 14: Assistant Acknowledgment & Final State
        {
            sessionId: session.id,
            sequence: 14,
            role: 'ASSISTANT' as const,
            content:
                'Understood! The workspace remains 100% React, TypeScript, and Vite with zero external Python dependencies.',
            status: 'done',
            blocks: [
                {
                    type: 'thinking',
                    content:
                        'Acknowledged user directive to omit external Python scraping services. The application architecture remains completely self-contained in React 19, Vite, and TypeScript with client-side mock generators and interactive simulated event streams.',
                },
                {
                    type: 'text',
                    content:
                        'Understood! The workspace remains strictly React, TypeScript, and Vite with all telemetry ingestion, chart transitions, and trace exports handled natively on the frontend.',
                },
            ],
        },
        // Turn 15: User Request for High-Concurrency Stress Test
        {
            sessionId: session.id,
            sequence: 15,
            role: 'USER' as const,
            content:
                'Run a stress test benchmark against the live cluster metrics endpoint to simulate 10,000 requests/sec.',
            status: 'done',
            blocks: null,
        },
        // Turn 16: Assistant Encountering LLM Provider 429 Rate Limit & Exponential Backoff
        {
            sessionId: session.id,
            sequence: 16,
            role: 'ASSISTANT' as const,
            content:
                'Executed the high-concurrency load benchmark after applying exponential backoff following a provider rate limit response.',
            status: 'done',
            blocks: [
                {
                    type: 'thinking',
                    content:
                        'Initiating high-concurrency synthetic trace generation. Generating 10,000 mock request events in parallel chunks to evaluate rendering throughput and table virtualization limits.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_stress_test_raw',
                    toolName: 'run_command',
                    toolInput: { CommandLine: 'bun run benchmark:load-test --concurrency=100' },
                    status: 'error',
                    output: 'RateLimitError: 429 Too Many Requests - Requests per minute (RPM) limit reached for anthropic.claude-3-7-sonnet-20250219.\nHeaders: x-ratelimit-remaining-requests: 0, retry-after: 6s\n  at AnthropicClient.request (node_modules/@anthropic-ai/sdk/core.js:240:19)',
                },
                {
                    type: 'error',
                    error: 'RateLimitError (429): Provider rate limit reached on claude-3-7-sonnet. Backing off 6000ms before retrying request.',
                },
                {
                    type: 'thinking',
                    content:
                        'The LLM provider returned HTTP 429 with retry-after: 6s. Pausing synthesis to respect rate limits, then executing chunked streaming mock generation with jittered backoff.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_stress_test_chunked',
                    toolName: 'run_command',
                    toolInput: {
                        CommandLine: 'bun run benchmark:load-test --chunked --partitions=8',
                    },
                    status: 'success',
                    output: '✓ Stress benchmark completed: 10,000 mock events generated across 8 partitions in 142ms (P99 latency: 18ms, 0 frame drops).',
                },
                {
                    type: 'text',
                    content:
                        '### Load Benchmark Completed\n- **Rate Limit Handled**: Automatically applied exponential backoff following provider `HTTP 429` response.\n- **Results**: 10,000 traces generated across 8 partitions in 142ms (P99 latency: 18ms, zero frame drops).',
                },
            ],
        },
        // Turn 17: User Request for Huge Audit Log Processing (Context Overflow Trigger)
        {
            sessionId: session.id,
            sequence: 17,
            role: 'USER' as const,
            content:
                'Can you parse and cross-reference the raw 150,000 line telemetry audit dump from yesterday?',
            status: 'done',
            blocks: null,
        },
        // Turn 18: Assistant Context Window Exceeded + Automatic Compaction + Streaming Recovery
        {
            sessionId: session.id,
            sequence: 18,
            role: 'ASSISTANT' as const,
            content:
                'I optimized the audit log ingestion to avoid context overflow, compacting prior history and extracting the 14 critical anomalies via streaming filters.',
            status: 'done',
            blocks: [
                {
                    type: 'thinking',
                    content:
                        'Attempting to read the complete 150,000-line audit log archive directly into working memory...',
                },
                {
                    type: 'error',
                    error: 'InvalidRequestError (400): Context window limit exceeded. Total prompt tokens (214,890) exceed the model maximum context window of 200,000 tokens for claude-3-7-sonnet-20250219.',
                },
                {
                    type: 'compaction',
                    summary:
                        'Context threshold reached (214k tokens). Summarized previous conversation steps into a compact index to free 160k tokens of context window.',
                },
                {
                    type: 'thinking',
                    content:
                        'Context compacted successfully. Rather than loading the entire 50MB file into memory, I will use ripgrep to filter specifically for ERROR, 429, and 500 status codes in a single streaming pass.',
                },
                {
                    type: 'command',
                    toolCallId: 'call_grep_audit',
                    toolName: 'grep_search',
                    toolInput: {
                        Query: '(ERROR|429|500)',
                        SearchPath: 'telemetry-audit.log',
                        IsRegex: true,
                    },
                    status: 'success',
                    output: 'Found 14 matching error lines out of 150,000 audit records across 3 upstream microservices.',
                },
                {
                    type: 'text',
                    content:
                        '### Audit Log Ingestion Optimized\n- **Context Window Protected**: Safely avoided token overflow by executing streaming regex filtering instead of bulk text dumping.\n- **Anomaly Summary**: Identified 14 error records across 150,000 entries (8 Rate Limits, 4 Gateway Timeouts, 2 Unhandled Exceptions).',
                },
            ],
        },
        // Turn 19: User Request for Remote Datadog Agent Connection
        {
            sessionId: session.id,
            sequence: 19,
            role: 'USER' as const,
            content:
                'Can you export all metrics to a remote cloud datadog agent at 10.0.0.99:8125?',
            status: 'done',
            blocks: null,
        },
        // Turn 20: Assistant Message with Status 'error' (Provider 503 Overload / Network Socket Refusal)
        {
            sessionId: session.id,
            sequence: 20,
            role: 'ASSISTANT' as const,
            content:
                'Failed to connect to remote metrics collector: Remote host `10.0.0.99:8125` refused UDP connection and provider API experienced intermittent 503 overload.',
            status: 'error',
            blocks: [
                {
                    type: 'thinking',
                    content:
                        'Attempting to establish UDP socket stream to remote Datadog collector daemon at 10.0.0.99:8125 and initialize metrics heartbeat...',
                },
                {
                    type: 'command',
                    toolCallId: 'call_check_socket',
                    toolName: 'run_command',
                    toolInput: { CommandLine: 'nc -zv -u 10.0.0.99 8125' },
                    status: 'error',
                    output: 'nc: connect to 10.0.0.99 port 8125 (udp) failed: Connection refused / Network unreachable',
                },
                {
                    type: 'error',
                    error: 'APIError (503 Service Unavailable): LLM provider endpoint is currently overloaded. Sandbox network socket to 10.0.0.99:8125 refused UDP connection.',
                },
                {
                    type: 'text',
                    content:
                        '### Connection Failure\n- **Network Error**: Unable to reach remote metrics collector at `10.0.0.99:8125` (Connection refused).\n- **Provider Warning**: Upstream LLM provider returned intermittent `503 Overloaded` warnings during transaction dispatch.\n- **Recommendation**: Ensure the Datadog daemon is running on the host and firewall rules allow UDP traffic on port `8125`.',
                },
            ],
        },
    ]

    for (const msg of messagesData) {
        await prisma.message.create({
            data: msg,
        })
    }

    console.log(
        '✅ Created',
        messagesData.length,
        'multi-turn chat messages with structured blocks'
    )

    // 6. Upload Workspace Files to MinIO Storage
    const workspaceFiles: Record<string, string> = {
        'index.html': INDEX_HTML_CONTENT,
        'package.json': PACKAGE_JSON_CONTENT,
        'tsconfig.json': TSCONFIG_JSON_CONTENT,
        'vite.config.ts': VITE_CONFIG_CONTENT,
        'README.md': README_MD_CONTENT,
        'TASK.md': TASK_MD_CONTENT,
        'src/main.tsx': SRC_MAIN_TSX_CONTENT,
        'src/App.tsx': SRC_APP_TSX_CONTENT,
        'src/types/telemetry.ts': SRC_TYPES_TELEMETRY_TS,
        'src/api/telemetryClient.ts': SRC_API_TELEMETRY_CLIENT_TS,
        'src/hooks/useTelemetryData.ts': SRC_HOOKS_USE_TELEMETRY_DATA_TS,
        'src/utils/csvExporter.ts': SRC_UTILS_CSV_EXPORTER_TS,
        'src/components/Sidebar.tsx': SRC_COMPONENTS_SIDEBAR_TSX,
        'src/components/Header.tsx': SRC_COMPONENTS_HEADER_TSX,
        'src/components/MetricsOverview.tsx': SRC_COMPONENTS_METRICS_OVERVIEW_TSX,
        'src/components/ActivityChart.tsx': SRC_COMPONENTS_ACTIVITY_CHART_TSX,
        'src/components/TransactionsTable.tsx': SRC_COMPONENTS_TRANSACTIONS_TABLE_TSX,
        'src/components/CommandPalette.tsx': SRC_COMPONENTS_COMMAND_PALETTE_TSX,
        'src/components/NotificationCenter.tsx': SRC_COMPONENTS_NOTIFICATION_CENTER_TSX,
        'src/styles/index.css': SRC_STYLES_INDEX_CSS,
        'test/telemetry.test.ts': TEST_TELEMETRY_TEST_TS,
    }

    console.log('📦 Uploading workspace files to MinIO bucket:', S3_BUCKET)
    for (const [relativePath, content] of Object.entries(workspaceFiles)) {
        const key = 'sessions/' + SAMPLE_SESSION_ID + '/workspace/' + relativePath
        const contentType = relativePath.endsWith('.html')
            ? 'text/html; charset=utf-8'
            : relativePath.endsWith('.json')
              ? 'application/json'
              : relativePath.endsWith('.css')
                ? 'text/css'
                : 'text/plain; charset=utf-8'
        await uploadToMinio(key, content, contentType)
        console.log('   Uploaded:', key)
    }

    // 7. Upload Canvas Document
    const canvasKey = 'sessions/' + SAMPLE_SESSION_ID + '/canvas.json'
    await uploadToMinio(canvasKey, CANVAS_JSON_CONTENT, 'application/json')
    console.log('   Uploaded:', canvasKey)

    console.log('🎉 Enhanced sample session successfully seeded!')
    console.log('   Session ID:', SAMPLE_SESSION_ID)
    console.log('   User:', TARGET_EMAIL)
    console.log('   Title:', session.title)
}

main()
    .catch((err) => {
        console.error('❌ Failed to seed enhanced sample session:', err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
