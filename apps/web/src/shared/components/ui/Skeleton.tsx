import React from 'react'

import { cn } from '@/shared/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    shimmer?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, shimmer = true, ...props }) => {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-md bg-white/[0.03]',
                shimmer
                    ? 'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.04] after:to-transparent'
                    : 'animate-pulse bg-white/[0.06]',
                className
            )}
            {...props}
        />
    )
}
