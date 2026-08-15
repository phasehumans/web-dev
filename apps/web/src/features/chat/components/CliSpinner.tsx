import React, { useEffect, useState } from 'react'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

interface CliSpinnerProps {
    label?: string
    className?: string
    spinnerColor?: string
    labelColor?: string
}

export const CliSpinner: React.FC<CliSpinnerProps> = ({
    label = 'Thinking...',
    className = '',
    spinnerColor = 'text-[#8E8D8C]',
    labelColor = 'text-[#8E8D8C]',
}) => {
    const [frameIdx, setFrameIdx] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setFrameIdx((prev) => (prev + 1) % SPINNER_FRAMES.length)
        }, 80)
        return () => clearInterval(timer)
    }, [])

    return (
        <span className={`inline-flex items-center gap-1.5 font-mono select-none ${className}`}>
            <span
                className={`inline-block w-[1ch] text-center font-mono leading-none ${spinnerColor}`}
            >
                {SPINNER_FRAMES[frameIdx]}
            </span>
            {label && (
                <span className={`font-sans text-[12.5px] leading-tight ${labelColor}`}>
                    {label}
                </span>
            )}
        </span>
    )
}
