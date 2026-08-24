export type TokenPayload = {
    userId: string
    sessionId: string
    iat?: number
    exp?: number
}

export type Signup = {
    email: string
    password: string
}

export type VerifyOtp = {
    email: string
    otp: string
    userAgent?: string
    ipAddress?: string
}

export type Login = {
    email: string
    password: string
    userAgent?: string
    ipAddress?: string
}

export type RequestPasswordReset = {
    email: string
}

export type VerifyPasswordResetOtp = {
    email: string
    otp: string
}

export type ResetPassword = VerifyPasswordResetOtp & {
    newPassword: string
}

export type Google = {
    name: string
    email: string
    sub: string
    userAgent?: string
    ipAddress?: string
}

export type Github = {
    name: string
    email: string
    sub: string
    username?: string
    userAgent?: string
    ipAddress?: string
}

export type RefreshSession = {
    refreshToken?: string
}

export type Signout = {
    userId: string
    sessionId: string
}

export type SignoutAll = {
    userId: string
}

export type DeleteAccount = {
    userId: string
}

export type GetCliToken = {
    token: string
    userId: string
}

export type PollDeviceToken = {
    deviceCode: string
    userAgent?: string
    ipAddress?: string
}

export type VerifyUserCode = {
    userCode: string
    userId: string
}

export type CachedSessionData = {
    id: string
    userId: string
    isRevoked: boolean
    expiresAt: Date
    user: {
        id: string
        isDeleted: boolean
    } | null
}

export type PurgeSessions = Record<string, never>
