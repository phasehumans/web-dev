export type ViewState = 'chat' | 'search' | 'sessions' | 'connectors' | 'profile' | 'project'

export type ProfileTab =
    | 'Account'
    | 'Preferences'
    | 'Repositories'
    | 'Billing'
    | 'Analytics'
    | 'Usage'
    | 'Secrets'
    | 'Terms'
    | 'Privacy'

const profileTabToSlug: Record<string, string> = {
    Account: 'account',
    Preferences: 'preferences',
    Repositories: 'repositories',
    Billing: 'billing',
    Analytics: 'usage',
    Usage: 'usage',
    Secrets: 'secrets',
    Terms: 'terms',
    Privacy: 'privacy',
}

const slugToProfileTab: Record<string, ProfileTab> = {
    ...Object.fromEntries(
        Object.entries(profileTabToSlug).map(([tab, slug]) => [slug, tab as ProfileTab])
    ),
    usage: 'Usage',
    analytics: 'Usage',
}

export const getProfileTabFromSlug = (slug: string | undefined): ProfileTab =>
    (slug && slugToProfileTab[slug]) || 'Account'

export const getSlugForProfileTab = (tab: string): string => profileTabToSlug[tab] || 'account'

export const toSessionSlug = (name: string): string =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'untitled'

export const toProjectSlug = toSessionSlug

const simpleViewToPath: Record<string, string> = {
    chat: '/',
    search: '/search',
    sessions: '/sessions',
    connectors: '/connectors',
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
        const tabSlug = context?.profileTab ? getSlugForProfileTab(context.profileTab) : ''
        return tabSlug ? `/settings/${tabSlug}` : '/settings'
    }
    return simpleViewToPath[view] ?? '/'
}

export const getViewForPath = (pathname: string): ViewState => {
    // exact simple matches
    const simple = simplePathToView[pathname]
    if (simple) return simple

    // /connectors or legacy integrations / mcp settings → connectors
    if (
        pathname === '/connectors' ||
        pathname === '/settings/integrations' ||
        pathname === '/profile/integrations' ||
        pathname === '/settings/mcp-server' ||
        pathname === '/profile/mcp-server' ||
        pathname.startsWith('/connectors/')
    ) {
        return 'connectors'
    }

    // /settings or /settings/*, /profile, /privacy, /terms → profile
    if (
        pathname === '/settings' ||
        pathname.startsWith('/settings/') ||
        pathname === '/profile' ||
        pathname.startsWith('/profile/') ||
        pathname === '/privacy' ||
        pathname === '/terms'
    )
        return 'profile'

    // /sessions/*, /session/* or /project/* → project (workspace screen)
    if (
        pathname.startsWith('/sessions/') ||
        pathname.startsWith('/session/') ||
        pathname.startsWith('/project/')
    )
        return 'project'

    return 'chat'
}
