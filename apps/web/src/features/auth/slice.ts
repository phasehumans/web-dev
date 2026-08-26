import { StateCreator } from 'zustand'

export interface AuthSlice {
    isAuthenticated: boolean
    showAuthModal: boolean
    showOutOfCreditsModal: boolean
    setIsAuthenticated: (isAuthenticated: boolean) => void
    setShowAuthModal: (show: boolean) => void
    setShowOutOfCreditsModal: (show: boolean) => void
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
    isAuthenticated: false,
    showAuthModal: false,
    showOutOfCreditsModal: false,
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    setShowAuthModal: (showAuthModal) => set({ showAuthModal }),
    setShowOutOfCreditsModal: (showOutOfCreditsModal) => set({ showOutOfCreditsModal }),
})
