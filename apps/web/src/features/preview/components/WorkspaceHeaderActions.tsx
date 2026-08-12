import { Download, Settings, PanelRightClose, PanelRightOpen, UploadCloud } from 'lucide-react'
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
    isSidebarCollapsed?: boolean
    onToggleSidebar?: () => void
    isPreviewCollapsed?: boolean
    onTogglePreview?: () => void
}

export const WorkspaceHeaderActions: React.FC<WorkspaceHeaderActionsProps> = ({
    projectName,
    projectId,
    activeVersionId,
    isVersionLoading = false,
    onDownload,
    isSidebarCollapsed,
    onToggleSidebar,
    isPreviewCollapsed,
    onTogglePreview,
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

    const versionDisplay = activeVersionId ? `#${activeVersionId.slice(0, 4)}` : '#1'

    return (
        <div className="flex items-center gap-1.5 relative">
            {/* Version / Session Tag Badge */}
            <div className="hidden lg:flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono text-[#91908F] bg-[#1A1A1C] border border-[#2A2A2D]">
                    {versionDisplay}
                </span>
            </div>

            {/* Panel toggle button for Preview panel */}
            {onTogglePreview && (
                <Button
                    variant="ghost"
                    size="icon"
                    title={isPreviewCollapsed ? 'Expand Preview Panel' : 'Collapse Preview Panel'}
                    onClick={onTogglePreview}
                    className="text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none"
                >
                    {isPreviewCollapsed ? (
                        <PanelRightOpen size={16} />
                    ) : (
                        <PanelRightClose size={16} />
                    )}
                </Button>
            )}

            {/* settings */}
            <Button
                variant="ghost"
                size="icon"
                title="Settings"
                onClick={() => openSettings('general')}
                className={`text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none ${activePanel === 'settings' && settingsTab !== 'publish' ? 'text-white bg-white/5' : ''}`}
            >
                <Settings size={16} />
            </Button>

            {/* download */}
            <Button
                variant="ghost"
                size="icon"
                title="Download Code"
                className="text-[#91908F] hover:text-white hidden md:flex h-8 w-8 disabled:opacity-40 disabled:text-[#91908F] outline-none border-none ring-0 focus:outline-none"
                onClick={onDownload}
                disabled={isDownloadDisabled}
            >
                <Download size={16} />
            </Button>

            {/* publish */}
            <Button
                onClick={() => openSettings('publish')}
                variant="secondary"
                className="ml-1 bg-[#1E1E20] text-white border border-[#2E2E32] hover:bg-[#252528] hover:text-white hover:border-[#3A3A40] rounded-lg text-xs font-medium hidden md:flex px-3 py-1.5 h-8 transition-colors outline-none ring-0 focus:outline-none"
            >
                <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-[#91908F]" />
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
