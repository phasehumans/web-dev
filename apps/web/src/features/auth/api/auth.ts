import { apiRequest } from '@/shared/api/client'

type SignupInput = {
    email: string
    password: string
}

type LoginInput = {
    email: string
    password: string
}

type VerifyOtpInput = {
    email: string
    otp: string
}

type GoogleInput = {
    code?: string
    credential?: string
}

type GithubInput = {
    code: string
}

type ForgotPasswordRequestInput = {
    email: string
}

type ForgotPasswordVerifyInput = {
    email: string
    otp: string
}

type ForgotPasswordResetInput = ForgotPasswordVerifyInput & {
    newPassword: string
}

const signup = (data: SignupInput) => {
    return apiRequest<{ message: string }>('/auth/signup', {
        method: 'POST',
        includeAuth: false,
        body: JSON.stringify(data),
    })
}

const verifyOtp = (data: VerifyOtpInput) => {
    return apiRequest<void>('/auth/verify', {
        method: 'POST',
        includeAuth: false,
        body: JSON.stringify(data),
    })
}

const login = (data: LoginInput) => {
    return apiRequest<void>('/auth/login', {
        method: 'POST',
        includeAuth: false,
        body: JSON.stringify(data),
    })
}

const google = (data: GoogleInput) => {
    return apiRequest<void>('/auth/google', {
        method: 'POST',
        includeAuth: false,
        body: JSON.stringify(data),
    })
}

const github = (data: GithubInput) => {
    return apiRequest<void>('/auth/github', {
        method: 'POST',
        includeAuth: false,
        body: JSON.stringify(data),
    })
}

const requestPasswordReset = (data: ForgotPasswordRequestInput) => {
    return apiRequest<void>('/auth/forgot-password/request', {
        method: 'POST',
        includeAuth: false,
        body: JSON.stringify(data),
    })
}

const verifyPasswordResetOtp = (data: ForgotPasswordVerifyInput) => {
    return apiRequest<void>('/auth/forgot-password/verify', {
        method: 'POST',
        includeAuth: false,
        body: JSON.stringify(data),
    })
}

const resetPassword = (data: ForgotPasswordResetInput) => {
    return apiRequest<void>('/auth/forgot-password/reset', {
        method: 'POST',
        includeAuth: false,
        body: JSON.stringify(data),
    })
}

export const authAPI = {
    signup,
    verifyOtp,
    login,
    requestPasswordReset,
    verifyPasswordResetOtp,
    resetPassword,
    google,
    github,
}
