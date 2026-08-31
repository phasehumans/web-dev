import React from 'react'

export interface ProfileConnectionsSettingsProps {
    isGithubConnected: boolean
    isVercelConnected: boolean
    isSupabaseConnected: boolean
    isNotionConnected: boolean
    onConnectGithub: () => void
    onConnectVercel: () => void
    onConnectSupabase: () => void
    onConnectNotion: () => void
}

// Icons
const GithubIcon = () => (
    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
)

const VercelIcon = () => (
    <svg viewBox="0 0 76 65" fill="white" className="w-5 h-5">
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

export const ProfileConnectionsSettings: React.FC<ProfileConnectionsSettingsProps> = ({
    isGithubConnected,
    onConnectGithub,
    isVercelConnected,
    isSupabaseConnected,
    isNotionConnected,
    onConnectVercel,
    onConnectSupabase,
    onConnectNotion,
}) => {
    const connectionsList = [
        {
            id: 'github' as const,
            name: 'GitHub',
            description:
                'Connect your GitHub account to import repositories and track code changes.',
            Icon: GithubIcon,
            iconColor: '#D6D5C9',
            isConnected: isGithubConnected,
            onConnect: onConnectGithub,
        },
        {
            id: 'vercel' as const,
            name: 'Vercel',
            description: 'Deploy and manage your projects directly from december.',
            Icon: VercelIcon,
            iconColor: '#D6D5C9',
            isConnected: isVercelConnected,
            onConnect: onConnectVercel,
        },
        {
            id: 'supabase' as const,
            name: 'Supabase',
            description: 'Connect your Supabase project to manage database schemas and tables.',
            Icon: SupabaseIcon,
            iconColor: '#D6D5C9',
            isConnected: isSupabaseConnected,
            onConnect: onConnectSupabase,
        },
        {
            id: 'notion' as const,
            name: 'Notion',
            description: 'Pull in pages and databases from Notion as project context.',
            Icon: NotionIcon,
            iconColor: '#D6D5C9',
            isConnected: isNotionConnected,
            onConnect: onConnectNotion,
        },
        {
            id: 'figma' as const,
            name: 'Figma',
            description:
                'Import styles, components, and design tokens directly from your Figma files.',
            Icon: FigmaIcon,
            iconColor: '#D6D5C9',
            isConnected: false,
            onConnect: undefined,
        },
    ]

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* Connections Section */}
            <div className="flex flex-col mb-0">
                <h1 className="text-[16px] font-medium mb-3">Connections</h1>
                <div className="flex flex-col border-t border-[#242323] pt-4 gap-4">
                    <p className="text-[13px] text-[#7B7A79]">
                        Connect third-party accounts and services to deploy apps, manage databases,
                        and automate workflows.
                    </p>
                    <div className="flex flex-col sm:gap-5 pt-1">
                        {connectionsList.map(
                            ({
                                id,
                                name,
                                description,
                                Icon,
                                iconColor,
                                isConnected,
                                onConnect,
                            }) => {
                                const isUnavailable = !onConnect
                                return (
                                    <div
                                        key={id}
                                        className="flex items-center justify-between gap-3 sm:gap-4 py-3.5 sm:py-0 border-b border-[#242323]/50 sm:border-none last:border-b-0"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                                            <div
                                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#191919] border border-[#383736] flex items-center justify-center shrink-0"
                                                style={{ color: iconColor }}
                                            >
                                                <Icon />
                                            </div>
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <span className="text-[14px] font-medium text-[#D6D5C9] truncate">
                                                    {name}
                                                </span>
                                                <span className="text-[12px] sm:text-[12.5px] text-[#7B7A79] sm:max-w-[380px] leading-relaxed line-clamp-1 sm:line-clamp-none">
                                                    {description}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onConnect}
                                            disabled={isConnected || isUnavailable}
                                            className={`px-3 sm:px-4 py-1.5 rounded-lg border text-[12px] sm:text-[13px] font-medium transition-all shrink-0 text-center cursor-pointer ${
                                                isConnected
                                                    ? 'border-[#383736] bg-[#191919] text-[#6A6968] cursor-default'
                                                    : isUnavailable
                                                      ? 'border-[#2B2A29] text-[#4A4948] cursor-not-allowed'
                                                      : 'border-[#383736] text-[#D6D5C9] hover:bg-[#191919] active:bg-[#202020]'
                                            }`}
                                        >
                                            {isConnected
                                                ? 'Connected'
                                                : isUnavailable
                                                  ? 'Soon'
                                                  : 'Connect'}
                                        </button>
                                    </div>
                                )
                            }
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
