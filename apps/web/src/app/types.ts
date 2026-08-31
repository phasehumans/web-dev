export type ViewState = 'chat' | 'search' | 'sessions' | 'profile' | 'project'

export type ProfileTab =
    | 'Account'
    | 'Preferences'
    | 'Integrations'
    | 'Connections'
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
    Connections: 'connections',
    Integrations: 'connections',
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
    connections: 'Connections',
    integrations: 'Connections',
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

    // /settings or /settings/*, /profile, /integrations, /connections, /connectors, /privacy, /terms → profile
    if (
        pathname === '/settings' ||
        pathname.startsWith('/settings/') ||
        pathname === '/profile' ||
        pathname.startsWith('/profile/') ||
        pathname === '/integrations' ||
        pathname.startsWith('/integrations/') ||
        pathname === '/connections' ||
        pathname.startsWith('/connections/') ||
        pathname === '/connectors' ||
        pathname.startsWith('/connectors/') ||
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
