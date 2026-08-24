import React, { useState, useEffect } from 'react'

import { AppContentView } from './app/components/AppContentView'
import { AppSideNavigation } from './app/components/AppSideNavigation'
import { useAppController } from './app/hooks/useAppController'
import { AuthModal } from './features/auth/components/AuthModal'

import { Icons } from '@/shared/components/ui/Icons'

const App: React.FC = () => {
    const [showLoader, setShowLoader] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowLoader(false)
        }, 1000) // 1.0s loader
        return () => clearTimeout(timer)
    }, [])

    const {
        queryClient,
        view,
        isProjectOpening,
        setIsAuthenticated,
        showAuthModal,
        setShowAuthModal,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        isAuthenticated,
        isHome,
        showSidebar,
        handleNewThread,
        handleHomeClick,
        handleNavigate,
        handleSignOut,
        handlePromptSubmit,
        handleOutputPromptSubmit,
        handlePreviewRuntimeError,
        handleImportGithub,
        handleImportZip,
        handleBackFromOutput,
        handleOpenProject,
        handleSelectVersion,
        handleDownloadProject,
        handleOpenFile,
        resetImportState,
    } = useAppController()

    return (
        <>
            {(showLoader || isProjectOpening) && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#141414] animate-in fade-in duration-150 select-none">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex items-center justify-center animate-pulse">
                            <Icons.DecemberLogo
                                className="w-10 h-10 md:w-12 md:h-12 text-[#3A3A3A]"
                                strokeWidth={1.2}
                            />
                        </div>
                    </div>
                </div>
            )}
            <div className="flex w-full h-dvh bg-background text-textMain overflow-hidden font-sans">
                <AppSideNavigation
                    showSidebar={showSidebar}
                    currentView={view}
                    isMobileSidebarOpen={isMobileSidebarOpen}
                    setIsMobileSidebarOpen={setIsMobileSidebarOpen}
                    onNewThread={handleNewThread}
                    onHomeClick={handleHomeClick}
                    onNavigate={handleNavigate}
                    onOpenProject={handleOpenProject}
                    isAuthenticated={isAuthenticated}
                    onOpenAuth={() => setShowAuthModal(true)}
                    onSignOut={handleSignOut}
                    isWorkspaceScreen={!isHome && (view === 'chat' || view === 'project')}
                />

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onAuthSuccess={() => {
                        setIsAuthenticated(true)
                        setShowAuthModal(false)
                        queryClient.invalidateQueries({ queryKey: ['projects'] })
                        queryClient.invalidateQueries({ queryKey: ['profile'] })
                    }}
                />

                <div className="flex-1 flex flex-col h-full min-h-0 relative overflow-hidden">
                    <AppContentView
                        view={view}
                        isHome={isHome}
                        onHomePromptSubmit={handlePromptSubmit}
                        onOutputPromptSubmit={handleOutputPromptSubmit}
                        onPreviewRuntimeError={handlePreviewRuntimeError}
                        onOpenAuth={() => setShowAuthModal(true)}
                        onBackFromOutput={handleBackFromOutput}
                        onNewProject={handleNewThread}
                        onOpenProject={handleOpenProject}
                        onImportGithub={handleImportGithub}
                        onImportZip={handleImportZip}
                        onSelectVersion={handleSelectVersion}
                        onDownloadProject={handleDownloadProject}
                        onSignOut={handleSignOut}
                        onOpenFile={handleOpenFile}
                        onResetImportState={resetImportState}
                    />
                </div>
            </div>
        </>
    )
}

export default App
