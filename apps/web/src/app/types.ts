export type ViewState =
    | 'chat'
    | 'search'
    | 'all-projects'
    | 'sessions'
    | 'review'
    | 'profile'
    | 'templates'
    | 'docs'
    | 'project'
    | 'canvas'
    | 'wiki'
    | 'automations'

export type ProfileTab =
    | 'Account'
    | 'Preferences'
    | 'Integrations'
    | 'Connections'
    | 'MCP Server'
    | 'Repositories'
    | 'Skills'
    | 'Billing'
    | 'Analytics'
    | 'Usage'
    | 'API Keys'
    | 'Review'
    | 'Wiki'
    | 'Schedules'
    | 'December CLI'
    | 'Secrets'
    | 'Terms'
    | 'Privacy'

const profileTabToSlug: Record<string, string> = {
    Account: 'account',
    Preferences: 'preferences',
    Integrations: 'integrations',
    Connections: 'integrations',
    'MCP Server': 'mcp-server',
    Repositories: 'repositories',
    Skills: 'skills',
    Billing: 'billing',
    Analytics: 'analytics',
    Usage: 'analytics',
    'API Keys': 'api-keys',
    Review: 'review',
    Wiki: 'wiki',
    Schedules: 'schedules',
    'December CLI': 'december-cli',
    Secrets: 'secrets',
    Terms: 'terms',
    Privacy: 'privacy',
}

const slugToProfileTab: Record<string, ProfileTab> = Object.fromEntries(
    Object.entries(profileTabToSlug).map(([tab, slug]) => [slug, tab as ProfileTab])
)

export const getProfileTabFromSlug = (slug: string | undefined): ProfileTab =>
    (slug && slugToProfileTab[slug]) || 'Account'

export const getSlugForProfileTab = (tab: string): string => profileTabToSlug[tab] || 'account'

export const toProjectSlug = (name: string): string =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'untitled'

const simpleViewToPath: Record<string, string> = {
    chat: '/',
    search: '/search',
    'all-projects': '/projects',
    sessions: '/sessions',
    review: '/review',
    templates: '/wiki',
    docs: '/docs',
    canvas: '/canvas',
    wiki: '/wiki',
    automations: '/automations',
}

const simplePathToView: Record<string, ViewState> = Object.fromEntries(
    Object.entries(simpleViewToPath).map(([view, path]) => [path, view as ViewState])
)

export const getPathForView = (
    view: ViewState,
    context?: { projectSlug?: string; profileTab?: string }
): string => {
    if (view === 'project' && context?.projectSlug) {
        return `/sessions/${context.projectSlug}`
    }
    if (view === 'profile') {
        const tabSlug = context?.profileTab ? getSlugForProfileTab(context.profileTab) : 'account'
        return `/settings/${tabSlug}`
    }
    return simpleViewToPath[view] ?? '/'
}

export const getViewForPath = (pathname: string): ViewState => {
    if (pathname === '/templates' || pathname.startsWith('/templates/')) {
        return 'wiki'
    }

    // exact simple matches
    const simple = simplePathToView[pathname]
    if (simple) return simple

    // /settings or /settings/* → profile
    if (
        pathname === '/settings' ||
        pathname.startsWith('/settings/') ||
        pathname === '/profile' ||
        pathname.startsWith('/profile/')
    )
        return 'profile'

    // /review or /reviews or subpaths → review
    if (
        pathname === '/review' ||
        pathname.startsWith('/review/') ||
        pathname === '/reviews' ||
        pathname.startsWith('/reviews/')
    )
        return 'review'

    // /session/* or /project/* → project (workspace screen)
    if (pathname.startsWith('/session/') || pathname.startsWith('/project/')) return 'project'

    return 'chat'
}
