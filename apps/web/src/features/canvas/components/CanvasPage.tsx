import React, { useRef } from 'react'

import { useAppStore } from '@/app/store'
import Canvas, { type CanvasRef } from '@/features/canvas/components/Canvas'

interface CanvasPageProps {
    onBack?: () => void
    onOpenAuth?: () => void
}

export const CanvasPage: React.FC<CanvasPageProps> = ({ onBack, onOpenAuth }) => {
    const {
        canvasState,
        setCanvasState: onCanvasStateChange,
        isAuthenticated,
        activeProjectId: projectId,
    } = useAppStore()
    const canvasRef = useRef<CanvasRef>(null)

    return (
        <div className="flex w-full h-full bg-[#100E12] overflow-hidden p-1.5 md:p-[8px] font-sans">
            <div className="flex w-full h-full bg-[#141414] rounded-lg border border-[#242323] overflow-hidden relative">
                <div className="flex w-full h-full items-start justify-center relative overflow-hidden">
                    <Canvas
                        ref={canvasRef}
                        isAuthenticated={isAuthenticated}
                        onOpenAuth={onOpenAuth}
                        document={canvasState}
                        onDocumentChange={onCanvasStateChange}
                        projectId={projectId}
                    />
                </div>
            </div>
        </div>
    )
}
