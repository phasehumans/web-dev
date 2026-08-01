import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import React, { useEffect, useRef } from 'react'
// @ts-ignore
import '@xterm/xterm/css/xterm.css'

interface TerminalWorkspaceProps {
    previewSessionId?: string | null
    // here we'd typically pass a websocket url or connection function
}

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({ previewSessionId }) => {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)

    useEffect(() => {
        if (!terminalRef.current) return

        const xterm = new Terminal({
            theme: {
                background: '#141414',
                foreground: '#ffffff',
                cursor: '#ffffff',
                black: '#000000',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#3b82f6',
                magenta: '#ec4899',
                cyan: '#06b6d4',
                white: '#ffffff',
            },
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: 13,
            lineHeight: 1.4,
            cursorBlink: true,
        })

        const fitAddon = new FitAddon()
        xterm.loadAddon(fitAddon)

        xterm.open(terminalRef.current)
        fitAddon.fit()

        xterm.writeln('\x1b[38;2;135;206;235mDecember Cloud Terminal\x1b[0m')

        let socket: any = null
        if (previewSessionId) {
            xterm.writeln(`Connecting to E2B Sandbox session ${previewSessionId}...`)

            // connect to actual websocket for terminal stream
            import('socket.io-client').then(({ io }) => {
                import('@/shared/api/client').then(({ API_BASE_URL }) => {
                    const baseUrl = API_BASE_URL.replace('/api/v1', '')
                    socket = io(baseUrl, { path: '/socket.io/' })

                    socket.emit('join_session_terminal', { sessionId: previewSessionId })

                    socket.on('TERMINAL_DATA', (data: string) => {
                        xterm.write(data)
                    })

                    xterm.onData((data) => {
                        socket.emit('TERMINAL_INPUT', { sessionId: previewSessionId, data })
                    })

                    socket.on('disconnect', () => {
                        xterm.writeln('\r\n\x1b[31mDisconnected from VM.\x1b[0m')
                    })
                })
            })
        } else {
            xterm.writeln('Waiting for VM to boot...')
        }
        xterm.writeln('')

        xtermRef.current = xterm
        fitAddonRef.current = fitAddon

        const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit()
            }
        })
        resizeObserver.observe(terminalRef.current)

        return () => {
            resizeObserver.disconnect()
            xterm.dispose()
            if (socket) socket.disconnect()
        }
    }, [previewSessionId])

    return (
        <div className="flex-1 min-h-0 flex bg-[#141414] p-2">
            <div
                className="flex-1 border border-white/10 rounded-xl overflow-hidden p-2"
                ref={terminalRef}
            />
        </div>
    )
}
