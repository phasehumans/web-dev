export const DEFAULT_DEV_WEB_URL = 'http://localhost:3000'
export const DEFAULT_PROD_WEB_URL = 'https://trydecember.com'

export const DEFAULT_DEV_SERVER_URL = 'http://localhost:4000'
export const DEFAULT_PROD_SERVER_URL = 'https://api.trydecember.com'

export type EnvironmentMode = 'DEV' | 'TEST' | 'PROD'

export const getWebUrl = (env?: string): string =>
    process.env.WEB_URL ||
    (env === 'PROD' || process.env.ENV === 'PROD' ? DEFAULT_PROD_WEB_URL : DEFAULT_DEV_WEB_URL)

export const getServerUrl = (env?: string): string =>
    process.env.SERVER_URL ||
    (env === 'PROD' || process.env.ENV === 'PROD'
        ? DEFAULT_PROD_SERVER_URL
        : DEFAULT_DEV_SERVER_URL)

export const getApiV1Url = (env?: string): string => `${getServerUrl(env)}/api/v1`
