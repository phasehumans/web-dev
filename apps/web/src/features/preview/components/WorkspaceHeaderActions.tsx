import { Download, Settings } from 'lucide-react'
import React, { useState } from 'react'

import { SettingsBigModal } from './settings/SettingsBigModal'

import type { BackendProjectVersionSummary } from '@/features/sessions/api/project'

import { Button } from '@/shared/components/ui/Button'

interface WorkspaceHeaderActionsProps {
    projectName?: string | null
    projectId?: string | null
    versions?: BackendProjectVersionSummary[]
    activeVersionId?: string | null
    isVersionLoading?: boolean
    onSelectVersion?: (versionId: string) => void
    onDownload?: () => void
}

export const WorkspaceHeaderActions: React.FC<WorkspaceHeaderActionsProps> = ({
    projectName,
    projectId,
    activeVersionId,
    isVersionLoading = false,
    onDownload,
}) => {
    const isDownloadDisabled = !activeVersionId || isVersionLoading
    const [activePanel, setActivePanel] = useState<'settings' | null>(null)
    const [settingsTab, setSettingsTab] = useState<
        'general' | 'share' | 'integrations' | 'variables' | 'domains' | 'analytics' | 'publish'
    >('general')

    const openSettings = (tab: typeof settingsTab) => {
        setSettingsTab(tab)
        setActivePanel('settings')
    }

    return (
        <div className="flex items-center gap-0.5 relative">
            {/* settings */}
            <Button
                variant="ghost"
                size="icon"
                title="Settings"
                onClick={() => openSettings('general')}
                className={`text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ${activePanel === 'settings' && settingsTab !== 'publish' ? 'text-white bg-white/5' : ''}`}
            >
                <Settings size={16} />
            </Button>

            {/* download */}
            <Button
                variant="ghost"
                size="icon"
                title="Download Code"
                className="text-[#91908F] hover:text-white hidden md:flex h-8 w-8 disabled:opacity-40 disabled:text-[#91908F] outline-none border-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
                onClick={onDownload}
                disabled={isDownloadDisabled}
            >
                <Download size={16} />
            </Button>

            {/* publish */}
            <Button
                onClick={() => openSettings('publish')}
                variant="secondary"
                className="ml-2 bg-[#191919] text-white border border-[#363534] hover:bg-[#191919] hover:text-white hover:border-[#363534] rounded-xl font-medium hidden md:flex px-4 py-1.5 h-auto transition-colors outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
            >
                Publish
            </Button>

            {/* big full-screen settings overlay */}
            {activePanel === 'settings' && (
                <SettingsBigModal
                    onClose={() => setActivePanel(null)}
                    initialTab={settingsTab}
                    projectName={projectName ?? 'untitled'}
                    projectId={projectId}
                />
            )}
        </div>
    )
}

export const OutputHeaderActions = WorkspaceHeaderActions
