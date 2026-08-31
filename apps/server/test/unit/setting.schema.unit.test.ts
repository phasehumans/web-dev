import { describe, it, expect } from 'bun:test'

import {
    updateNameSchema,
    updateUsernameSchema,
    changePasswordSchema,
    updateNotificationSchema,
    generationSoundSchema,
    dismissOnboardingCardSchema,
    submitFeedbackSchema,
    updateRulesSchema,
    GenerationSound,
} from '../../src/modules/setting/setting.schema'

describe('Setting Schema - Unit Tests', () => {
    describe('updateNameSchema', () => {
        it('should pass with valid name between 3 and 20 chars', () => {
            expect(updateNameSchema.safeParse({ name: 'Alice' }).success).toBe(true)
            expect(updateNameSchema.safeParse({ name: 'Bob Smith' }).success).toBe(true)
        })

        it('should fail with name < 3 or > 20 chars or non-string', () => {
            expect(updateNameSchema.safeParse({ name: 'Al' }).success).toBe(false)
            expect(updateNameSchema.safeParse({ name: 'A'.repeat(21) }).success).toBe(false)
            expect(updateNameSchema.safeParse({ name: 123 }).success).toBe(false)
            expect(updateNameSchema.safeParse({}).success).toBe(false)
        })
    })

    describe('updateUsernameSchema', () => {
        it('should pass with valid lowercase username containing only letters and underscores', () => {
            expect(updateUsernameSchema.safeParse({ username: 'alice_smith' }).success).toBe(true)
            expect(updateUsernameSchema.safeParse({ username: 'john_doe_99' }).success).toBe(false) // contains numbers -> regex is /^[a-z_]+$/
            expect(updateUsernameSchema.safeParse({ username: 'johndoe' }).success).toBe(true)
        })

        it('should fail with uppercase, spaces, numbers, or invalid length (<6 or >20)', () => {
            expect(updateUsernameSchema.safeParse({ username: 'Alice' }).success).toBe(false)
            expect(updateUsernameSchema.safeParse({ username: 'john doe' }).success).toBe(false)
            expect(updateUsernameSchema.safeParse({ username: 'user' }).success).toBe(false) // < 6 chars
            expect(updateUsernameSchema.safeParse({ username: 'a'.repeat(21) }).success).toBe(false)
        })
    })

    describe('changePasswordSchema', () => {
        it('should pass with valid newPassword and optional/empty currentPassword', () => {
            expect(
                changePasswordSchema.safeParse({
                    currentPassword: 'OldPass123!',
                    newPassword: 'NewPass123!',
                }).success
            ).toBe(true)

            expect(
                changePasswordSchema.safeParse({
                    currentPassword: '',
                    newPassword: 'NewPass123!',
                }).success
            ).toBe(true)

            expect(
                changePasswordSchema.safeParse({
                    newPassword: 'NewPass123!',
                }).success
            ).toBe(true)
        })

        it('should fail with invalid newPassword (<6 or >20 chars or missing)', () => {
            expect(changePasswordSchema.safeParse({ newPassword: '12345' }).success).toBe(false)
            expect(changePasswordSchema.safeParse({ newPassword: 'A'.repeat(21) }).success).toBe(
                false
            )
            expect(changePasswordSchema.safeParse({}).success).toBe(false)
        })
    })

    describe('updateNotificationSchema', () => {
        it('should pass with any combination of optional boolean fields', () => {
            expect(
                updateNotificationSchema.safeParse({
                    notifyProjectActivity: true,
                    notifyProductUpdates: false,
                    notifySecurityAlerts: true,
                }).success
            ).toBe(true)

            expect(
                updateNotificationSchema.safeParse({
                    notifyProjectActivity: true,
                }).success
            ).toBe(true)

            expect(updateNotificationSchema.safeParse({}).success).toBe(true)
        })

        it('should fail if fields are not booleans', () => {
            expect(
                updateNotificationSchema.safeParse({
                    notifyProjectActivity: 'true',
                }).success
            ).toBe(false)
        })
    })

    describe('generationSoundSchema', () => {
        it('should pass with valid GenerationSound enum values', () => {
            expect(
                generationSoundSchema.safeParse({
                    generationSound: GenerationSound.ALWAYS,
                }).success
            ).toBe(true)
            expect(
                generationSoundSchema.safeParse({
                    generationSound: GenerationSound.NEVER,
                }).success
            ).toBe(true)
            expect(
                generationSoundSchema.safeParse({
                    generationSound: GenerationSound.FIRST_GENERATION,
                }).success
            ).toBe(true)
        })

        it('should fail with invalid sound value', () => {
            expect(
                generationSoundSchema.safeParse({
                    generationSound: 'SOMETIMES',
                }).success
            ).toBe(false)
        })
    })

    describe('dismissOnboardingCardSchema', () => {
        it('should pass with valid card names', () => {
            expect(dismissOnboardingCardSchema.safeParse({ card: 'welcome' }).success).toBe(true)
            expect(dismissOnboardingCardSchema.safeParse({ card: 'github' }).success).toBe(true)
            expect(dismissOnboardingCardSchema.safeParse({ card: 'feedback' }).success).toBe(true)
        })

        it('should fail with unknown card name', () => {
            expect(dismissOnboardingCardSchema.safeParse({ card: 'unknown' }).success).toBe(false)
        })
    })

    describe('submitFeedbackSchema', () => {
        it('should pass with valid rating and non-empty feedback', () => {
            expect(
                submitFeedbackSchema.safeParse({
                    rating: 'happy',
                    feedback: 'Great app!',
                }).success
            ).toBe(true)

            expect(
                submitFeedbackSchema.safeParse({
                    rating: null,
                    feedback: 'Could be better',
                }).success
            ).toBe(true)
        })

        it('should fail with invalid rating or empty feedback', () => {
            expect(
                submitFeedbackSchema.safeParse({
                    rating: 'awesome',
                    feedback: 'Great app!',
                }).success
            ).toBe(false)

            expect(
                submitFeedbackSchema.safeParse({
                    rating: 'happy',
                    feedback: '',
                }).success
            ).toBe(false)
        })
    })

    describe('updateRulesSchema', () => {
        it('should pass with any string', () => {
            expect(updateRulesSchema.safeParse({ rules: 'Always write tests' }).success).toBe(true)
            expect(updateRulesSchema.safeParse({ rules: '' }).success).toBe(true)
        })

        it('should fail if rules is missing', () => {
            expect(updateRulesSchema.safeParse({}).success).toBe(false)
        })
    })
})
