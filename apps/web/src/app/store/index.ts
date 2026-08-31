import { create } from 'zustand'

import { createAuthSlice, type AuthSlice } from '@/features/auth/slice'
import { createChatSlice, type ChatSlice } from '@/features/chat/slice'
import { createNavigationSlice, type NavigationSlice } from '@/features/navigation/slice'
import { createPreviewSlice, type PreviewSlice } from '@/features/preview/slice'
import { createProjectSlice, type ProjectSlice } from '@/features/sessions/slice'

export type AppStoreState = AuthSlice & NavigationSlice & ChatSlice & ProjectSlice & PreviewSlice

export const useAppStore = create<AppStoreState>()((...a) => ({
    ...createAuthSlice(...a),
    ...createNavigationSlice(...a),
    ...createChatSlice(...a),
    ...createProjectSlice(...a),
    ...createPreviewSlice(...a),
}))
