import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { RotateCw, Terminal as TerminalIcon, Trash2 } from 'lucide-react'
import React, { useEffect, useRef, useState, useCallback } from 'react'
// @ts-expect-error -- CSS file import lacks TypeScript declarations
import '@xterm/xterm/css/xterm.css'

import type { GeneratedProjectFile } from '@/features/preview/types'

import { API_BASE_URL } from '@/shared/api/client'

export interface TerminalWorkspaceProps {
    previewSessionId?: string | null
    generatedFiles?: Record<string, GeneratedProjectFile>
}

export type TerminalConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'unavailable'

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({ previewSessionId }) => {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const socketRef = useRef<any>(null)
    const [connectionStatus, setConnectionStatus] = useState<TerminalConnectionStatus>(
        previewSessionId ? 'connecting' : 'unavailable'
    )
    const [connectAttempt, setConnectAttempt] = useState(0)

    const handleClear = useCallback(() => {
        if (xtermRef.current) {
            xtermRef.current.clear()
        }
    }, [])

    const handleReconnect = useCallback(() => {
        setConnectAttempt((prev) => prev + 1)
    }, [])

    useEffect(() => {
        if (!previewSessionId) {
            setConnectionStatus('unavailable')
            return
        }

        setConnectionStatus('connecting')

        if (!terminalRef.current) return

        // Clean, minimal, non-distracting terminal color theme matching December design system
        const xterm = new Terminal({
            theme: {
                background: '#141414',
                foreground: '#E4E4E7',
                cursor: '#E4E4E7',
                cursorAccent: '#141414',
                selectionBackground: 'rgba(255, 255, 255, 0.18)',
                black: '#18181B',
                red: '#EF4444',
                green: '#22C55E',
                yellow: '#EAB308',
                blue: '#3B82F6',
                magenta: '#A855F7',
                cyan: '#06B6D4',
                white: '#E4E4E7',
                brightBlack: '#71717A',
                brightRed: '#F87171',
                brightGreen: '#4ADE80',
                brightYellow: '#FDE047',
                brightBlue: '#60A5FA',
                brightMagenta: '#C084FC',
                brightCyan: '#38BDF8',
                brightWhite: '#FFFFFF',
            },
            fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
            fontSize: 13,
            lineHeight: 1.4,
            cursorBlink: true,
            cursorStyle: 'bar',
            cursorWidth: 2,
            cursorInactiveStyle: 'outline',
            convertEol: true,
            allowProposedApi: true,
        })

        const fitAddon = new FitAddon()
        xterm.loadAddon(fitAddon)
        xterm.open(terminalRef.current)
        try {
            fitAddon.fit()
        } catch {
            // Intentionally swallowed: initial fit fallback before layout measurement
        }

        xtermRef.current = xterm
        fitAddonRef.current = fitAddon

        let socket: any = null
        let isMounted = true

        import('socket.io-client')
            .then(({ io }) => {
                if (!isMounted) return
                const baseUrl = API_BASE_URL.replace('/api/v1', '')
                socket = io(baseUrl, {
                    path: '/socket.io/',
                    withCredentials: true,
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1500,
                })
                socketRef.current = socket

                socket.on('connect', () => {
                    if (!isMounted) return
                    setConnectionStatus('connected')
                    socket.emit('join_session_terminal', { sessionId: previewSessionId })
                    try {
                        fitAddon.fit()
                        socket.emit('TERMINAL_RESIZE', {
                            sessionId: previewSessionId,
                            cols: xterm.cols,
                            rows: xterm.rows,
                        })
                    } catch {
                        // Intentionally swallowed: initial resize sync fallback
                    }
                })

                socket.on('TERMINAL_DATA', (data: string) => {
                    if (!isMounted) return
                    xterm.write(data)
                })

                socket.on('disconnect', () => {
                    if (!isMounted) return
                    setConnectionStatus('disconnected')
                })

                socket.on('connect_error', () => {
                    if (!isMounted) return
                    setConnectionStatus('disconnected')
                })
            })
            .catch(() => {
                if (isMounted) {
                    setConnectionStatus('disconnected')
                }
            })

        const onDataDisposable = xterm.onData((data) => {
            if (socket && socket.connected) {
                socket.emit('TERMINAL_INPUT', { sessionId: previewSessionId, data })
            }
        })

        const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current && xtermRef.current) {
                try {
                    fitAddonRef.current.fit()
                    if (socket && socket.connected) {
                        socket.emit('TERMINAL_RESIZE', {
                            sessionId: previewSessionId,
                            cols: xtermRef.current.cols,
                            rows: xtermRef.current.rows,
                        })
                    }
                } catch {
                    // Intentionally swallowed: resize observer fallback
                }
            }
        })
        resizeObserver.observe(terminalRef.current)

        return () => {
            isMounted = false
            onDataDisposable.dispose()
            resizeObserver.disconnect()
            xterm.dispose()
            if (socket) {
                socket.emit('leave_session_terminal', { sessionId: previewSessionId })
                socket.disconnect()
            }
            xtermRef.current = null
            fitAddonRef.current = null
            socketRef.current = null
        }
    }, [previewSessionId, connectAttempt])

    if (!previewSessionId || connectionStatus === 'unavailable') {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#141414] text-[#EDEDEF] font-sans select-none overflow-hidden">
                {/* Status Bar */}
                <div className="h-9 px-3.5 bg-[#141414] border-b border-[#222225] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                        <span className="text-[12px] font-medium text-[#A1A1AA]">
                            No runtime container active
                        </span>
                    </div>
                </div>

                {/* Informative Body */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="flex flex-col items-center gap-2.5 max-w-sm">
                        <div className="w-10 h-10 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#71717A]">
                            <TerminalIcon className="w-5 h-5" />
                        </div>
                        <p className="text-[13.5px] font-semibold text-[#EDEDEF]">
                            Runtime Container Unavailable
                        </p>
                        <p className="text-[12px] text-[#8E8D8C] leading-relaxed">
                            Terminal streams live I/O when an active runtime container is running.
                            Start a preview or prompt execution to connect to the shell.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-[#141414] text-[#E4E4E7] font-sans w-full h-full select-none overflow-hidden">
            {/* Status Header Bar */}
            <div className="h-9 px-3.5 bg-[#141414] border-b border-[#222225] flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-2">
                    {connectionStatus === 'connected' && (
                        <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-[12px] font-medium text-[#D6D5C9]">
                                Live Terminal Connected
                            </span>
                        </>
                    )}
                    {connectionStatus === 'connecting' && (
                        <>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <span className="text-[12px] font-medium text-[#D6D5C9]">
                                Connecting to runtime container...
                            </span>
                        </>
                    )}
                    {connectionStatus === 'disconnected' && (
                        <>
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-[12px] font-medium text-[#F87171]">
                                Terminal Disconnected
                            </span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {connectionStatus === 'disconnected' && (
                        <button
                            type="button"
                            onClick={handleReconnect}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[#D6D5C9] bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer border border-white/5 outline-none"
                            title="Reconnect to runtime terminal"
                        >
                            <RotateCw className="w-3 h-3" />
                            <span>Reconnect</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 rounded text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-white/5 transition-colors cursor-pointer outline-none"
                        title="Clear terminal buffer"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Terminal Main Container */}
            <div className="flex-1 min-h-0 relative bg-[#141414] overflow-hidden">
                <div className="absolute inset-0 px-3 py-2 overflow-hidden" ref={terminalRef} />
            </div>
        </div>
    )
}
