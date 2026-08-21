type ClientRuntimeEnv = {
    process?: {
        env?: Record<string, string | undefined>
    }
    Bun?: {
        env?: Record<string, string | undefined>
    }
    __ENV__?: Record<string, string | undefined>
}

export const getClientEnv = (key: string): string | undefined => {
    const runtime = globalThis as typeof globalThis & ClientRuntimeEnv

    return (
        runtime.Bun?.env?.[key] ??
        runtime.process?.env?.[key] ??
        runtime.__ENV__?.[key] ??
        (typeof import.meta !== 'undefined' ? (import.meta as any).env?.[key] : undefined) ??
        (typeof import.meta !== 'undefined' ? (import.meta as any).env?.[`VITE_${key}`] : undefined)
    )
}

export const getGithubClientId = (): string => {
    return (
        (typeof process !== 'undefined' ? process.env.GITHUB_CLIENT_ID : undefined) ??
        (typeof process !== 'undefined' ? process.env.PUBLIC_GITHUB_CLIENT_ID : undefined) ??
        getClientEnv('GITHUB_CLIENT_ID') ??
        getClientEnv('PUBLIC_GITHUB_CLIENT_ID') ??
        'Ov23liFGkTAwCW7E8gtk'
    )
}

export const getGoogleClientId = (): string => {
    return (
        (typeof process !== 'undefined' ? process.env.GOOGLE_CLIENT_ID : undefined) ??
        (typeof process !== 'undefined' ? process.env.PUBLIC_GOOGLE_CLIENT_ID : undefined) ??
        getClientEnv('GOOGLE_CLIENT_ID') ??
        getClientEnv('PUBLIC_GOOGLE_CLIENT_ID') ??
        '762203307362-qg77ln4ci9eldv3i0q1smv804epsbhk0.apps.googleusercontent.com'
    )
}
