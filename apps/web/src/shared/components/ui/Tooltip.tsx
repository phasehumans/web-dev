import React from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/shared/lib/utils'

export interface TooltipProps {
    children: React.ReactNode
    content: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
    className?: string
    shortcut?: string
    usePortal?: boolean
}

export const Tooltip: React.FC<TooltipProps> = ({
    children,
    content,
    position = 'bottom',
    align = 'center',
    className,
    shortcut,
    usePortal = false,
}) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [coords, setCoords] = React.useState<{
        top: number
        left: number
        transform: string
    } | null>(null)
    const triggerRef = React.useRef<HTMLDivElement | null>(null)

    const handleMouseEnter = () => {
        if (!usePortal) return
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            let top = 0
            let left = 0
            let transform = ''

            if (position === 'top') {
                top = rect.top - 6
                left =
                    align === 'center'
                        ? rect.left + rect.width / 2
                        : align === 'start'
                          ? rect.left
                          : rect.right
                transform =
                    align === 'center'
                        ? 'translate(-50%, -100%)'
                        : align === 'start'
                          ? 'translate(0, -100%)'
                          : 'translate(-100%, -100%)'
            } else if (position === 'bottom') {
                top = rect.bottom + 6
                left =
                    align === 'center'
                        ? rect.left + rect.width / 2
                        : align === 'start'
                          ? rect.left
                          : rect.right
                transform =
                    align === 'center'
                        ? 'translate(-50%, 0)'
                        : align === 'start'
                          ? 'translate(0, 0)'
                          : 'translate(-100%, 0)'
            } else if (position === 'left') {
                top = rect.top + rect.height / 2
                left = rect.left - 6
                transform = 'translate(-100%, -50%)'
            } else if (position === 'right') {
                top = rect.top + rect.height / 2
                left = rect.right + 6
                transform = 'translate(0, -50%)'
            }

            setCoords({ top, left, transform })
            setIsOpen(true)
        }
    }

    const handleMouseLeave = () => {
        if (usePortal) {
            setIsOpen(false)
        }
    }

    let positionClasses = ''
    if (!usePortal) {
        if (position === 'bottom') {
            positionClasses = 'top-[calc(100%+5px)]'
            if (align === 'center') positionClasses += ' left-1/2 -translate-x-1/2'
            if (align === 'start') positionClasses += ' left-0'
            if (align === 'end') positionClasses += ' right-0'
        } else if (position === 'top') {
            positionClasses = 'bottom-[calc(100%+5px)]'
            if (align === 'center') positionClasses += ' left-1/2 -translate-x-1/2'
            if (align === 'start') positionClasses += ' left-0'
            if (align === 'end') positionClasses += ' right-0'
        } else if (position === 'left') {
            positionClasses = 'right-[calc(100%+5px)] top-1/2 -translate-y-1/2'
        } else if (position === 'right') {
            positionClasses = 'left-[calc(100%+5px)] top-1/2 -translate-y-1/2'
        }
    }

    const tooltipContent = (
        <>
            {typeof content === 'string' ? (
                <span className="text-[11px] font-medium text-[#EDEDEF] leading-tight tracking-tight">
                    {content}
                </span>
            ) : (
                content
            )}
            {shortcut && (
                <span className="text-[9.5px] font-mono text-[#919191] bg-[#252525] px-1 py-0.2 rounded border border-[#333] leading-none">
                    {shortcut}
                </span>
            )}
        </>
    )

    return (
        <div
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn('relative group/tooltip inline-flex', className)}
        >
            {children}
            {usePortal ? (
                isOpen &&
                coords &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className={cn(
                            'fixed z-[9999] flex items-center gap-1.5',
                            'bg-[#1F1F1F] border border-[#282828] px-2 py-0.5 rounded-[6px] shadow-2xl whitespace-nowrap',
                            'animate-in fade-in zoom-in-95 duration-100 pointer-events-none select-none'
                        )}
                        style={{
                            top: coords.top,
                            left: coords.left,
                            transform: coords.transform,
                        }}
                    >
                        {tooltipContent}
                    </div>,
                    document.body
                )
            ) : (
                <div
                    className={cn(
                        'absolute z-[100] hidden group-hover/tooltip:flex items-center gap-1.5',
                        'bg-[#1F1F1F] border border-[#282828] px-2 py-0.5 rounded-[6px] shadow-2xl whitespace-nowrap',
                        'animate-in fade-in zoom-in-95 duration-100 pointer-events-none select-none',
                        positionClasses
                    )}
                >
                    {tooltipContent}
                </div>
            )}
        </div>
    )
}
