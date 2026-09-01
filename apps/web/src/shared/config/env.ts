type ClientRuntimeEnv = {
    process?: {
        env?: Record<string, string | undefined>
    }
    Bun?: {
        env?: Record<string, string | undefined>
    }
    __ENV__?: Record<string, string | undefined>
}

/**
 * Safely resolves an environment variable across browser, Bun, and build-time environments.
 */
export const getClientEnv = (key: string): string | undefined => {
    // 1. Check window-injected runtime config (e.g. from SSR / reverse proxy / Docker entrypoint)
    if (typeof window !== 'undefined' && (window as any).__ENV__?.[key] !== undefined) {
        return (window as any).__ENV__[key]
    }

    // 2. Check import.meta.env (Vite / standard ESM bundlers)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        const metaEnv = (import.meta as any).env
        if (metaEnv[key] !== undefined) return metaEnv[key]
        if (metaEnv[`VITE_${key}`] !== undefined) return metaEnv[`VITE_${key}`]
        if (metaEnv[`PUBLIC_${key}`] !== undefined) return metaEnv[`PUBLIC_${key}`]
        if (metaEnv[`BUN_PUBLIC_${key}`] !== undefined) return metaEnv[`BUN_PUBLIC_${key}`]
    }

    // 3. Check global runtime (Bun / Node / process)
    const runtime = globalThis as typeof globalThis & ClientRuntimeEnv
    const runtimeVal =
        runtime.Bun?.env?.[key] ??
        runtime.process?.env?.[key] ??
        runtime.__ENV__?.[key] ??
        runtime.Bun?.env?.[`PUBLIC_${key}`] ??
        runtime.process?.env?.[`PUBLIC_${key}`] ??
        runtime.__ENV__?.[`PUBLIC_${key}`]

    if (runtimeVal !== undefined) {
        return runtimeVal
    }

    // 4. Inlined build-time process.env checks (when replaced by Bun.build / esbuild define)
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] ?? process.env[`PUBLIC_${key}`] ?? process.env[`VITE_${key}`]
        }
    } catch {
        // process is undefined in browser
    }

    return undefined
}

export const getApiBaseUrl = (): string => {
    // 1. Browser runtime: dynamically adapt to host
    if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname
        if (hostname === 'trydecember.com' || hostname.endsWith('.trydecember.com')) {
            return 'https://api.trydecember.com/api/v1'
        }
        // Always use the same-origin proxy for local development or custom domains
        return `${window.location.origin}/api/v1`
    }

    // 2. Explicit environment overrides
    const explicitServerUrl =
        getClientEnv('SERVER_URL') ??
        getClientEnv('BASE_URL') ??
        (typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
            ? 'https://api.trydecember.com'
            : 'http://localhost:4000')

    const normalized = explicitServerUrl.endsWith('/')
        ? explicitServerUrl.slice(0, -1)
        : explicitServerUrl

    return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`
}

export const getWebSocketUrl = (): string => {
    if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname
        if (hostname === 'trydecember.com' || hostname.endsWith('.trydecember.com')) {
            return 'https://api.trydecember.com'
        }
    }

    const explicitServerUrl =
        getClientEnv('SERVER_URL') ??
        getClientEnv('BASE_URL') ??
        (typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
            ? 'https://api.trydecember.com'
            : 'http://localhost:4000')

    return explicitServerUrl.endsWith('/') ? explicitServerUrl.slice(0, -1) : explicitServerUrl
}

export const getGithubClientId = (): string => {
    return (
        getClientEnv('GITHUB_CLIENT_ID') ??
        getClientEnv('PUBLIC_GITHUB_CLIENT_ID') ??
        'Ov23liFGkTAwCW7E8gtk'
    )
}

export const getGithubRedirectUri = (apiBaseUrl: string = getApiBaseUrl()): string => {
    return (
        getClientEnv('GITHUB_REDIRECT_URI') ??
        getClientEnv('PUBLIC_GITHUB_REDIRECT_URI') ??
        `${apiBaseUrl}/integrations/github/connect`
    )
}

export const getGithubAppName = (): string => {
    return (
        getClientEnv('GITHUB_APP_NAME') ?? getClientEnv('PUBLIC_GITHUB_APP_NAME') ?? 'trydecember'
    )
}

export const getGoogleClientId = (): string => {
    return (
        getClientEnv('GOOGLE_CLIENT_ID') ??
        getClientEnv('PUBLIC_GOOGLE_CLIENT_ID') ??
        '762203307362-qg77ln4ci9eldv3i0q1smv804epsbhk0.apps.googleusercontent.com'
    )
}

export const getVercelIntegrationSlug = (): string => {
    return (
        getClientEnv('VERCEL_INTEGRATION_SLUG') ??
        getClientEnv('PUBLIC_VERCEL_INTEGRATION_SLUG') ??
        'december'
    )
}

export const getSupabaseClientId = (): string => {
    return (
        getClientEnv('SUPABASE_CLIENT_ID') ??
        getClientEnv('PUBLIC_SUPABASE_CLIENT_ID') ??
        '4a0473bb-3c69-4d28-8896-d1d8b6e18347'
    )
}

export const getSupabaseRedirectUri = (apiBaseUrl: string = getApiBaseUrl()): string => {
    return (
        getClientEnv('SUPABASE_REDIRECT_URI') ??
        getClientEnv('PUBLIC_SUPABASE_REDIRECT_URI') ??
        `${apiBaseUrl}/integrations/supabase/connect`
    )
}

export const getNotionClientId = (): string => {
    return (
        getClientEnv('NOTION_CLIENT_ID') ??
        getClientEnv('PUBLIC_NOTION_CLIENT_ID') ??
        '36ad872b-594c-8101-9e7c-00378ba2e5f6'
    )
}

export const getNotionRedirectUri = (apiBaseUrl: string = getApiBaseUrl()): string => {
    return (
        getClientEnv('NOTION_REDIRECT_URI') ??
        getClientEnv('PUBLIC_NOTION_REDIRECT_URI') ??
        `${apiBaseUrl}/integrations/notion/connect`
    )
}
