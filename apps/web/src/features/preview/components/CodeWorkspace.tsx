import { EditorView } from '@codemirror/view'
import React from 'react'

import {
    createCodeWorkspaceTree,
    flattenFiles,
    getDefaultCodeFilePath,
    getLanguageExtension,
    getSharedEditorExtensions,
} from './codeWorkspaceConfig'
import { CodeWorkspaceEditorPane } from './CodeWorkspaceEditorPane'
import { CodeWorkspaceFileSidebar } from './CodeWorkspaceFileSidebar'

import type { CodeFile, CodeFilePath, CodeWorkspaceProps } from '@/features/preview/types'

const getWorkspaceHtmlPath = (paths: CodeFilePath[]) => {
    const preferredPaths = ['index.html', 'public/index.html', 'web/index.html']

    return preferredPaths.find((path) => paths.includes(path)) ?? null
}

export const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({
    html,
    generatedFiles,
    activeFilePath,
    onHtmlChange,
}) => {
    const userSelectedFileRef = React.useRef(false)
    const generatedFileContents = React.useMemo(
        () =>
            Object.fromEntries(
                Object.entries(generatedFiles ?? {}).map(([path, file]) => [
                    path,
                    (file as any).content,
                ])
            ),
        [generatedFiles]
    )

    const workspaceTree = React.useMemo(
        () => createCodeWorkspaceTree(Object.keys(generatedFiles ?? {})),
        [generatedFiles]
    )

    const workspaceFiles = React.useMemo(() => flattenFiles(workspaceTree), [workspaceTree])
    const defaultFilePath = React.useMemo(
        () => getDefaultCodeFilePath(workspaceFiles.map((file) => file.path)),
        [workspaceFiles]
    )
    const htmlFilePath = React.useMemo(
        () => getWorkspaceHtmlPath(workspaceFiles.map((file) => file.path)),
        [workspaceFiles]
    )

    const [selectedFile, setSelectedFile] = React.useState<CodeFilePath | null>(null)
    const [openFilePaths, setOpenFilePaths] = React.useState<CodeFilePath[]>([])
    const [files, setFiles] = React.useState<Record<CodeFilePath, string>>({})
    const [wordWrap, setWordWrap] = React.useState(true)
    const [cursorPos, setCursorPos] = React.useState({ line: 1, col: 1 })

    React.useEffect(() => {
        setCursorPos({ line: 1, col: 1 })
    }, [selectedFile])

    React.useEffect(() => {
        setFiles(generatedFileContents)
    }, [generatedFileContents])

    React.useEffect(() => {
        if (workspaceFiles.length === 0) {
            userSelectedFileRef.current = false
            setSelectedFile(null)
            setOpenFilePaths([])
            return
        }

        const workspacePathSet = new Set(workspaceFiles.map((file) => file.path))

        setOpenFilePaths((previous) => previous.filter((path) => workspacePathSet.has(path)))

        const hasSelectedFile = Boolean(selectedFile && workspacePathSet.has(selectedFile))

        if (activeFilePath && workspacePathSet.has(activeFilePath)) {
            if (!userSelectedFileRef.current || !hasSelectedFile) {
                setSelectedFile(activeFilePath)
                setOpenFilePaths((previous) =>
                    previous.includes(activeFilePath) ? previous : [...previous, activeFilePath]
                )
            }

            return
        }

        if (!hasSelectedFile && defaultFilePath) {
            setSelectedFile(defaultFilePath)
            setOpenFilePaths((previous) =>
                previous.includes(defaultFilePath) ? previous : [...previous, defaultFilePath]
            )
        }
    }, [activeFilePath, defaultFilePath, selectedFile, workspaceFiles])

    React.useEffect(() => {
        if (!htmlFilePath || !files[htmlFilePath]) {
            return
        }

        if (files[htmlFilePath] !== html) {
            onHtmlChange?.(files[htmlFilePath] ?? html)
        }
    }, [files, html, htmlFilePath, onHtmlChange])

    const activeFile: CodeFile | null =
        workspaceFiles.find((file) => file.path === selectedFile) ?? workspaceFiles[0] ?? null

    const openFiles = React.useMemo(
        () =>
            openFilePaths
                .map((path) => workspaceFiles.find((file) => file.path === path))
                .filter((file): file is CodeFile => Boolean(file)),
        [openFilePaths, workspaceFiles]
    )

    const sharedExtensions = React.useMemo(() => getSharedEditorExtensions(), [])
    const editorExtensions = React.useMemo(() => {
        if (!activeFile) {
            return sharedExtensions
        }
        const extensions = [...sharedExtensions, getLanguageExtension(activeFile.language)]
        if (wordWrap) {
            extensions.push(EditorView.lineWrapping)
        }
        return extensions
    }, [activeFile, sharedExtensions, wordWrap])

    const handleChange = (value: string) => {
        if (!activeFile) {
            return
        }

        setFiles((previous) => ({
            ...previous,
            [activeFile.path]: value,
        }))

        if (htmlFilePath && activeFile.path === htmlFilePath) {
            onHtmlChange?.(value)
        }
    }

    const handleSelectFile = (path: CodeFilePath) => {
        userSelectedFileRef.current = true
        setSelectedFile(path)
    }

    const handlePinFile = (path: CodeFilePath) => {
        userSelectedFileRef.current = true
        setSelectedFile(path)
        setOpenFilePaths((previous) => (previous.includes(path) ? previous : [...previous, path]))
    }

    const handleCloseOpenFile = (path: CodeFilePath) => {
        setOpenFilePaths((previous) => {
            const closingIndex = previous.indexOf(path)
            if (closingIndex === -1) {
                return previous
            }

            const next = previous.filter((openPath) => openPath !== path)

            if (selectedFile === path) {
                const fallbackPath =
                    next[closingIndex] ?? next[closingIndex - 1] ?? defaultFilePath ?? null
                setSelectedFile(fallbackPath)
            }

            return next
        })
    }

    return (
        <div className="flex-1 min-h-0 flex overflow-hidden w-full h-full">
            <div className="w-full h-full flex overflow-hidden rounded-none border-0 shadow-none bg-[#141414]">
                <CodeWorkspaceFileSidebar
                    tree={workspaceTree}
                    selectedFile={selectedFile ?? ''}
                    onSelectFile={handleSelectFile}
                    onPinFile={handlePinFile}
                />

                <CodeWorkspaceEditorPane
                    activeFile={activeFile}
                    openFiles={openFiles}
                    onSelectOpenFile={handleSelectFile}
                    onCloseOpenFile={handleCloseOpenFile}
                    value={activeFile ? (files[activeFile.path] ?? '') : ''}
                    extensions={editorExtensions}
                    onChange={handleChange}
                    wordWrap={wordWrap}
                    toggleWordWrap={() => setWordWrap(!wordWrap)}
                    cursorPos={cursorPos}
                    onCursorPosChange={React.useCallback((pos: { line: number; col: number }) => {
                        setCursorPos((prev) => {
                            if (prev.line === pos.line && prev.col === pos.col) {
                                return prev
                            }
                            return pos
                        })
                    }, [])}
                />
            </div>
        </div>
    )
}
