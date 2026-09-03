import { loadConfig, saveConfig, getProviderConfig } from '../config'
import { useCliStore } from '../store'
import { instantiateProvider } from '../utils/provider-factory'

export function useSettingsHandlers() {
    const {
        settingsNonWorkspace,
        setSettingsNonWorkspace,
        settingsToolPermission,
        setSettingsToolPermission,
        setAuthMode,
        setSettingsDefaultModel,
        setSettingsMaxTokens,
        settingsThinkingLevel,
        setSettingsThinkingLevel,
        settingsSteeringMode,
        setSettingsSteeringMode,
        settingsFollowUpMode,
        setSettingsFollowUpMode,
        settingsAuthPriority,
        setSettingsAuthPriority,
        setAuthMethod,
        setActiveModel,
        agent,
        addToast,
    } = useCliStore()

    const handleSettingsMainSelect = async (item: any) => {
        const config = await loadConfig()
        let updated = false

        switch (item.value) {
            case 'pathGuard': {
                config.pathGuard = !(config.pathGuard !== false)
                updated = true
                break
            }
            case 'nonWorkspaceAccess':
                config.nonWorkspaceAccess = !settingsNonWorkspace
                setSettingsNonWorkspace(!settingsNonWorkspace)
                updated = true
                break
            case 'toolPermission':
                config.toolPermission =
                    settingsToolPermission === 'always-proceed' ? 'always-ask' : 'always-proceed'
                setSettingsToolPermission(config.toolPermission)
                updated = true
                break
            case 'thinkingLevel': {
                const thinkingLevels: ('auto' | 'off' | 'minimal' | 'low' | 'medium' | 'high')[] = [
                    'auto',
                    'off',
                    'minimal',
                    'low',
                    'medium',
                    'high',
                ]
                const nextThinkingLevel =
                    thinkingLevels[
                        (thinkingLevels.indexOf(settingsThinkingLevel) + 1) % thinkingLevels.length
                    ]
                config.thinkingLevel = nextThinkingLevel
                setSettingsThinkingLevel(nextThinkingLevel)
                if (agent) {
                    agent.thinkingLevel = nextThinkingLevel
                    agent.modelOptions = {
                        ...agent.modelOptions,
                        thinkingLevel: nextThinkingLevel,
                    }
                }
                updated = true
                break
            }
            case 'steeringMode': {
                config.steeringMode = settingsSteeringMode === 'all' ? 'one-at-a-time' : 'all'
                setSettingsSteeringMode(config.steeringMode)
                updated = true
                break
            }
            case 'followUpMode': {
                config.followUpMode = settingsFollowUpMode === 'all' ? 'one-at-a-time' : 'all'
                setSettingsFollowUpMode(config.followUpMode)
                updated = true
                break
            }
            case 'authPriority': {
                const priorities: ('subscription' | 'byok' | 'december')[] = [
                    'subscription',
                    'byok',
                    'december',
                ]
                const currIdx = priorities.indexOf(settingsAuthPriority || 'byok')
                const nextIdx = currIdx >= 0 ? (currIdx + 1) % priorities.length : 0
                const newPriority = priorities[nextIdx]
                config.authPriority = newPriority
                setSettingsAuthPriority(newPriority)
                updated = true

                // hot reload the llm
                await saveConfig(config)
                const newProviderConfig = await getProviderConfig()
                if (newProviderConfig && agent) {
                    const llm = instantiateProvider(
                        newProviderConfig.provider,
                        newProviderConfig.apiKey,
                        {
                            authMethod: newProviderConfig.authMethod,
                            subscription: newProviderConfig.subscription,
                            headers: newProviderConfig.headers,
                            baseURL: newProviderConfig.baseURL,
                        }
                    )
                    agent.setLLM(llm)

                    const targetModel = newProviderConfig.model
                    config.activeModel = targetModel
                    await saveConfig(config)

                    agent.modelOptions = { ...agent.modelOptions, model: targetModel }
                    setActiveModel(targetModel)
                    const { useCliStore } = await import('../store')
                    useCliStore.getState().setSelectedProvider(newProviderConfig.provider)
                    setAuthMethod(newProviderConfig.authMethod)
                    const displayPriority =
                        newPriority === 'subscription'
                            ? 'Subscription'
                            : newPriority === 'december'
                              ? 'December Cloud Wallet'
                              : 'BYOK'
                    addToast(
                        `Auth priority set to ${displayPriority} (${newProviderConfig.provider} / ${targetModel})`
                    )
                } else {
                    const displayPriority =
                        newPriority === 'subscription'
                            ? 'Subscription'
                            : newPriority === 'december'
                              ? 'December Cloud Wallet'
                              : 'BYOK'
                    addToast(`Auth priority set to ${displayPriority}`)
                }
                break
            }
            case 'mcpServers': {
                setAuthMode('mcp_manager')
                break
            }
            case 'back':
                setAuthMode('none')
                break
        }

        if (updated) {
            await saveConfig(config)
        }
    }

    const handleSettingsAgentSelect = (item: any) => {
        if (item.value === 'back') {
            setAuthMode('settings_main')
            return
        }
        if (item.value.startsWith('model:')) {
            const model = item.value.split(':')[1]
            setSettingsDefaultModel(model)
            addToast(`Default model updated to ${model}`)
        } else if (item.value.startsWith('tokens:')) {
            const tokens = parseInt(item.value.split(':')[1], 10)
            setSettingsMaxTokens(tokens.toString())
            addToast(`Max tokens set to ${tokens}`)
        }
    }

    const handleSettingsUISelect = (item: any) => {
        if (item.value === 'back') {
            setAuthMode('settings_main')
            return
        }
    }

    const handleSettingsKeysSelect = (item: any) => {
        if (item.value === 'back') {
            setAuthMode('settings_main')
            return
        }
    }

    return {
        handleSettingsMainSelect,
        handleSettingsAgentSelect,
        handleSettingsUISelect,
        handleSettingsKeysSelect,
    }
}
