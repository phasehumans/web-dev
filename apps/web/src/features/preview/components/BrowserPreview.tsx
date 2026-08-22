import React, { useState } from 'react'

interface BrowserPreviewProps {
    sessionUrl?: string // the base url where the dev server is exposed (e.g., a proxy route)
}

export const BrowserPreview: React.FC<BrowserPreviewProps> = ({ sessionUrl }) => {
    const [path, setPath] = useState('/')
    const [iframeKey, setIframeKey] = useState(0)

    const handleRefresh = () => {
        setIframeKey((k) => k + 1)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleRefresh()
    }

    const fullUrl = sessionUrl
        ? `${sessionUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
        : ''

    return (
        <div className="flex flex-col h-full bg-white text-gray-900 w-full relative">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center space-x-3">
                <div className="flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={() => window.history.back()} // mock back action
                        className="p-1 rounded text-gray-500 hover:bg-gray-200 transition-colors"
                        title="Go back"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="p-1 rounded text-gray-500 hover:bg-gray-200 transition-colors"
                        title="Refresh"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 ml-4 flex">
                    <div className="flex-1 flex items-center bg-white rounded-md border border-gray-300 px-3 py-1 shadow-sm">
                        <svg
                            className="w-4 h-4 text-gray-400 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                        </svg>
                        <span className="text-gray-500 select-none text-sm">
                            {sessionUrl ? sessionUrl : 'https://preview.trydecember.com'}
                        </span>
                        <input
                            type="text"
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 px-1 py-0 text-sm outline-none w-full"
                            placeholder="/"
                        />
                    </div>
                </form>
            </div>

            <div className="flex-1 bg-white relative">
                {!sessionUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-50">
                        <svg
                            className="w-16 h-16 text-gray-300 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                        </svg>
                        <p className="text-lg font-medium text-gray-700">No active dev server</p>
                        <p className="text-sm mt-1">
                            Start a dev server (e.g., npm run dev) to see previews here.
                        </p>
                    </div>
                ) : (
                    <iframe
                        key={iframeKey}
                        src={fullUrl}
                        className="w-full h-full border-none"
                        title="Browser Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                )}
            </div>
        </div>
    )
}
