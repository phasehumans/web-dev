import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'

import { CanvasPage } from '../../features/canvas/components/CanvasPage'
import { ReviewPage } from '../../features/sessions/components/ReviewPage'

import type { ViewState } from '@/app/types'
import type { PreviewRuntimeError, PreviewSelectedElement } from '@/features/preview/types'

import { HomeHero } from '@/features/home/components/HomeHero'
import { WorkspaceScreen } from '@/features/preview/components/WorkspaceScreen'
import { ProfileSettings } from '@/features/profile/components/ProfileSettings'
import { SearchSpaceScreen } from '@/features/search/components/SearchSpaceScreen'
import { SessionList } from '@/features/sessions/components/SessionList'
import { WikiView } from '@/features/wiki/components/WikiView'

interface AppContentViewProps {
    view: ViewState
    isHome: boolean
    onHomePromptSubmit: (prompt: string) => void
    onOutputPromptSubmit: (
        prompt: string,
        selectedElement?: PreviewSelectedElement
    ) => Promise<void> | void
    onPreviewRuntimeError: (error: PreviewRuntimeError) => Promise<void> | void
    onOpenAuth: () => void
    onBackFromOutput: () => void
    onNewProject: () => void
    onOpenProject: (projectId: string) => void
    onImportGithub: (repoUrl: string) => Promise<void> | void
    onImportZip: (file: File) => Promise<void> | void
    onSelectVersion: (versionId: string) => void
    onDownloadProject: () => void
    onSignOut: () => void
    onOpenFile?: (path: string) => void
    onResetImportState?: () => void
}

const pageTransition = {
    duration: 0.22,
    ease: [0.22, 1, 0.36, 1] as const,
}

const pageVariants = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
}

const AnimatedPage: React.FC<{ pageKey: string; children: React.ReactNode }> = ({
    pageKey,
    children,
}) => {
    return (
        <motion.div
            key={pageKey}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="h-full min-h-0"
        >
            {children}
        </motion.div>
    )
}

export const AppContentView: React.FC<AppContentViewProps> = ({
    view,
    isHome,
    onHomePromptSubmit,
    onOutputPromptSubmit,
    onPreviewRuntimeError,
    onOpenAuth,
    onBackFromOutput,
    onNewProject,
    onOpenProject,
    onImportGithub,
    onImportZip,
    onSelectVersion,
    onDownloadProject,
    onSignOut,
    onOpenFile,
    onResetImportState,
}) => {
    return (
        <AnimatePresence mode="wait" initial={false}>
            {view === 'sessions' && (
                <AnimatedPage pageKey="sessions">
                    <SessionList onNewProject={onNewProject} onOpenProject={onOpenProject} />
                </AnimatedPage>
            )}

            {view === 'review' && (
                <AnimatedPage pageKey="review">
                    <ReviewPage onNewProject={onNewProject} />
                </AnimatedPage>
            )}

            {view === 'profile' && (
                <AnimatedPage pageKey="profile">
                    <ProfileSettings onSignOut={onSignOut} onBack={onNewProject} />
                </AnimatedPage>
            )}

            {(view === 'templates' || view === 'wiki') && (
                <AnimatedPage pageKey="wiki">
                    <WikiView />
                </AnimatedPage>
            )}

            {view === 'canvas' && (
                <AnimatedPage pageKey="canvas">
                    <CanvasPage onBack={onNewProject} onOpenAuth={onOpenAuth} />
                </AnimatedPage>
            )}

            {view === 'search' && (
                <AnimatedPage pageKey="search">
                    <SearchSpaceScreen onBack={onNewProject} />
                </AnimatedPage>
            )}

            {(view === 'chat' || view === 'project') &&
                (isHome ? (
                    <AnimatedPage pageKey="chat-home">
                        <HomeHero
                            onPromptSubmit={onHomePromptSubmit}
                            onOpenAuth={onOpenAuth}
                            onImportGithub={onImportGithub}
                            onImportZip={onImportZip}
                            onResetImportState={onResetImportState}
                        />
                    </AnimatedPage>
                ) : (
                    <AnimatedPage pageKey="chat-output">
                        <WorkspaceScreen
                            onBack={onBackFromOutput}
                            onPromptSubmit={(prompt, options) =>
                                onOutputPromptSubmit(prompt, options?.selectedElement)
                            }
                            onRuntimeError={onPreviewRuntimeError}
                            onSelectVersion={onSelectVersion}
                            onDownload={onDownloadProject}
                            onOpenFile={onOpenFile}
                        />
                    </AnimatedPage>
                ))}
        </AnimatePresence>
    )
}
