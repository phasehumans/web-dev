import React from 'react'

import type { PreviewAreaProps } from '@/features/preview/types'

import { PREVIEW_HTML } from '@/features/preview/constants/preview'
import { usePreviewAreaController } from '@/features/preview/hooks/usePreviewAreaController'
import { injectPreviewBridge, RUNTIME_CHECKLISTS } from '@/features/preview/utils/previewUtils'
import { cn } from '@/shared/lib/utils'

export const PreviewArea: React.FC<PreviewAreaProps> = ({
    html,
    isGenerating,
    device,
    isVisualMode,
    onMessage,
    iframeRef,
    fullscreen = false,
    showStructureOnly = false,
    previewUrl,
    previewState,
    previewError,
    previewSessionError,
    projectType = 'generated',
    projectId,
}) => {
    const { isCopied, isImportStreaming, hasLoadedOnce, isMounted, copyErrorToClipboard } =
        usePreviewAreaController({
            projectId,
            previewState,
            previewUrl,
            onMessage,
        })

    const srcDoc = React.useMemo(() => injectPreviewBridge(html), [html])
    const isVanillaHtml =
        html !== PREVIEW_HTML && !html.includes('type="module"') && !html.includes("type='module'")
    const isLivePreview = Boolean(previewUrl) && previewState === 'Healthy' && !isVanillaHtml
    const showStructurePlaceholder = showStructureOnly && !isGenerating && !isLivePreview

    const showFailedState = Boolean(
        previewSessionError || previewError || previewState === 'Failed'
    )

    const isStartupState =
        previewState === 'WaitingForRunnableVersion' ||
        previewState === 'Bootstrapping' ||
        previewState === 'Installing' ||
        previewState === 'Starting'

    // determine loading state
    const showFullscreenLoader =
        !showFailedState &&
        !hasLoadedOnce &&
        (isStartupState || (!isLivePreview && isGenerating) || isImportStreaming)

    const showFullscreenFailed = showFailedState && !isLivePreview

    // resolve checklist items
    const checklistItems = RUNTIME_CHECKLISTS[projectType] || RUNTIME_CHECKLISTS.generated
    const stateKeys = ['WaitingForRunnableVersion', 'Bootstrapping', 'Installing', 'Starting']
    const activeIndex = previewState ? stateKeys.indexOf(previewState) : 0
    const allCompleted = previewState === 'Healthy'

    const statusLabel = previewError?.message || previewSessionError || 'Compiling...'

    return (
        <div
            className={cn(
                'overflow-hidden relative bg-[#141414] flex-1 flex flex-col w-full h-full min-h-0',
                '[&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#383736]/60 hover:[&::-webkit-scrollbar-thumb]:bg-[#4A4948]/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent'
            )}
        >
            <div
                className={cn(
                    'relative bg-[#141414] overflow-hidden group w-full h-full flex-1',
                    isMounted && 'transition-all duration-500',
                    fullscreen
                        ? 'rounded-none border-0'
                        : device === 'mobile'
                          ? 'w-[375px] h-[812px] rounded-[3rem] border-[8px] border-[#1a1a1a] mx-auto my-auto shadow-2xl'
                          : device === 'tablet'
                            ? 'w-[768px] h-[1024px] rounded-[2rem] border-[8px] border-[#1a1a1a] mx-auto my-auto shadow-2xl'
                            : 'rounded-none border-0 shadow-none'
                )}
            >
                {/* 1. dynamic checklist logs loader screen */}
                {showFullscreenLoader ? (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#121110] font-sans p-6">
                        <div className="flex flex-col max-w-sm w-full select-none text-left">
                            {/* top header */}
                            <div className="flex flex-col gap-0.5 select-none mb-6">
                                <span className="text-[14px] font-bold text-white tracking-wider uppercase">
                                    RUNTIME SANDBOX
                                </span>
                                <span className="text-[10px] text-[#8E8D8C] font-semibold tracking-wider uppercase">
                                    {projectType === 'github'
                                        ? 'CLONING REPOSITORY'
                                        : projectType === 'zip'
                                          ? 'UPLOADING ARCHIVE'
                                          : 'ESTABLISHING CONTAINER'}
                                </span>
                            </div>

                            {/* minimal checklist ui */}
                            <div className="flex flex-col gap-4 pl-0">
                                {checklistItems.map((item, idx) => {
                                    const isDone = allCompleted || idx < activeIndex
                                    const isActive = !allCompleted && idx === activeIndex
                                    const isPending = !allCompleted && idx > activeIndex

                                    return (
                                        <div
                                            key={idx}
                                            className={cn(
                                                'flex items-center gap-4 text-[13px] transition-all duration-300',
                                                isDone && 'text-[#8E8D8C]/60 font-medium',
                                                isActive && 'text-[#F5F5F5] font-medium',
                                                isPending && 'text-[#8E8D8C]/20 font-medium'
                                            )}
                                        >
                                            {isDone ? (
                                                <span className="text-[#8E8D8C]/60 text-[14px] w-5 h-5 flex items-center justify-center shrink-0 select-none">
                                                    ✓
                                                </span>
                                            ) : isActive ? (
                                                <div className="w-5 h-5 flex items-center justify-center shrink-0 relative">
                                                    <div className="w-3.5 h-3.5 border border-t-transparent border-white rounded-full animate-spin" />
                                                </div>
                                            ) : (
                                                <span className="text-[#8E8D8C]/20 text-[16px] w-5 h-5 flex items-center justify-center shrink-0 select-none">
                                                    •
                                                </span>
                                            )}
                                            <span>{item.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ) : showFullscreenFailed ? (
                    /* 1.5. solid dark background for failed state to hide iframe fallback */
                    <div className="absolute inset-0 z-50 bg-[#141414]" />
                ) : showStructurePlaceholder ? (
                    /* 2. structure placeholder */
                    <div className="absolute inset-0 z-40 bg-[#171716] p-5">
                        <div className="h-full w-full rounded-xl border border-white/10 bg-[#141414] p-4 md:p-5 flex flex-col gap-3">
                            <div className="h-8 w-40 rounded-md bg-white/10" />
                            <div className="h-3 w-72 rounded-md bg-white/5 max-w-full" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                <div className="h-28 rounded-lg border border-white/10 bg-white/[0.03]" />
                                <div className="h-28 rounded-lg border border-white/10 bg-white/[0.03]" />
                            </div>
                            <div className="h-24 rounded-lg border border-white/10 bg-white/[0.03]" />
                            <div className="mt-auto h-10 rounded-md bg-white/[0.04]" />
                        </div>
                    </div>
                ) : (
                    /* 3. main iframe browser viewport (kept visible even on errors unless explicitly failed during startup) */
                    <iframe
                        ref={iframeRef}
                        className={cn(
                            'w-full h-full border-0 transition-opacity bg-white [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#383736]/60 hover:[&::-webkit-scrollbar-thumb]:bg-[#4A4948]/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent',
                            isVisualMode ? 'cursor-crosshair' : ''
                        )}
                        title="Preview"
                        {...(isLivePreview ? { src: previewUrl } : { srcDoc })}
                    />
                )}

                {/* 4. minimal floating error pill */}
                {showFailedState && (
                    <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2.5 bg-red-50 border border-red-200/60 rounded-lg px-3.5 py-2 shadow-sm animate-in slide-in-from-bottom-2 duration-300 font-sans">
                        <span className="text-[11px] font-medium text-red-700 whitespace-nowrap">
                            Build failed
                        </span>
                        <button
                            onClick={() => window.location.reload()}
                            type="button"
                            className="text-[10px] font-medium text-red-500 hover:text-red-700 transition-colors cursor-pointer select-none ml-1"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
