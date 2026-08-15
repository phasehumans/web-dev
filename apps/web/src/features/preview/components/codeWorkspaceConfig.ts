import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completeFromList,
    completionKeymap,
    snippetCompletion,
} from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { css as cssLanguageExtension, cssLanguage } from '@codemirror/lang-css'
import { html as htmlLanguageExtension, htmlLanguage } from '@codemirror/lang-html'
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript'
import {
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentOnInput,
    indentUnit,
    HighlightStyle,
    syntaxHighlighting,
} from '@codemirror/language'
import { search, searchKeymap } from '@codemirror/search'
import { EditorState, type Extension } from '@codemirror/state'
import {
    crosshairCursor,
    drawSelection,
    dropCursor,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'

import type {
    CodeFile,
    CodeFileLanguage,
    CodeFilePath,
    CodeFileTreeNode,
} from '@/features/preview/types'

const VSCODE_DARK_PLUS_BACKGROUND = '#141414'
const VSCODE_DARK_PLUS_TEXT = '#d4d4d4'
const VSCODE_DARK_PLUS_ACTIVE_LINE = '#2a2d2e'
const VSCODE_DARK_PLUS_GUTTER_TEXT = '#858585'

interface MutableFolderNode {
    name: string
    path: string
    folders: Map<string, MutableFolderNode>
    files: CodeFile[]
}

const createFileNode = (
    path: CodeFilePath,
    label: string,
    language: CodeFile['language']
): CodeFileTreeNode => ({
    type: 'file',
    file: {
        path,
        label,
        language,
    },
})

const createFolderNode = (
    name: string,
    path: string,
    children: CodeFileTreeNode[]
): CodeFileTreeNode => ({
    type: 'folder',
    name,
    path,
    children,
})

const getFileLabel = (path: CodeFilePath) => path.split('/').pop() ?? path

export const inferCodeFileLanguage = (path: CodeFilePath): CodeFileLanguage => {
    if (path.endsWith('.html')) return 'html'
    if (path.endsWith('.css')) return 'css'
    if (path.endsWith('.tsx')) return 'tsx'
    if (path.endsWith('.ts')) return 'typescript'
    return 'javascript'
}

const sortTreeNodes = (a: CodeFileTreeNode, b: CodeFileTreeNode) => {
    if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
    }

    const aLabel = a.type === 'folder' ? a.name : a.file.label
    const bLabel = b.type === 'folder' ? b.name : b.file.label

    return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' })
}

const toTreeNodes = (folder: MutableFolderNode): CodeFileTreeNode[] => {
    const folderNodes = [...folder.folders.values()].map((childFolder) =>
        createFolderNode(childFolder.name, childFolder.path, toTreeNodes(childFolder))
    )
    const fileNodes = folder.files.map((file) =>
        createFileNode(file.path, file.label, file.language)
    )

    return [...folderNodes, ...fileNodes].sort(sortTreeNodes)
}

export const createCodeWorkspaceTree = (paths: CodeFilePath[]): CodeFileTreeNode[] => {
    const root: MutableFolderNode = {
        name: '',
        path: '',
        folders: new Map(),
        files: [],
    }

    const normalizedPaths = [...new Set(paths)].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
    )

    for (const path of normalizedPaths) {
        const segments = path.split('/').filter(Boolean)

        if (segments.length === 0) {
            continue
        }

        let currentFolder = root

        for (let index = 0; index < segments.length - 1; index += 1) {
            const segment = segments[index]!
            const nextPath = segments.slice(0, index + 1).join('/')
            const existingFolder = currentFolder.folders.get(segment)

            if (existingFolder) {
                currentFolder = existingFolder
                continue
            }

            const nextFolder: MutableFolderNode = {
                name: segment,
                path: nextPath,
                folders: new Map(),
                files: [],
            }

            currentFolder.folders.set(segment, nextFolder)
            currentFolder = nextFolder
        }

        currentFolder.files.push({
            path,
            label: getFileLabel(path),
            language: inferCodeFileLanguage(path),
        })
    }

    return toTreeNodes(root)
}

export const flattenFiles = (nodes: CodeFileTreeNode[]): CodeFile[] =>
    nodes.flatMap((node) => {
        if (node.type === 'file') {
            return [node.file]
        }

        return flattenFiles(node.children)
    })

const DEFAULT_FILE_PATH_PRIORITIES = [
    'src/App.tsx',
    'web/src/App.tsx',
    'src/main.tsx',
    'web/src/main.tsx',
    'index.html',
    'public/index.html',
    'web/index.html',
]

export const getDefaultCodeFilePath = (paths: CodeFilePath[]): CodeFilePath | null => {
    for (const preferredPath of DEFAULT_FILE_PATH_PRIORITIES) {
        if (paths.includes(preferredPath)) {
            return preferredPath
        }
    }

    const sortedPaths = [...paths].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
    )

    return sortedPaths[0] ?? null
}

const REACT_AND_TS_SNIPPETS = [
    snippetCompletion('const [${state}, set${State}] = useState(${initial})', {
        label: 'useState',
        detail: 'React state hook',
        type: 'function',
    }),
    snippetCompletion('useEffect(() => {\n\t${}\n}, [${}])', {
        label: 'useEffect',
        detail: 'React effect hook',
        type: 'function',
    }),
    snippetCompletion('useCallback((${params}) => {\n\t${}\n}, [${}])', {
        label: 'useCallback',
        detail: 'React callback hook',
        type: 'function',
    }),
    snippetCompletion('useMemo(() => {\n\treturn ${}\n}, [${}])', {
        label: 'useMemo',
        detail: 'React memo hook',
        type: 'function',
    }),
    snippetCompletion('const ${ref} = useRef(${initial})', {
        label: 'useRef',
        detail: 'React ref hook',
        type: 'function',
    }),
    snippetCompletion(
        'export const ${ComponentName}: React.FC<${Props}> = ({\n\t${}\n}) => {\n\treturn (\n\t\t<div className="${}">\n\t\t\t${}\n\t\t</div>\n\t)\n}',
        {
            label: 'rfc',
            detail: 'React Functional Component',
            type: 'snippet',
        }
    ),
    snippetCompletion('interface ${Name} {\n\t${}\n}', {
        label: 'interface',
        detail: 'TypeScript interface',
        type: 'type',
    }),
    snippetCompletion('type ${Name} = {\n\t${}\n}', {
        label: 'type',
        detail: 'TypeScript type alias',
        type: 'type',
    }),
    snippetCompletion('console.log(${});', {
        label: 'clg',
        detail: 'console.log()',
        type: 'function',
    }),
    snippetCompletion('try {\n\t${}\n} catch (error) {\n\t${}\n}', {
        label: 'trycatch',
        detail: 'try-catch block',
        type: 'keyword',
    }),
    snippetCompletion('const ${name} = async (${params}) => {\n\t${}\n}', {
        label: 'asyncfn',
        detail: 'Async arrow function',
        type: 'function',
    }),
]

const HTML_SNIPPETS = [
    snippetCompletion(
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${Document}</title>\n</head>\n<body>\n\t${}\n</body>\n</html>',
        {
            label: 'html5',
            detail: 'HTML5 Boilerplate',
            type: 'snippet',
        }
    ),
    snippetCompletion('<div className="${}">${}</div>', {
        label: 'div',
        detail: 'div element',
        type: 'keyword',
    }),
    snippetCompletion('<button type="${button}" className="${}">${}</button>', {
        label: 'button',
        detail: 'button element',
        type: 'keyword',
    }),
    snippetCompletion('<input type="${text}" placeholder="${}" className="${}" />', {
        label: 'input',
        detail: 'input element',
        type: 'keyword',
    }),
    snippetCompletion('<link rel="stylesheet" href="${style.css}">', {
        label: 'link',
        detail: 'stylesheet link',
        type: 'keyword',
    }),
    snippetCompletion('<script type="module" src="${main.ts}"></script>', {
        label: 'script',
        detail: 'module script',
        type: 'keyword',
    }),
]

const CSS_SNIPPETS = [
    snippetCompletion('display: flex;\nalign-items: center;\njustify-content: center;', {
        label: 'flexcenter',
        detail: 'Flexbox center alignment',
        type: 'snippet',
    }),
    snippetCompletion('display: flex;\nflex-direction: column;', {
        label: 'flexcol',
        detail: 'Flexbox column layout',
        type: 'snippet',
    }),
    snippetCompletion('display: grid;\nplace-items: center;', {
        label: 'gridcenter',
        detail: 'CSS Grid center layout',
        type: 'snippet',
    }),
    snippetCompletion('position: absolute;\ninset: 0;', {
        label: 'absfull',
        detail: 'Absolute inset 0 layout',
        type: 'snippet',
    }),
]

export const getSharedEditorExtensions = (): Extension[] => [
    EditorState.tabSize.of(2),
    EditorState.allowMultipleSelections.of(true),
    indentUnit.of('  '),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({
        spellcheck: 'false',
        'data-gramm': 'false',
    }),
    lineNumbers(),
    history(),
    foldGutter({
        markerDOM: (open) => {
            const icon = document.createElement('span')
            icon.className = `cm-fold-marker ${open ? 'open' : 'closed'}`
            icon.textContent = open ? '▾' : '▸'
            return icon
        },
    }),
    drawSelection(),
    dropCursor(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    bracketMatching(),
    closeBrackets(),
    autocompletion({
        defaultKeymap: true,
        icons: true,
    }),
    search({ top: true }),
    indentOnInput(),
    keymap.of([
        indentWithTab,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...searchKeymap,
    ]),
    vscodeDarkPlusTheme,
    syntaxHighlighting(vscodeDarkPlusHighlightStyle),
]

export const getLanguageExtension = (language: CodeFile['language']): Extension => {
    if (language === 'html') {
        return [
            htmlLanguageExtension(),
            htmlLanguage.data.of({
                autocomplete: completeFromList(HTML_SNIPPETS),
            }),
        ]
    }
    if (language === 'css') {
        return [
            cssLanguageExtension(),
            cssLanguage.data.of({
                autocomplete: completeFromList(CSS_SNIPPETS),
            }),
        ]
    }
    if (language === 'typescript') {
        return [
            javascript({ typescript: true }),
            javascriptLanguage.data.of({
                autocomplete: completeFromList(REACT_AND_TS_SNIPPETS),
            }),
        ]
    }
    if (language === 'tsx') {
        return [
            javascript({ typescript: true, jsx: true }),
            javascriptLanguage.data.of({
                autocomplete: completeFromList(REACT_AND_TS_SNIPPETS),
            }),
        ]
    }
    return [
        javascript({ jsx: true }),
        javascriptLanguage.data.of({
            autocomplete: completeFromList(REACT_AND_TS_SNIPPETS),
        }),
    ]
}

export const vscodeDarkPlusTheme = EditorView.theme(
    {
        '&': {
            height: '100%',
            backgroundColor: VSCODE_DARK_PLUS_BACKGROUND,
            color: VSCODE_DARK_PLUS_TEXT,
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
            fontSize: '14px',
        },

        '.cm-scroller': {
            backgroundColor: VSCODE_DARK_PLUS_BACKGROUND,
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
            lineHeight: '1.5',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
                width: '6px',
                height: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#38373680',
                borderRadius: '9999px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: '#4A4948cc',
            },
            '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
            },
        },

        '.cm-content': {
            backgroundColor: VSCODE_DARK_PLUS_BACKGROUND,
            padding: '8px 0',
            caretColor: '#ffffff',
        },

        '.cm-line': {
            paddingLeft: '4px',
        },

        '.cm-gutters': {
            backgroundColor: VSCODE_DARK_PLUS_BACKGROUND,
            color: VSCODE_DARK_PLUS_GUTTER_TEXT,
            border: 'none',
            minWidth: '46px',
        },

        '.cm-gutterElement': {
            padding: '0 8px 0 10px',
        },

        '.cm-lineNumbers .cm-gutterElement': {
            textAlign: 'right',
        },

        '.cm-foldGutter': {
            paddingRight: '2px',
        },

        '.cm-foldGutter .cm-gutterElement': {
            padding: '0 2px',
            cursor: 'pointer',
            userSelect: 'none',
            color: '#656565',
            transition: 'color 0.15s ease',
        },

        '.cm-foldGutter .cm-gutterElement:hover': {
            color: '#d4d4d4',
        },

        '.cm-fold-marker': {
            fontSize: '12px',
            display: 'inline-block',
            lineHeight: '1',
        },

        '.cm-activeLine': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
        },

        '.cm-activeLineGutter': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            color: '#c6c6c6',
        },

        // VS Code Selection
        '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
            {
                backgroundColor: '#264F78 !important',
            },

        '&:not(.cm-focused) > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
            backgroundColor: '#3A3D41 !important',
        },

        // Word match highlighting
        '.cm-selectionMatch': {
            backgroundColor: 'rgba(255, 255, 255, 0.12) !important',
            outline: '1px solid rgba(255, 255, 255, 0.25) !important',
            borderRadius: '2px',
        },

        // Search matches
        '.cm-searchMatch': {
            backgroundColor: 'rgba(234, 184, 57, 0.35) !important',
            outline: '1px solid rgba(234, 184, 57, 0.6) !important',
            borderRadius: '2px',
        },

        '.cm-searchMatch.cm-searchMatch-selected': {
            backgroundColor: 'rgba(234, 184, 57, 0.7) !important',
        },

        // Matching brackets
        '.cm-matchingBracket, .cm-nonmatchingBracket': {
            backgroundColor: 'rgba(255, 255, 255, 0.15) !important',
            outline: '1px solid #71717A !important',
            color: '#FFFFFF !important',
        },

        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: '#ffffff !important',
            borderLeftWidth: '2px !important',
        },

        // Autocomplete Tooltip Popup
        '.cm-tooltip-autocomplete': {
            backgroundColor: '#1E1E20 !important',
            border: '1px solid #333338 !important',
            borderRadius: '8px !important',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5) !important',
            padding: '4px !important',
            minWidth: '240px !important',
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace !important',
            fontSize: '12px !important',
        },

        '.cm-tooltip-autocomplete > ul': {
            maxHeight: '220px',
            '&::-webkit-scrollbar': {
                width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#38373680',
                borderRadius: '9999px',
            },
        },

        '.cm-tooltip-autocomplete > ul > li': {
            padding: '4px 8px !important',
            borderRadius: '4px !important',
            color: '#CCCCCC !important',
            display: 'flex !important',
            alignItems: 'center !important',
            gap: '8px !important',
            cursor: 'pointer !important',
        },

        '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            backgroundColor: '#04395E !important',
            color: '#FFFFFF !important',
        },

        '.cm-completionLabel': {
            fontWeight: '500',
            color: '#E0E0E0',
        },

        '.cm-completionDetail': {
            color: '#8A8A8E !important',
            fontSize: '11px !important',
            fontStyle: 'normal !important',
            marginLeft: 'auto !important',
        },

        '.cm-completionMatchedText': {
            color: '#569CD6 !important',
            textDecoration: 'underline !important',
            fontWeight: '600 !important',
        },

        // Search & Replace Panel
        '.cm-panel.cm-search': {
            backgroundColor: '#1C1C1E',
            borderBottom: '1px solid #2D2D30',
            padding: '6px 12px',
            color: '#CCCCCC',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        },

        '.cm-panel.cm-search input[type="text"]': {
            backgroundColor: '#252528',
            border: '1px solid #3C3C40',
            borderRadius: '4px',
            color: '#FFFFFF',
            padding: '3px 8px',
            fontSize: '12px',
            outline: 'none',
            fontFamily: '"JetBrains Mono", monospace',
        },

        '.cm-panel.cm-search input[type="text"]:focus': {
            borderColor: '#007ACC',
        },

        '.cm-panel.cm-search button': {
            backgroundColor: '#2D2D30',
            border: '1px solid #3C3C40',
            borderRadius: '4px',
            color: '#CCCCCC',
            padding: '3px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
        },

        '.cm-panel.cm-search button:hover': {
            backgroundColor: '#3E3E42',
            color: '#FFFFFF',
        },

        '.cm-panel.cm-search label': {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: '#9E9E9E',
            cursor: 'pointer',
        },
    },
    { dark: true }
)

export const vscodeDarkPlusHighlightStyle = HighlightStyle.define([
    {
        tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.modifier],
        color: '#569CD6',
    },
    { tag: [tags.string, tags.special(tags.string)], color: '#CE9178' },
    { tag: [tags.number, tags.bool, tags.null], color: '#B5CEA8' },
    { tag: tags.comment, color: '#6A9955', fontStyle: 'italic' },
    { tag: [tags.variableName, tags.propertyName, tags.attributeName], color: '#9CDCFE' },
    {
        tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.labelName],
        color: '#DCDCAA',
    },
    { tag: [tags.typeName, tags.className, tags.namespace], color: '#4EC9B0' },
    { tag: [tags.operator, tags.punctuation, tags.bracket, tags.separator], color: '#D4D4D4' },
])
