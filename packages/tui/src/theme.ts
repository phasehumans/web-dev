// Centralized theme tokens for December TUI
// All components must consume these tokens instead of hardcoded hex or named color strings.

export const THEME = {
    colors: {
        brand: '#89B4F8',
        text: 'white',
        muted: '#AAAAAA',
        dim: '#666666',
        border: '#333333',
        success: '#6EE7B7',
        error: '#FCA5A5',
        warning: '#FDD663',
        diffAddBg: '#122f1e',
        diffDeleteBg: '#3f1316',
    },
    padding: {
        paddingX: 2,
    },
    glyphs: {
        prompt: '❭',
        selector: '❭',
        bullet: '•',
        status: '●',
    },
} as const

export const COLORS = {
    ...THEME.colors,
    primary: THEME.colors.text,
    info: THEME.colors.muted,
} as const

export type Theme = typeof THEME
export type Colors = typeof COLORS
