import { useState } from 'react'

export function useSettings() {
    const [settingsNonWorkspace, setSettingsNonWorkspace] = useState(false)
    const [settingsToolPermission, setSettingsToolPermission] = useState<
        'always-proceed' | 'always-ask'
    >('always-proceed')
    const [settingsSelectedIndex, setSettingsSelectedIndex] = useState(0)
    const [settingsDefaultModel, setSettingsDefaultModel] = useState('')
    const [settingsMaxTokens, setSettingsMaxTokens] = useState('')

    return {
        settingsNonWorkspace,
        setSettingsNonWorkspace,
        settingsToolPermission,
        setSettingsToolPermission,
        settingsSelectedIndex,
        setSettingsSelectedIndex,
        settingsDefaultModel,
        setSettingsDefaultModel,
        settingsMaxTokens,
        setSettingsMaxTokens,
    }
}
