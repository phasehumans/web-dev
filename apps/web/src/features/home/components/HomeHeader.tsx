import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { ArrowUpRight, Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useBillingOverview } from '@/features/billing/hooks/useBillingData'
import { Icons } from '@/shared/components/ui/Icons'

interface HomeHeaderProps {
    isAuthenticated?: boolean
    onOpenAuth?: () => void
}

const MagneticIconWithTooltip = ({ icon: Icon, tooltip, onClick, href }: any) => {
    const [isHovered, setIsHovered] = useState(false)
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const springConfig = { damping: 15, stiffness: 150, mass: 0.1 }
    const springX = useSpring(x, springConfig)
    const springY = useSpring(y, springConfig)

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        x.set((e.clientX - centerX) * 0.3)
        y.set((e.clientY - centerY) * 0.3)
    }

    const handleMouseLeave = () => {
        setIsHovered(false)
        x.set(0)
        y.set(0)
    }

    const Component = href ? motion.a : motion.button

    return (
        <div className="relative flex items-center justify-center z-20">
            <Component
                href={href}
                target={href ? '_blank' : undefined}
                rel={href ? 'noopener noreferrer' : undefined}
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ x: springX, y: springY }}
                whileTap={{ scale: 0.9 }}
                className="text-textMuted hover:text-textMain hover:bg-[#252525] rounded-full transition-colors flex items-center justify-center w-7 h-7 cursor-pointer outline-none relative z-10"
            >
                {Icon}
            </Component>

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 2, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="absolute top-[calc(100%+8px)] right-0 z-50 flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg pointer-events-none whitespace-nowrap shadow-lg shadow-black/40"
                    >
                        <span className="text-[12px] font-medium text-[#EDEDEF]">{tooltip}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ isAuthenticated, onOpenAuth }) => {
    const navigate = useNavigate()

    const { data: overview, isLoading: isOverviewLoading } = useBillingOverview()
    const remaining = overview?.creditBalance ?? 0

    return (
        <div className="absolute top-0 left-0 w-full h-11 px-4 md:px-6 z-50 flex justify-between items-center pointer-events-none">
            <div className="flex-1 pointer-events-auto flex items-center justify-start pl-2 md:pl-0">
                {isAuthenticated ? (
                    <button
                        onClick={() => navigate('/settings/billing')}
                        className="hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#1F1F1F] hover:bg-[#252525] text-[12px] transition-all font-medium text-[#999999] hover:text-[#E8E8E8]"
                    >
                        <span>Credits:</span>
                        <span>
                            {isOverviewLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin inline-block" />
                            ) : (
                                `$ ${(remaining / 100).toFixed(2)}`
                            )}
                        </span>
                    </button>
                ) : (
                    <a
                        href="/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:flex items-center gap-1 h-7 px-2.5 rounded-full bg-[#1F1F1F] hover:bg-[#252525] text-[12px] transition-all font-medium text-[#999999] hover:text-[#E8E8E8]"
                    >
                        <span>Docs</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>

            {/* center heading */}
            <div className="flex-initial flex items-center justify-center pointer-events-auto">
                <div
                    onClick={() => {
                        window.open('https://www.npmjs.com/package/@trydecember/cli', '_blank')
                    }}
                    className="home-header-badge hidden md:flex items-center gap-2 bg-transparent border border-white/5 rounded-full pl-1.5 pr-2.5 h-7 text-[13px] text-[#E8E8E6] transition-all duration-200 cursor-pointer hover:bg-white/5 group whitespace-nowrap flex-shrink-0 opacity-[0.85] hover:opacity-100"
                >
                    <span className="bg-[#87B2F4]/15 text-[#87B2F4] rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none flex items-center justify-center flex-shrink-0">
                        New
                    </span>
                    <span className="font-medium text-[#D4D4D8] group-hover:text-white transition-colors whitespace-nowrap">
                        December CLI is now available
                    </span>
                    <span className="text-[#3F3F46] font-light flex-shrink-0">|</span>
                    <div className="text-[#D4D4D8] font-medium flex items-center gap-1 group-hover:text-white transition-colors whitespace-nowrap flex-shrink-0">
                        Try December CLI <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            {/* right icons */}
            <div className="flex-1 flex items-center justify-end pointer-events-auto">
                <div className="flex items-center gap-0">
                    <MagneticIconWithTooltip
                        icon={<Icons.XLogo className="w-[15px] h-[15px]" />}
                        tooltip="Twitter"
                        href="https://x.com/phasehumans"
                    />
                    <MagneticIconWithTooltip
                        icon={<Icons.Github className="w-5 h-5" />}
                        tooltip="GitHub"
                        href="https://github.com/phasehumans"
                    />
                </div>
            </div>
        </div>
    )
}
