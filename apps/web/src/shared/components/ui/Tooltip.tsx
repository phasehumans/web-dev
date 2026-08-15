import React from 'react'

import { cn } from '@/shared/lib/utils'

export interface TooltipProps {
    children: React.ReactNode
    content: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
    className?: string
    shortcut?: string
}

export const Tooltip: React.FC<TooltipProps> = ({
    children,
    content,
    position = 'bottom',
    align = 'center',
    className,
    shortcut,
}) => {
    let positionClasses = ''

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

    return (
        <div className={cn('relative group/tooltip inline-flex', className)}>
            {children}
            <div
                className={cn(
                    'absolute z-[100] hidden group-hover/tooltip:flex items-center gap-1.5',
                    'bg-[#1F1F1F] border border-[#282828] px-2 py-0.5 rounded-[6px] shadow-2xl whitespace-nowrap',
                    'animate-in fade-in zoom-in-95 duration-100 pointer-events-none select-none',
                    positionClasses
                )}
            >
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
            </div>
        </div>
    )
}
