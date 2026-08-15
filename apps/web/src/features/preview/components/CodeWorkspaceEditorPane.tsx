import CodeMirror from '@uiw/react-codemirror'
import React from 'react'

import { CodeWorkspaceEditorHeader } from './CodeWorkspaceEditorHeader'

import type { CodeFile, CodeFilePath } from '@/features/preview/types'
import type { Extension } from '@codemirror/state'

interface CodeWorkspaceEditorPaneProps {
    activeFile: CodeFile | null
    openFiles: CodeFile[]
    onSelectOpenFile: (path: CodeFilePath) => void
    onCloseOpenFile: (path: CodeFilePath) => void
    value: string
    extensions: Extension[]
    onChange: (value: string) => void
}

export const CodeWorkspaceEditorPane: React.FC<CodeWorkspaceEditorPaneProps> = ({
    activeFile,
    openFiles,
    onSelectOpenFile,
    onCloseOpenFile,
    value,
    extensions,
    onChange,
}) => {
    return (
        <div className="flex-1 min-w-0 min-h-0 bg-[#141414] flex flex-col">
            <CodeWorkspaceEditorHeader
                activeFile={activeFile}
                openFiles={openFiles}
                onSelectFile={onSelectOpenFile}
                onCloseFile={onCloseOpenFile}
                fileContent={value}
            />

            <div className="flex-1 min-h-0">
                {activeFile ? (
                    <CodeMirror
                        key={activeFile.path}
                        value={value}
                        height="100%"
                        className="h-full text-[14px]"
                        extensions={extensions}
                        basicSetup={false}
                        editable={true}
                        onChange={onChange}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[13px] text-[#71717A] select-none font-sans gap-1.5 p-6 text-center">
                        <span>No open file</span>
                        <span className="text-[12px] text-[#52525B]">
                            Select a file from the explorer on the left to view or edit
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
