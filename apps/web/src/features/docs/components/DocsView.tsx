import {
    ChevronLeft,
    Book,
    Code,
    Terminal,
    Zap,
    Shield,
    FileText,
    ExternalLink,
    Sparkles,
    Layers,
    Lock,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { PrivacyPolicyContent } from '@/shared/components/legal/PrivacyPolicyContent'
import { TermsOfServiceContent } from '@/shared/components/legal/TermsOfServiceContent'
import { Icons } from '@/shared/components/ui/Icons'

interface DocsViewProps {
    onBack?: () => void
}

type DocTab =
    | 'Introduction'
    | 'Quick Start'
    | 'Privacy Policy'
    | 'Terms of Service'
    | 'Architecture'
    | 'CLI Reference'

const pathToTab: Record<string, DocTab> = {
    '/docs': 'Introduction',
    '/docs/': 'Introduction',
    '/docs/intro': 'Introduction',
    '/docs/introduction': 'Introduction',
    '/docs/quickstart': 'Quick Start',
    '/docs/quick-start': 'Quick Start',
    '/docs/privacy': 'Privacy Policy',
    '/privacy': 'Privacy Policy',
    '/docs/terms': 'Terms of Service',
    '/terms': 'Terms of Service',
    '/docs/architecture': 'Architecture',
    '/docs/cli': 'CLI Reference',
    '/docs/december-cli': 'CLI Reference',
}

const tabToPath: Record<DocTab, string> = {
    Introduction: '/docs',
    'Quick Start': '/docs/quickstart',
    'Privacy Policy': '/docs/privacy',
    'Terms of Service': '/docs/terms',
    Architecture: '/docs/architecture',
    'CLI Reference': '/docs/cli',
}

export const DocsView: React.FC<DocsViewProps> = ({ onBack }) => {
    const location = useLocation()
    const navigate = useNavigate()

    const currentTab: DocTab = pathToTab[location.pathname.toLowerCase()] || 'Introduction'
    const [activeTab, setActiveTab] = useState<DocTab>(currentTab)

    useEffect(() => {
        const matched = pathToTab[location.pathname.toLowerCase()]
        if (matched) {
            setActiveTab(matched)
        }
    }, [location.pathname])

    useEffect(() => {
        const titleMap: Record<DocTab, string> = {
            Introduction: 'Documentation — December',
            'Quick Start': 'Quick Start — December Docs',
            'Privacy Policy': 'Privacy Policy — December',
            'Terms of Service': 'Terms of Service — December',
            Architecture: 'Architecture & System Design — December Docs',
            'CLI Reference': 'CLI Reference & Commands — December Docs',
        }
        document.title = titleMap[activeTab] || 'Documentation — December'
        return () => {
            document.title = 'December — AI Coding Agent for Terminal and Cloud'
        }
    }, [activeTab])

    const handleTabChange = (tab: DocTab) => {
        setActiveTab(tab)
        navigate(tabToPath[tab])
    }

    const handleHome = () => {
        if (onBack) {
            onBack()
        } else {
            navigate('/')
        }
    }

    return (
        <div className="flex w-full h-full bg-[#100E12] overflow-hidden p-1.5 md:p-[8px] font-sans">
            <div className="flex flex-col md:flex-row w-full h-full bg-[#141414] rounded-lg border border-[#242323] overflow-hidden">
                {/* docs sidebar */}
                <div className="w-full md:w-[240px] shrink-0 border-b md:border-b-0 md:border-r border-[#242323] flex flex-col pt-3 pb-1 md:py-4 bg-[#121212]">
                    <div className="px-3 md:px-4 mb-3 md:mb-5 flex items-center justify-between">
                        <button
                            onClick={handleHome}
                            className="flex items-center text-[#8F8E8D] hover:text-[#D6D5D4] hover:bg-[#191919] px-2 py-1 -ml-1 rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1.5" />
                            Back to Home
                        </button>
                        <div className="flex items-center gap-1.5 pr-1">
                            <Icons.DecemberLogo className="w-4 h-4 text-[#87B2F4]" />
                            <span className="text-[12px] font-medium text-[#D6D5D4] hidden md:inline">
                                Docs
                            </span>
                        </div>
                    </div>

                    <div className="flex overflow-x-auto md:overflow-y-auto px-3 flex-row md:flex-col gap-1.5 md:gap-[2px] pb-2 md:pb-0 no-scrollbar items-center md:items-stretch">
                        <div className="hidden md:block px-3 py-1.5 text-[11.5px] font-semibold text-[#666666] uppercase tracking-wider mb-0.5">
                            Overview
                        </div>
                        <button
                            onClick={() => handleTabChange('Introduction')}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Introduction'
                                    ? 'bg-[#242323] text-white shadow-sm'
                                    : 'text-[#9A9998] hover:text-[#D6D5D4] hover:bg-[#191919]'
                            }`}
                        >
                            <Book className="w-[16px] h-[16px] text-[#87B2F4]" strokeWidth={1.75} />
                            Introduction
                        </button>
                        <button
                            onClick={() => handleTabChange('Quick Start')}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Quick Start'
                                    ? 'bg-[#242323] text-white shadow-sm'
                                    : 'text-[#9A9998] hover:text-[#D6D5D4] hover:bg-[#191919]'
                            }`}
                        >
                            <Zap className="w-[16px] h-[16px] text-[#E5B869]" strokeWidth={1.75} />
                            Quick Start
                        </button>

                        <div className="hidden md:block px-3 py-1.5 text-[11.5px] font-semibold text-[#666666] uppercase tracking-wider mt-3 mb-0.5">
                            Deep Dive
                        </div>
                        <button
                            onClick={() => handleTabChange('Architecture')}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Architecture'
                                    ? 'bg-[#242323] text-white shadow-sm'
                                    : 'text-[#9A9998] hover:text-[#D6D5D4] hover:bg-[#191919]'
                            }`}
                        >
                            <Code className="w-[16px] h-[16px] text-[#7FD6B0]" strokeWidth={1.75} />
                            Architecture
                        </button>
                        <button
                            onClick={() => handleTabChange('CLI Reference')}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'CLI Reference'
                                    ? 'bg-[#242323] text-white shadow-sm'
                                    : 'text-[#9A9998] hover:text-[#D6D5D4] hover:bg-[#191919]'
                            }`}
                        >
                            <Terminal
                                className="w-[16px] h-[16px] text-[#FF85A1]"
                                strokeWidth={1.75}
                            />
                            CLI Reference
                        </button>

                        <div className="hidden md:block px-3 py-1.5 text-[11.5px] font-semibold text-[#666666] uppercase tracking-wider mt-3 mb-0.5">
                            Legal & Policies
                        </div>
                        <button
                            onClick={() => handleTabChange('Privacy Policy')}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Privacy Policy'
                                    ? 'bg-[#242323] text-white shadow-sm'
                                    : 'text-[#9A9998] hover:text-[#D6D5D4] hover:bg-[#191919]'
                            }`}
                        >
                            <Shield
                                className="w-[16px] h-[16px] text-[#87B2F4]"
                                strokeWidth={1.75}
                            />
                            Privacy Policy
                        </button>
                        <button
                            onClick={() => handleTabChange('Terms of Service')}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeTab === 'Terms of Service'
                                    ? 'bg-[#242323] text-white shadow-sm'
                                    : 'text-[#9A9998] hover:text-[#D6D5D4] hover:bg-[#191919]'
                            }`}
                        >
                            <FileText
                                className="w-[16px] h-[16px] text-[#A3A29E]"
                                strokeWidth={1.75}
                            />
                            Terms of Service
                        </button>
                    </div>
                </div>

                {/* main content */}
                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[10px] [&::-webkit-scrollbar-track]:bg-[#141414] [&::-webkit-scrollbar-thumb]:bg-[#333333] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#444444]">
                    <div className="w-full flex justify-center px-4 md:px-14 py-6 md:py-10 relative z-10">
                        {activeTab === 'Privacy Policy' && <PrivacyPolicyContent />}

                        {activeTab === 'Terms of Service' && <TermsOfServiceContent />}

                        {activeTab === 'Introduction' && (
                            <div className="flex flex-col w-full max-w-[840px] text-[#D6D5C9] space-y-8">
                                <div className="flex flex-col border-b border-[#242323] pb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[12px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#87B2F4]/10 text-[#87B2F4] border border-[#87B2F4]/20">
                                            Documentation
                                        </span>
                                    </div>
                                    <h1 className="text-[26px] md:text-[32px] font-semibold text-white tracking-tight mb-2">
                                        About December Agent
                                    </h1>
                                    <p className="text-[14px] text-[#8F8E8D] leading-relaxed">
                                        December Agent is an autonomous AI software engineering
                                        platform and cloud workspace that creates, builds, tests,
                                        and deploys full-stack applications in isolated sandboxes.
                                    </p>
                                </div>

                                <section className="space-y-4">
                                    <h2 className="text-[18px] font-semibold text-white">
                                        Platform Overview & Purpose
                                    </h2>
                                    <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                                        December Agent transforms natural language prompts, bug
                                        reports, and architectural specifications into
                                        production-ready software. Designed from the ground up for
                                        modern full-stack workflows, December Agent combines deep
                                        codebase intelligence, live sandboxed execution, and
                                        integrated development tooling.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-2">
                                            <div className="flex items-center gap-2 text-white font-medium text-[14.5px]">
                                                <Sparkles className="w-4 h-4 text-[#87B2F4]" />
                                                Autonomous Coding
                                            </div>
                                            <p className="text-[13px] text-[#8F8E8D] leading-normal">
                                                Directly plans file changes, runs shell commands,
                                                fixes compiler & runtime errors, and iterates until
                                                applications run smoothly.
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-2">
                                            <div className="flex items-center gap-2 text-white font-medium text-[14.5px]">
                                                <Layers className="w-4 h-4 text-[#7FD6B0]" />
                                                Isolated Cloud Sandboxes
                                            </div>
                                            <p className="text-[13px] text-[#8F8E8D] leading-normal">
                                                Every session runs inside an isolated micro-VM
                                                container with instant live web previews, hot module
                                                reloading, and terminal access.
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-2">
                                            <div className="flex items-center gap-2 text-white font-medium text-[14.5px]">
                                                <Terminal className="w-4 h-4 text-[#FF85A1]" />
                                                Terminal Agent CLI
                                            </div>
                                            <p className="text-[13px] text-[#8F8E8D] leading-normal">
                                                Run the same powerful agent right inside your local
                                                terminal via the npm package{' '}
                                                <code className="text-white bg-[#222222] px-1 py-0.5 rounded text-[12px]">
                                                    @trydecember/cli
                                                </code>
                                                .
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-2">
                                            <div className="flex items-center gap-2 text-white font-medium text-[14.5px]">
                                                <Lock className="w-4 h-4 text-[#E5B869]" />
                                                Authentication & Privacy
                                            </div>
                                            <p className="text-[13px] text-[#8F8E8D] leading-normal">
                                                Sign in securely with Google OAuth or GitHub. Your
                                                private source code is never used to train
                                                generalized foundation models.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-3 bg-[#171717] border border-[#2B2B2B] rounded-xl p-5">
                                    <h2 className="text-[16px] font-semibold text-white">
                                        Google Authentication & OAuth Usage
                                    </h2>
                                    <p className="text-[13.5px] text-[#A3A29E] leading-relaxed">
                                        December Agent utilizes Google OAuth to provide a secure,
                                        frictionless sign-in experience. When authenticating with
                                        Google:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-[13.5px] text-[#A3A29E] pl-2">
                                        <li>
                                            We access only your basic Google account profile (name,
                                            email address, and avatar) to manage your user account.
                                        </li>
                                        <li>
                                            We strictly comply with the{' '}
                                            <a
                                                href="https://developers.google.com/terms/api-services-user-data-policy"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#87B2F4] underline"
                                            >
                                                Google API Services User Data Policy
                                            </a>
                                            , including Limited Use requirements.
                                        </li>
                                        <li>
                                            Your Google user information is never sold or shared
                                            with third-party advertisers.
                                        </li>
                                    </ul>
                                    <div className="pt-2">
                                        <button
                                            onClick={() => handleTabChange('Privacy Policy')}
                                            className="text-[13px] text-[#87B2F4] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                        >
                                            Read our complete Privacy Policy{' '}
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-[17px] font-semibold text-white">
                                        Next Steps
                                    </h2>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => handleTabChange('Quick Start')}
                                            className="px-4 py-2 bg-[#222222] hover:bg-[#2A2A2A] text-white rounded-lg text-[13px] font-medium border border-[#333333] transition-colors cursor-pointer"
                                        >
                                            Read Quick Start Guide &rarr;
                                        </button>
                                        <button
                                            onClick={() => handleTabChange('CLI Reference')}
                                            className="px-4 py-2 bg-[#222222] hover:bg-[#2A2A2A] text-white rounded-lg text-[13px] font-medium border border-[#333333] transition-colors cursor-pointer"
                                        >
                                            Explore December CLI &rarr;
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'Quick Start' && (
                            <div className="flex flex-col w-full max-w-[840px] text-[#D6D5C9] space-y-8">
                                <div className="flex flex-col border-b border-[#242323] pb-6">
                                    <h1 className="text-[26px] md:text-[32px] font-semibold text-white tracking-tight mb-2">
                                        Quick Start Guide
                                    </h1>
                                    <p className="text-[14px] text-[#8F8E8D]">
                                        Get up and running with December Agent in under 2 minutes.
                                    </p>
                                </div>

                                <section className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-full bg-[#87B2F4]/20 text-[#87B2F4] font-semibold text-[13px] flex items-center justify-center">
                                            1
                                        </span>
                                        <h2 className="text-[17px] font-semibold text-white">
                                            Create a Project on Web
                                        </h2>
                                    </div>
                                    <p className="text-[14px] text-[#A3A29E] leading-relaxed pl-10">
                                        Visit{' '}
                                        <a
                                            href="https://trydecember.com"
                                            className="text-[#87B2F4] hover:underline"
                                        >
                                            trydecember.com
                                        </a>{' '}
                                        and enter any software prompt in the hero input (e.g.,{' '}
                                        <em className="text-[#D6D5C9]">
                                            &quot;Build a full-stack Kanban board with Tailwind and
                                            SQLite&quot;
                                        </em>
                                        ). December Agent will scaffold the architecture, install
                                        dependencies, and spin up an isolated live preview.
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-full bg-[#87B2F4]/20 text-[#87B2F4] font-semibold text-[13px] flex items-center justify-center">
                                            2
                                        </span>
                                        <h2 className="text-[17px] font-semibold text-white">
                                            Install December CLI in Terminal
                                        </h2>
                                    </div>
                                    <div className="pl-10 space-y-3">
                                        <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                                            You can also run December Agent directly in your local
                                            terminal workspace:
                                        </p>
                                        <div className="bg-[#111111] border border-[#282828] rounded-lg p-3 font-mono text-[13px] text-[#7FD6B0]">
                                            npm install -g @trydecember/cli
                                        </div>
                                        <p className="text-[13px] text-[#8F8E8D]">
                                            Authenticate your session with{' '}
                                            <code className="text-white bg-[#1E1E1E] px-1 py-0.5 rounded text-[12px]">
                                                december login
                                            </code>{' '}
                                            and launch the interactive agent in any repo with{' '}
                                            <code className="text-white bg-[#1E1E1E] px-1 py-0.5 rounded text-[12px]">
                                                december
                                            </code>
                                            .
                                        </p>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'Architecture' && (
                            <div className="flex flex-col w-full max-w-[840px] text-[#D6D5C9] space-y-8">
                                <div className="flex flex-col border-b border-[#242323] pb-6">
                                    <h1 className="text-[26px] md:text-[32px] font-semibold text-white tracking-tight mb-2">
                                        System Architecture
                                    </h1>
                                    <p className="text-[14px] text-[#8F8E8D]">
                                        How December Agent isolates execution and orchestrates
                                        autonomous workflows.
                                    </p>
                                </div>

                                <section className="space-y-3">
                                    <h2 className="text-[17px] font-semibold text-white">
                                        Micro-VM Container Sandboxes
                                    </h2>
                                    <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                                        Every user workspace operates within a hardware-isolated
                                        sandbox container. The container manages dependencies, file
                                        system mutations, preview server ports, and terminal
                                        executions in complete isolation from other users and
                                        production systems.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-[17px] font-semibold text-white">
                                        Agent Decision Loop
                                    </h2>
                                    <p className="text-[14px] text-[#A3A29E] leading-relaxed">
                                        December Agent follows an iterative
                                        inspect-plan-execute-verify cycle. It inspects repository
                                        structure, generates code diffs, verifies compiler output,
                                        and self-corrects runtime errors before presenting completed
                                        versions to the developer.
                                    </p>
                                </section>
                            </div>
                        )}

                        {activeTab === 'CLI Reference' && (
                            <div className="flex flex-col w-full max-w-[840px] text-[#D6D5C9] space-y-8">
                                <div className="flex flex-col border-b border-[#242323] pb-6">
                                    <h1 className="text-[26px] md:text-[32px] font-semibold text-white tracking-tight mb-2">
                                        December CLI Reference
                                    </h1>
                                    <p className="text-[14px] text-[#8F8E8D]">
                                        Command line reference for the{' '}
                                        <code className="text-white font-mono">
                                            @trydecember/cli
                                        </code>{' '}
                                        package.
                                    </p>
                                </div>

                                <section className="space-y-4">
                                    <h2 className="text-[17px] font-semibold text-white">
                                        Commands
                                    </h2>
                                    <div className="space-y-3 font-mono text-[13px]">
                                        <div className="p-3 bg-[#111111] border border-[#242323] rounded-lg">
                                            <div className="text-[#87B2F4] font-bold">
                                                december login
                                            </div>
                                            <div className="font-sans text-[13px] text-[#8F8E8D] mt-1">
                                                Authenticates your terminal device with your
                                                December account via browser handshake.
                                            </div>
                                        </div>
                                        <div className="p-3 bg-[#111111] border border-[#242323] rounded-lg">
                                            <div className="text-[#87B2F4] font-bold">december</div>
                                            <div className="font-sans text-[13px] text-[#8F8E8D] mt-1">
                                                Launches the full interactive TUI agent in the
                                                current working directory.
                                            </div>
                                        </div>
                                        <div className="p-3 bg-[#111111] border border-[#242323] rounded-lg">
                                            <div className="text-[#87B2F4] font-bold">
                                                december --help
                                            </div>
                                            <div className="font-sans text-[13px] text-[#8F8E8D] mt-1">
                                                Displays all available flags, model selections, and
                                                configuration options.
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
