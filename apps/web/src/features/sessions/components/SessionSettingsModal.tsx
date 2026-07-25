import React, { useState } from 'react'

export const SessionSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [tags, setTags] = useState('frontend, draft')
    const [isArchived, setIsArchived] = useState(false)
    const [folder, setFolder] = useState('main-project')

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-none flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">Session Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Folder / Project
                        </label>
                        <select
                            value={folder}
                            onChange={(e) => setFolder(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow text-sm"
                        >
                            <option value="main-project">Main Project</option>
                            <option value="side-project">Side Project</option>
                            <option value="">No Folder (Standalone)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tags (comma separated)
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow text-sm"
                            placeholder="e.g. frontend, draft"
                        />
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={isArchived}
                                onChange={(e) => setIsArchived(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                            />
                            <div>
                                <span className="block text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                    Archive Session
                                </span>
                                <span className="block text-xs text-gray-500">
                                    Archived sessions are hidden from the main view.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
