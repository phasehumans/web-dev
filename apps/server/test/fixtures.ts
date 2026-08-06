export const TEST_PASSWORD = 'Password123!'
export const TEST_OTP = '123456'

export const mockGoogleProfile = {
    name: 'Google User',
    email: 'googleuser@example.com',
    sub: 'google-sub-123456',
    userAgent: 'Mozilla/5.0 Test',
    ipAddress: '127.0.0.1',
}

export const mockGithubProfile = {
    name: 'Github User',
    email: 'githubuser@example.com',
    sub: 'github-sub-654321',
    userAgent: 'Mozilla/5.0 Test',
    ipAddress: '127.0.0.1',
}

export const createTestUserData = (suffix = Date.now().toString()) => ({
    email: `unit-user-${suffix}@example.com`,
    password: TEST_PASSWORD,
})
