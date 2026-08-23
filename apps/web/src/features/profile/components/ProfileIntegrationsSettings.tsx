import { Check, Plus } from 'lucide-react'
import React, { useState } from 'react'

type IntegrationId = 'github' | 'vercel' | 'supabase' | 'notion' | 'figma'

interface ProfileIntegrationsSettingsProps {
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

interface McpServerItem {
    id: string
    name: string
    description: string
    installed: boolean
    iconBg: string
    iconContent: React.ReactNode
    category: string
}

const RECOMMENDED_MCP_SERVERS: McpServerItem[] = [
    {
        id: 'github-mcp',
        name: 'GitHub',
        description:
            'Search repositories, issues, pull requests, files, and commits via the official GitHub MCP server.',
        installed: false,
        iconBg: 'bg-[#24292E]',
        iconContent: <GithubIcon />,
        category: 'Developer Tools',
    },
    {
        id: 'figma-mcp',
        name: 'Figma',
        description:
            'Complete Figma API integration: get files/nodes/images, manage comments and design components.',
        installed: false,
        iconBg: 'bg-[#1E1B2E]',
        iconContent: <FigmaIcon />,
        category: 'Design',
    },
    {
        id: 'postgres-mcp',
        name: 'PostgreSQL',
        description:
            'Execute SQL queries, inspect table schemas, and analyze database structures securely.',
        installed: false,
        iconBg: 'bg-[#336791]',
        iconContent: <span className="text-[10px] font-bold text-white">PG</span>,
        category: 'Database',
    },
    {
        id: 'slack-mcp',
        name: 'Slack',
        description:
            'Read and reply to Slack channels, post messages, inspect user profiles, and search chat history.',
        installed: false,
        iconBg: 'bg-[#4A154B]',
        iconContent: <span className="text-[11px] font-bold text-white">#</span>,
        category: 'Productivity',
    },
    {
        id: 'atlassian-mcp',
        name: 'Atlassian',
        description:
            'Official Atlassian integration for Jira and Confluence - access enterprise knowledge base.',
        installed: false,
        iconBg: 'bg-[#0052CC]',
        iconContent: (
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M11.53 2c0 2.4-1.97 4.35-4.38 4.35H3.5A1.5 1.5 0 0 0 2 7.85v3.65c0 .83.67 1.5 1.5 1.5h3.65c2.41 0 4.38-1.95 4.38-4.35V2zm.94 13.35c0-2.4 1.97-4.35 4.38-4.35h3.65a1.5 1.5 0 0 1 1.5 1.5v3.65a1.5 1.5 0 0 1-1.5 1.5h-3.65c-2.41 0-4.38-1.95-4.38-4.35v-1.65z" />
            </svg>
        ),
        category: 'Productivity',
    },
    {
        id: 'linear-mcp',
        name: 'Linear',
        description:
            'List, create, update, and query Linear objects—issues, projects, initiatives, cycles, and teams.',
        installed: false,
        iconBg: 'bg-[#5E6AD2]',
        iconContent: (
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <circle cx="12" cy="12" r="10" />
            </svg>
        ),
        category: 'Productivity',
    },
    {
        id: 'notion-mcp',
        name: 'Notion',
        description:
            'Retrieve and manage Notion pages, databases, and comments; search across workspace pages.',
        installed: false,
        iconBg: 'bg-[#242323]',
        iconContent: <NotionIcon />,
        category: 'Productivity',
    },
    {
        id: 'sentry-mcp',
        name: 'Sentry',
        description:
            'Retrieve detailed Sentry issue data and full stack traces. Also search and filter issues and releases.',
        installed: false,
        iconBg: 'bg-[#362D59]',
        iconContent: (
            <svg viewBox="0 0 24 24" fill="#E1567C" className="w-4 h-4">
                <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6z" />
            </svg>
        ),
        category: 'Monitoring',
    },
    {
        id: 'brave-search-mcp',
        name: 'Brave Search',
        description:
            'Perform real-time web search and retrieve fresh search results via Brave Search API.',
        installed: false,
        iconBg: 'bg-[#FF1A1A]',
        iconContent: <span className="text-[10px] font-bold text-white">B</span>,
        category: 'Search',
    },
    {
        id: 'context7-mcp',
        name: 'Context7',
        description: 'Access up-to-date documentation for 1000+ npm packages and frameworks.',
        installed: false,
        iconBg: 'bg-[#242323]',
        iconContent: <span className="text-[11px] font-bold text-[#D6D5C9]">CO</span>,
        category: 'Documentation',
    },
    {
        id: 'puppeteer-mcp',
        name: 'Puppeteer',
        description:
            'Headless browser automation to navigate pages, render JavaScript, capture screenshots, and scrape content.',
        installed: false,
        iconBg: 'bg-[#00D8A2]',
        iconContent: <span className="text-[10px] font-bold text-black">P</span>,
        category: 'Developer Tools',
    },
    {
        id: 'playwright-mcp',
        name: 'Playwright',
        description:
            'Automate browser interactions and inspect pages: navigate URLs, handle dialogs, and take screenshots.',
        installed: false,
        iconBg: 'bg-[#45BA4B]',
        iconContent: (
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5h-2v-2h2zm0-4h-2v-6h2z" />
            </svg>
        ),
        category: 'Testing',
    },
    {
        id: 'deepwiki-mcp',
        name: 'DeepWiki',
        description:
            'Access comprehensive documentation for GitHub repositories with AI-powered search.',
        installed: false,
        iconBg: 'bg-[#00B4D8]',
        iconContent: (
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
        ),
        category: 'Documentation',
    },
]

const ALL_MCP_SERVERS: McpServerItem[] = [
    {
        id: 'cloudflare-mcp',
        name: 'Cloudflare',
        description:
            'Manage Cloudflare Workers, KV namespaces, R2 storage buckets, DNS records, and WAF settings.',
        installed: false,
        iconBg: 'bg-[#F38020]',
        iconContent: <span className="text-[10px] font-bold text-white">CF</span>,
        category: 'Cloud',
    },
    {
        id: 'stripe-mcp',
        name: 'Stripe',
        description:
            'Query customers, subscriptions, invoices, charges, and payment intents in Stripe.',
        installed: false,
        iconBg: 'bg-[#635BFF]',
        iconContent: <span className="text-[11px] font-bold text-white">S</span>,
        category: 'Finance',
    },
    {
        id: 'datadog-mcp',
        name: 'Datadog',
        description:
            'Query Datadog metrics, APM traces, monitors, service health, and infrastructure log analytics.',
        installed: false,
        iconBg: 'bg-[#632CA6]',
        iconContent: <span className="text-[10px] font-bold text-white">DD</span>,
        category: 'Monitoring',
    },
    {
        id: 'pinecone-mcp',
        name: 'Pinecone',
        description:
            'Vector database similarity search, index query execution, and high-dimensional embedding retrieval.',
        installed: false,
        iconBg: 'bg-[#111827]',
        iconContent: <span className="text-[10px] font-bold text-white">PC</span>,
        category: 'AI / Database',
    },
    {
        id: 'mongodb-mcp',
        name: 'MongoDB Atlas',
        description:
            'Query document collections, inspect schemas, execute aggregation pipelines, and manage indexes.',
        installed: false,
        iconBg: 'bg-[#13AA52]',
        iconContent: <span className="text-[10px] font-bold text-white">M</span>,
        category: 'Database',
    },
    {
        id: 'docker-mcp',
        name: 'Docker',
        description:
            'Manage local Docker containers, images, volumes, compose stacks, and inspect container logs.',
        installed: false,
        iconBg: 'bg-[#2496ED]',
        iconContent: <span className="text-[10px] font-bold text-white">D</span>,
        category: 'DevOps',
    },
    {
        id: 'gitlab-mcp',
        name: 'GitLab',
        description:
            'Access GitLab projects, issues, merge requests, CI/CD pipeline runs, and repository files.',
        installed: false,
        iconBg: 'bg-[#FC6D26]',
        iconContent: <span className="text-[10px] font-bold text-white">GL</span>,
        category: 'Developer Tools',
    },
    {
        id: 'neon-mcp',
        name: 'Neon Postgres',
        description:
            'Serverless Postgres database operations, instant branching, and SQL query execution via Neon API.',
        installed: false,
        iconBg: 'bg-[#00E599]',
        iconContent: <span className="text-[10px] font-bold text-black">N</span>,
        category: 'Database',
    },
    {
        id: 'supabase-mcp-server',
        name: 'Supabase Server',
        description:
            'Direct Supabase project management: query tables, run migrations, and manage storage buckets.',
        installed: false,
        iconBg: 'bg-[#3ECF8E]',
        iconContent: <SupabaseIcon />,
        category: 'Database',
    },
    {
        id: 'trello-mcp',
        name: 'Trello',
        description:
            'Query Trello boards, lists, cards, checklists, and manage team project workflows.',
        installed: false,
        iconBg: 'bg-[#0079BF]',
        iconContent: <span className="text-[10px] font-bold text-white">TR</span>,
        category: 'Productivity',
    },
    {
        id: 'clickup-mcp',
        name: 'ClickUp',
        description:
            'Manage ClickUp tasks, folders, spaces, time tracking, custom fields, and workspace goals.',
        installed: false,
        iconBg: 'bg-[#7B68EE]',
        iconContent: <span className="text-[10px] font-bold text-white">CU</span>,
        category: 'Productivity',
    },
    {
        id: 'hubspot-mcp',
        name: 'HubSpot CRM',
        description:
            'Access CRM contacts, companies, deals, marketing campaigns, and sales pipelines in HubSpot.',
        installed: false,
        iconBg: 'bg-[#FF7A59]',
        iconContent: <span className="text-[10px] font-bold text-white">HS</span>,
        category: 'CRM',
    },
    {
        id: 'zendesk-mcp',
        name: 'Zendesk',
        description:
            'Query support tickets, customer conversations, SLAs, and search Help Center knowledge articles.',
        installed: false,
        iconBg: 'bg-[#03363D]',
        iconContent: <span className="text-[10px] font-bold text-white">ZD</span>,
        category: 'Support',
    },
    {
        id: 'elasticsearch-mcp',
        name: 'Elasticsearch',
        description:
            'Full-text search query execution, cluster stats inspection, and index mapping management.',
        installed: false,
        iconBg: 'bg-[#005571]',
        iconContent: <span className="text-[10px] font-bold text-white">ES</span>,
        category: 'Search',
    },
    {
        id: 'google-maps-mcp',
        name: 'Google Maps',
        description:
            'Geocoding, place search, travel directions, distance matrix, and spatial intelligence.',
        installed: false,
        iconBg: 'bg-[#4285F4]',
        iconContent: <span className="text-[10px] font-bold text-white">GM</span>,
        category: 'Location',
    },
    {
        id: 'redshift-mcp',
        name: 'Amazon Redshift (IAM Auth)',
        description: 'Amazon Redshift integration for data warehouse operations and analytics.',
        installed: false,
        iconBg: 'bg-[#FF9900]',
        iconContent: <span className="text-[9px] font-bold text-black">aws</span>,
        category: 'Database',
    },
    {
        id: 'amplitude-mcp',
        name: 'Amplitude',
        description:
            'Analyze product data, experiments, and user behavior in Amplitude: query and inspect analytics.',
        installed: false,
        iconBg: 'bg-[#1E429F]',
        iconContent: <span className="text-[11px] font-bold text-white">A</span>,
        category: 'Analytics',
    },
    {
        id: 'apollo-graphos-mcp',
        name: 'Apollo GraphOS',
        description: 'Apollo GraphOS integration to search Apollo docs, specs, and best practices.',
        installed: false,
        iconBg: 'bg-[#311C87]',
        iconContent: <span className="text-[10px] font-bold text-white">AG</span>,
        category: 'GraphQL',
    },
    {
        id: 'apollo-io-mcp',
        name: 'Apollo.io',
        description:
            'Apollo.io integration to search prospects, enrich contacts, and manage sales workflows.',
        installed: false,
        iconBg: 'bg-[#111827]',
        iconContent: <span className="text-[10px] font-bold text-white">AI</span>,
        category: 'CRM',
    },
    {
        id: 'asana-mcp',
        name: 'Asana',
        description:
            'Official Asana integration for task management, project tracking, and team collaboration.',
        installed: false,
        iconBg: 'bg-[#F06A6A]',
        iconContent: <span className="text-[11px] font-bold text-white">•••</span>,
        category: 'Productivity',
    },
    {
        id: 'attio-mcp',
        name: 'Attio',
        description:
            'Attio CRM integration for managing contacts, companies, deals, tasks, notes, and custom objects.',
        installed: false,
        iconBg: 'bg-[#242323]',
        iconContent: <span className="text-[10px] font-bold text-[#D6D5C9]">AT</span>,
        category: 'CRM',
    },
    {
        id: 'aura-mcp',
        name: 'Aura',
        description: 'Aura integration for company intelligence and workforce analytics.',
        installed: false,
        iconBg: 'bg-[#242323]',
        iconContent: <span className="text-[10px] font-bold text-[#D6D5C9]">AU</span>,
        category: 'Analytics',
    },
    {
        id: 'aws-marketplace-mcp',
        name: 'AWS Marketplace',
        description: 'AWS Marketplace integration to discover, evaluate, and buy cloud solutions.',
        installed: false,
        iconBg: 'bg-[#FF9900]',
        iconContent: <span className="text-[9px] font-bold text-black">AM</span>,
        category: 'Cloud',
    },
    {
        id: 'axiom-apikey-mcp',
        name: 'Axiom (API key)',
        description: 'Query logs, traces, and events in Axiom using API key authentication.',
        installed: false,
        iconBg: 'bg-[#111827]',
        iconContent: <span className="text-[10px] font-bold text-white">A(</span>,
        category: 'Monitoring',
    },
    {
        id: 'axiom-oauth-mcp',
        name: 'Axiom (OAuth)',
        description: 'Query logs, traces, and events in Axiom using OAuth authentication.',
        installed: false,
        iconBg: 'bg-[#111827]',
        iconContent: <span className="text-[10px] font-bold text-white">A(</span>,
        category: 'Monitoring',
    },
]

export const ProfileIntegrationsSettings: React.FC<ProfileIntegrationsSettingsProps> = ({
    isGithubConnected,
    onConnectGithub,
    isVercelConnected,
    isSupabaseConnected,
    isNotionConnected,
    onConnectVercel,
    onConnectSupabase,
    onConnectNotion,
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [customMcpName, setCustomMcpName] = useState('')
    const [customMcpCommand, setCustomMcpCommand] = useState('')
    const [installedServers, setInstalledServers] = useState<Record<string, boolean>>({})

    const integrationsList = [
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

    const toggleInstallMcp = (id: string) => {
        setInstalledServers((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    const handleAddCustomMcp = (e: React.FormEvent) => {
        e.preventDefault()
        if (!customMcpName.trim()) return
        setIsAddModalOpen(false)
        setCustomMcpName('')
        setCustomMcpCommand('')
    }

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* Integrations Section */}
            <div className="flex flex-col mb-12">
                <h1 className="text-[16px] font-medium mb-4">Integrations</h1>
                <div className="flex flex-col sm:gap-5 border-t border-[#242323] pt-4 sm:pt-6">
                    {integrationsList.map(
                        ({ id, name, description, Icon, iconColor, isConnected, onConnect }) => {
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

            {/* MCP Servers Section */}
            <div className="flex flex-col mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[16px] font-medium text-white">MCP Servers</h1>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#383736] text-[12.5px] font-medium text-[#D6D5C9] hover:bg-[#242323] transition-colors cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add server</span>
                    </button>
                </div>
                <div className="flex flex-col border-t border-[#242323] pt-6">
                    {/* Recommended Subsection */}
                    <div className="flex flex-col mb-8">
                        <span className="text-[13px] font-medium text-[#8F8E8D] mb-3">
                            Recommended
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {RECOMMENDED_MCP_SERVERS.map((server) => {
                                const isInstalled = Boolean(installedServers[server.id])
                                return (
                                    <div
                                        key={server.id}
                                        className="p-4 bg-[#191919] border border-[#242323] rounded-xl flex flex-col gap-2.5 hover:border-[#313131] transition-colors group cursor-pointer"
                                        onClick={() => toggleInstallMcp(server.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className={`w-6 h-6 rounded-md ${server.iconBg} flex items-center justify-center shrink-0`}
                                                >
                                                    {server.iconContent}
                                                </div>
                                                <span className="text-[14px] font-medium text-[#D6D5C9] truncate">
                                                    {server.name}
                                                </span>
                                                <span
                                                    className="w-3.5 h-3.5 rounded-full bg-[#87B2F4] flex items-center justify-center text-[#100E12] shrink-0"
                                                    title="Verified Server"
                                                >
                                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                </span>
                                            </div>
                                            <span
                                                className={`px-2 py-0.5 rounded text-[11px] font-medium border shrink-0 transition-colors ${
                                                    isInstalled
                                                        ? 'bg-[#87B2F4]/10 text-[#87B2F4] border-[#87B2F4]/30'
                                                        : 'bg-[#242323] text-[#7B7A79] border-[#313131] group-hover:text-[#D6D5C9]'
                                                }`}
                                            >
                                                {isInstalled ? 'Installed' : 'Not installed'}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-[#7B7A79] leading-relaxed line-clamp-2">
                                            {server.description}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* All Servers Subsection */}
                    <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-[#8F8E8D] mb-3">
                            All servers
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ALL_MCP_SERVERS.map((server) => {
                                const isInstalled = Boolean(installedServers[server.id])
                                return (
                                    <div
                                        key={server.id}
                                        className="p-4 bg-[#191919] border border-[#242323] rounded-xl flex flex-col gap-2.5 hover:border-[#313131] transition-colors group cursor-pointer"
                                        onClick={() => toggleInstallMcp(server.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className={`w-6 h-6 rounded-md ${server.iconBg} flex items-center justify-center shrink-0`}
                                                >
                                                    {server.iconContent}
                                                </div>
                                                <span className="text-[14px] font-medium text-[#D6D5C9] truncate">
                                                    {server.name}
                                                </span>
                                                <span
                                                    className="w-3.5 h-3.5 rounded-full bg-[#87B2F4] flex items-center justify-center text-[#100E12] shrink-0"
                                                    title="Verified Server"
                                                >
                                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                </span>
                                            </div>
                                            <span
                                                className={`px-2 py-0.5 rounded text-[11px] font-medium border shrink-0 transition-colors ${
                                                    isInstalled
                                                        ? 'bg-[#87B2F4]/10 text-[#87B2F4] border-[#87B2F4]/30'
                                                        : 'bg-[#242323] text-[#7B7A79] border-[#313131] group-hover:text-[#D6D5C9]'
                                                }`}
                                            >
                                                {isInstalled ? 'Installed' : 'Not installed'}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-[#7B7A79] leading-relaxed line-clamp-2">
                                            {server.description}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom MCP Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-none p-4">
                    <div className="bg-[#191919] border border-[#242323] rounded-2xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-[16px] font-medium text-white">
                                Add a custom MCP Server
                            </h3>
                            <p className="text-[13px] text-[#7B7A79]">
                                Connect your own Model Context Protocol (MCP) server via STDIO or
                                SSE.
                            </p>
                        </div>

                        <form onSubmit={handleAddCustomMcp} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Server Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. My Internal Postgres MCP"
                                    value={customMcpName}
                                    onChange={(e) => setCustomMcpName(e.target.value)}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4]"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[#D6D5C9]">
                                    Command / Endpoint URL
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. npx -y @modelcontextprotocol/server-postgres"
                                    value={customMcpCommand}
                                    onChange={(e) => setCustomMcpCommand(e.target.value)}
                                    className="bg-[#100E12] border border-[#383736] rounded-xl px-3.5 py-2 text-[13px] font-mono text-[#D6D5C9] placeholder-[#7B7A79] focus:outline-none focus:border-[#87B2F4]"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] transition-colors flex items-center gap-1.5"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Install Server
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
