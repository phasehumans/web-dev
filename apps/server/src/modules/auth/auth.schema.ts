import { z } from 'zod'

export const signupSchema = z.object({
    email: z.string({ message: 'email is required' }).email('please enter a valid email address'),
    password: z
        .string({ message: 'password is required' })
        .min(6, 'password must be at least 6 characters')
        .max(20, 'password must be at most 20 characters'),
})

export const verifyOtpSchema = z.object({
    email: z.string({ message: 'email is required' }).email('please enter a valid email address'),
    otp: z.string({ message: 'otp is required' }).regex(/^\d{6}$/, 'otp must be exactly 6 digits'),
})

export const loginSchema = z.object({
    email: z.string({ message: 'email is required' }).email('please enter a valid email address'),
    password: z
        .string({ message: 'password is required' })
        .min(6, 'password must be at least 6 characters')
        .max(20, 'password must be at most 20 characters'),
})

export const forgotPasswordRequestSchema = z.object({
    email: z.string({ message: 'email is required' }).email('please enter a valid email address'),
})

export const forgotPasswordVerifySchema = z.object({
    email: z.string({ message: 'email is required' }).email('please enter a valid email address'),
    otp: z.string({ message: 'otp is required' }).regex(/^\d{6}$/, 'otp must be exactly 6 digits'),
})

export const forgotPasswordResetSchema = z.object({
    email: z.string({ message: 'email is required' }).email('please enter a valid email address'),
    otp: z.string({ message: 'otp is required' }).regex(/^\d{6}$/, 'otp must be exactly 6 digits'),
    newPassword: z
        .string({ message: 'new password is required' })
        .min(6, 'new password must be at least 6 characters')
        .max(20, 'new password must be at most 20 characters'),
})

export const googleAuthSchema = z
    .object({
        code: z.string().min(1).optional(),
        credential: z.string().min(1).optional(),
    })
    .refine((data) => data.code || data.credential, {
        message: 'either code or credential must be provided',
    })

export const githubAuthSchema = z.object({
    code: z
        .string({ message: 'authorization code is required' })
        .min(1, 'authorization code is required'),
})

export const pollDeviceTokenSchema = z.object({
    deviceCode: z.string({ message: 'device code is required' }).min(1, 'device code is required'),
})

export const verifyUserCodeSchema = z.object({
    userCode: z.string({ message: 'user code is required' }).min(1, 'user code is required'),
})
