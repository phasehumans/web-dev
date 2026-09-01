import { StateCreator } from 'zustand'

export interface AuthSlice {
    isAuthenticated: boolean
    isAuthRestored: boolean
    showAuthModal: boolean
    showOutOfCreditsModal: boolean
    setIsAuthenticated: (isAuthenticated: boolean) => void
    setIsAuthRestored: (isAuthRestored: boolean) => void
    setShowAuthModal: (show: boolean) => void
    setShowOutOfCreditsModal: (show: boolean) => void
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
    isAuthenticated: false,
    isAuthRestored: false,
    showAuthModal: false,
    showOutOfCreditsModal: false,
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    setIsAuthRestored: (isAuthRestored) => set({ isAuthRestored }),
    setShowAuthModal: (showAuthModal) => set({ showAuthModal }),
    setShowOutOfCreditsModal: (showOutOfCreditsModal) => set({ showOutOfCreditsModal }),
})
