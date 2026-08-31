import { useQuery } from '@tanstack/react-query'
import { Check, ArrowUpRight, ShieldCheck } from 'lucide-react'
import React from 'react'

import { profileAPI } from '@/features/profile/api/profile'
import { Icons } from '@/shared/components/ui/Icons'

const GithubIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
)

const VercelIcon = () => (
    <svg viewBox="0 0 76 65" fill="currentColor" className="w-5 h-5">
        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
    </svg>
)

const NotionIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M4.46 4.21c.75.6 1.03.56 2.43.46L20.1 3.88c.28 0 .05-.28-.04-.33L17.86 1.97c-.42-.33-.98-.7-2.05-.61L3.01 2.3c-.47.04-.56.28-.37.47zm.79 3.08v13.9c0 .75.37 1.03 1.21.98l14.53-.84c.84-.04.93-.56.93-1.17V6.35c0-.6-.23-.93-.75-.89l-15.17.89c-.56.04-.75.33-.75.93zm14.34.74c.09.42 0 .84-.42.89l-.7.14v10.26c-.61.33-1.17.52-1.64.52-.75 0-.93-.23-1.5-.93l-4.57-7.19v6.95l1.45-.19s0 .84-1.17.84l-3.22.19c-.09-.19 0-.66.33-.75l.84-.23V9.85l-1.45-.1c-.09-.42.14-1.03.79-1.07l3.46-.23 4.76 7.28v-6.44l-1.21-.14c-.1-.51.27-.89.74-.93zM1.94 1.04l13.3-.98c1.64-.14 2.06-.05 3.08.7l4.25 2.99c.7.51.94.65.94 1.21v16.38c0 1.03-.37 1.63-1.68 1.73l-15.46.93c-.98.05-1.45-.09-1.96-.75L1.28 17.5c-.56-.75-.79-1.3-.79-1.96V2.67c0-.84.37-1.54 1.45-1.63z" />
    </svg>
)

const SupabaseIcon = () => (
    <svg viewBox="0 0 24 24" fill="#3ECF8E" className="w-5 h-5">
        <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z" />
    </svg>
)

const FigmaIcon = () => (
    <svg viewBox="0 0 38 57" fill="none" className="w-5 h-5">
        <path
            d="M19 28.5C19 33.7467 14.7467 38 9.5 38C4.25329 38 0 33.7467 0 28.5C0 23.2533 4.25329 19 9.5 19H19V28.5Z"
            fill="#A259FF"
        />
        <path
            d="M9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5C0 4.2533 4.25329 0 9.5 0Z"
            fill="#F24E1E"
        />
        <path
            d="M28.5 0H19V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.2533 33.7467 0 28.5 0Z"
            fill="#FF7262"
        />
        <path
            d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z"
            fill="#1ABCFE"
        />
        <path
            d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z"
            fill="#0ACF83"
        />
    </svg>
)

interface ConnectorItem {
    id: string
    name: string
    category: 'Source Code' | 'Deployments' | 'Databases' | 'Knowledge & Design'
    description: string
    icon: React.ReactNode
    iconBg?: string
    isConnected: boolean
    badge?: string
    onConnect?: () => void
}

export const ConnectorsPage: React.FC = () => {
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
    })

    const isGithubConnected = Boolean(profile?.githubConnected)
    const isVercelConnected = Boolean((profile as any)?.vercelConnected)
    const isSupabaseConnected = Boolean((profile as any)?.supabaseConnected)
    const isNotionConnected = Boolean((profile as any)?.notionConnected)

    const connectGithub = () => {
        const url = profile?.id
            ? profileAPI.getGithubConnectUrl(profile.id)
            : profileAPI.getGithubConnectUrl('')
        window.location.href = url
    }

    const connectVercel = () => {
        const url = profileAPI.getVercelConnectUrl('connectors')
        window.location.href = url
    }

    const connectSupabase = () => {
        const url = profileAPI.getSupabaseConnectUrl('connectors')
        window.location.href = url
    }

    const connectNotion = () => {
        const url = profileAPI.getNotionConnectUrl('connectors')
        window.location.href = url
    }

    const connectors: ConnectorItem[] = [
        {
            id: 'github',
            name: 'GitHub',
            category: 'Source Code',
            description:
                'Import repositories, commit changes, open pull requests, and trigger autonomous review workflows directly from December.',
            icon: <GithubIcon />,
            iconBg: 'bg-[#24292E]',
            isConnected: isGithubConnected,
            onConnect: connectGithub,
        },
        {
            id: 'vercel',
            name: 'Vercel',
            category: 'Deployments',
            description:
                'Deploy applications and manage preview builds automatically with unified build logs and deployment URLs.',
            icon: <VercelIcon />,
            iconBg: 'bg-[#000000]',
            isConnected: isVercelConnected,
            onConnect: connectVercel,
        },
        {
            id: 'supabase',
            name: 'Supabase',
            category: 'Databases',
            description:
                'Connect database schemas, tables, and PostgreSQL migrations so the AI agent understands your data models.',
            icon: <SupabaseIcon />,
            iconBg: 'bg-[#1C2C24]',
            isConnected: isSupabaseConnected,
            onConnect: connectSupabase,
        },
        {
            id: 'notion',
            name: 'Notion',
            category: 'Knowledge & Design',
            description:
                'Index documentation, product requirements documents (PRDs), and engineering wikis as real-time context for your agent.',
            icon: <NotionIcon />,
            iconBg: 'bg-[#202020]',
            isConnected: isNotionConnected,
            onConnect: connectNotion,
        },
        {
            id: 'figma',
            name: 'Figma',
            category: 'Knowledge & Design',
            description:
                'Extract design tokens, UI component specifications, and design system variables to build pixel-perfect interfaces.',
            icon: <FigmaIcon />,
            iconBg: 'bg-[#1E1B2E]',
            isConnected: false,
            badge: 'Soon',
            onConnect: undefined,
        },
    ]

    const connectedCount = connectors.filter((c) => c.isConnected).length

    return (
        <div className="flex flex-col w-full h-full bg-[#121212] overflow-y-auto text-[#D6D5C9]">
            <div className="max-w-4xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
                {/* Header */}
                <div className="flex flex-col gap-2 border-b border-[#242323] pb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#1D1D1D] border border-[#2D2D2D] flex items-center justify-center text-[#EDEDEF]">
                                <Icons.Connectors className="w-5 h-5" />
                            </div>
                            <h1 className="text-[22px] font-semibold text-white tracking-tight">
                                Connectors
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#282828] px-3 py-1.5 rounded-full text-[12px] text-[#A0A0A0]">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>
                                {connectedCount} of {connectors.length} active
                            </span>
                        </div>
                    </div>
                    <p className="text-[13.5px] text-[#8F8E8D] max-w-2xl leading-relaxed mt-1">
                        Connect external services, databases, deployment platforms, and design
                        systems to equip December with deep ecosystem context.
                    </p>
                </div>

                {/* Grid of Connectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connectors.map((connector) => {
                        const isUnavailable = !connector.onConnect && !connector.isConnected
                        return (
                            <div
                                key={connector.id}
                                className="flex flex-col justify-between p-5 rounded-2xl bg-[#181818] border border-[#262626] hover:border-[#363636] transition-all group"
                            >
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center border border-[#333333] shrink-0 ${
                                                    connector.iconBg || 'bg-[#1F1F1F]'
                                                }`}
                                            >
                                                {connector.icon}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[15px] font-medium text-white">
                                                        {connector.name}
                                                    </span>
                                                    {connector.badge && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#242424] text-[#8F8E8D] border border-[#333333]">
                                                            {connector.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11.5px] text-[#6E6E6E] font-medium">
                                                    {connector.category}
                                                </span>
                                            </div>
                                        </div>

                                        {connector.isConnected ? (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[12px] font-medium">
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Connected</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={connector.onConnect}
                                                disabled={isUnavailable}
                                                className={`px-3 py-1.5 rounded-xl border text-[12.5px] font-medium transition-all flex items-center gap-1.5 outline-none cursor-pointer ${
                                                    isUnavailable
                                                        ? 'border-[#292929] text-[#555555] cursor-not-allowed'
                                                        : 'border-[#383838] bg-[#222222] text-[#EDEDEF] hover:bg-[#2A2A2A] hover:border-[#484848] active:scale-[0.98]'
                                                }`}
                                            >
                                                <span>{isUnavailable ? 'Soon' : 'Connect'}</span>
                                                {!isUnavailable && (
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-[12.5px] text-[#8F8E8D] leading-relaxed line-clamp-3">
                                        {connector.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer Security Note */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#161616] border border-[#222222] text-[12px] text-[#7A7A7A] mt-4">
                    <ShieldCheck className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>
                        Credentials and OAuth tokens are encrypted at rest with AES-256-GCM.
                        December only requests scopes strictly required for agent actions.
                    </span>
                </div>
            </div>
        </div>
    )
}
