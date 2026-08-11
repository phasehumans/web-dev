import { motion, AnimatePresence } from 'framer-motion'
import { Monitor, Smartphone, Tablet, RefreshCw, ArrowUpRight } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'

import type { PreviewDevice } from '@/features/preview/types'

interface WorkspaceHeaderDevicePickerProps {
    device: PreviewDevice
    setDevice: (device: PreviewDevice) => void
    onOpenNewTab: () => void
    onRefresh?: () => void
}

export const WorkspaceHeaderDevicePicker: React.FC<WorkspaceHeaderDevicePickerProps> = ({
    device,
    setDevice,
    onOpenNewTab,
    onRefresh,
}) => {
    const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDeviceMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="hidden md:flex items-center bg-[#1A1A1A] rounded-xl border border-[#363534] h-9 px-1.5 relative group focus-within:border-[#525150] transition-colors min-w-[320px]">
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
                    className="flex items-center gap-2 px-1.5 h-7 rounded hover:bg-white/5 text-[#91908F] hover:text-white transition-colors"
                >
                    {device === 'desktop' && <Monitor size={14} />}
                    {device === 'mobile' && <Smartphone size={14} />}
                    {device === 'tablet' && <Tablet size={14} />}
                </button>

                <AnimatePresence>
                    {isDeviceMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-full left-0 mt-2 w-48 bg-[#1C1C1C] border border-white/10 rounded-xl overflow-hidden z-50 p-1"
                        >
                            <button
                                onClick={() => {
                                    setDevice('desktop')
                                    setIsDeviceMenuOpen(false)
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[#D6D5D4] hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <Monitor size={14} />
                                <span>Current screen size</span>
                            </button>
                            <button
                                onClick={() => {
                                    setDevice('mobile')
                                    setIsDeviceMenuOpen(false)
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[#D6D5D4] hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <Smartphone size={14} />
                                <span>Mobile</span>
                            </button>
                            <button
                                onClick={() => {
                                    setDevice('tablet')
                                    setIsDeviceMenuOpen(false)
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[#D6D5D4] hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <Tablet size={14} />
                                <span>Tablet</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="text-[#525150] select-none mx-2 text-lg font-light">/</div>
            <div className="flex-1 text-sm text-[#91908F] truncate font-mono opacity-60 text-center"></div>

            <div className="flex items-center gap-1 pl-2">
                <button
                    onClick={onRefresh}
                    className="p-1.5 text-[#91908F] hover:text-white hover:bg-white/5 rounded transition-colors"
                    title="Refresh preview"
                >
                    <RefreshCw size={12} />
                </button>
                <button
                    onClick={onOpenNewTab}
                    className="p-1.5 text-[#91908F] hover:text-white hover:bg-white/5 rounded transition-colors"
                    title="Open in new tab"
                >
                    <ArrowUpRight size={12} />
                </button>
            </div>
        </div>
    )
}

export const OutputHeaderDevicePicker = WorkspaceHeaderDevicePicker
