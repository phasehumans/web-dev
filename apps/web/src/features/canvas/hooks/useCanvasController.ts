import { useState, useRef, useEffect, useImperativeHandle } from 'react'

import type {
    CanvasConnection,
    CanvasDocument,
    CanvasItem,
    CanvasItemDraft,
    CanvasUpdateOptions as UpdateOptions,
} from '@/features/canvas/types'

import { createEmptyCanvasDocument } from '@/features/canvas/types'

export const SHAPE_TOOLS = new Set(['frame', 'square', 'circle', 'line', 'arrow'])
export const DRAW_TOOLS = new Set(['frame', 'square', 'circle', 'line', 'arrow', 'pen'])
export const ONE_SHOT_TOOLS = new Set(['frame', 'square', 'circle', 'line', 'arrow', 'text'])

const cloneState = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const createHistoryEntry = (items: CanvasItem[], connections: CanvasConnection[]) => ({
    items: cloneState(items),
    connections: cloneState(connections),
})

export const useCanvasController = (
    canvasDocument: CanvasDocument | null,
    onDocumentChange?: (doc: CanvasDocument) => void,
    ref?: React.ForwardedRef<any>
) => {
    const initialDocumentRef = useRef<CanvasDocument>(canvasDocument ?? createEmptyCanvasDocument())
    const lastExternalDocumentRef = useRef(JSON.stringify(initialDocumentRef.current))
    const [items, setItems] = useState<CanvasItem[]>(initialDocumentRef.current.items)
    const [connections, setConnections] = useState<CanvasConnection[]>(
        initialDocumentRef.current.connections
    )
    const [hasInteracted, setHasInteracted] = useState(initialDocumentRef.current.hasInteracted)
    const [history, setHistory] = useState<
        { items: CanvasItem[]; connections: CanvasConnection[] }[]
    >([
        createHistoryEntry(
            initialDocumentRef.current.items,
            initialDocumentRef.current.connections
        ),
    ])
    const [historyStep, setHistoryStep] = useState(0)
    const [activeTool, setActiveTool] = useState('select')
    const [scale, setScale] = useState(initialDocumentRef.current.scale)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [pan, setPan] = useState(initialDocumentRef.current.pan)
    const [isPanning, setIsPanning] = useState(false)
    const [isDrawing, setIsDrawing] = useState(false)
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
    const [tempItem, setTempItem] = useState<CanvasItem | null>(null)
    const [isErasing, setIsErasing] = useState(false)
    const erasedItemIdsRef = useRef<Set<string>>(new Set())
    const didEraseRef = useRef(false)
    const lastEraserPointRef = useRef<{ x: number; y: number } | null>(null)
    const lastPanPointRef = useRef<{ x: number; y: number } | null>(null)
    const previousToolRef = useRef<string | null>(null)
    const activeToolRef = useRef(activeTool)

    useEffect(() => {
        activeToolRef.current = activeTool
    }, [activeTool])
    const [connectionDraft, setConnectionDraft] = useState<{
        fromId: string
        fromSide: 'left' | 'right'
        toPoint?: { x: number; y: number }
    } | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const stateRef = useRef({ scale, pan, items, connections })

    useEffect(() => {
        stateRef.current = { scale, pan, items, connections }
    }, [scale, pan, items, connections])

    useEffect(() => {
        const nextDocument = canvasDocument ?? createEmptyCanvasDocument()
        const signature = JSON.stringify(nextDocument)

        if (signature === lastExternalDocumentRef.current) {
            return
        }

        lastExternalDocumentRef.current = signature
        setItems(nextDocument.items)
        setConnections(nextDocument.connections)
        setHasInteracted(nextDocument.hasInteracted)
        setHistory([createHistoryEntry(nextDocument.items, nextDocument.connections)])
        setHistoryStep(0)
        setScale(nextDocument.scale)
        setPan(nextDocument.pan)
        setSelectedId(null)
        setConnectionDraft(null)
        setTempItem(null)
        setIsDrawing(false)
        setIsPanning(false)
        setIsErasing(false)
    }, [canvasDocument])

    const onDocumentChangeRef = useRef(onDocumentChange)
    useEffect(() => {
        onDocumentChangeRef.current = onDocumentChange
    }, [onDocumentChange])

    useEffect(() => {
        const doc = {
            items,
            connections,
            pan,
            scale,
            hasInteracted,
        }
        lastExternalDocumentRef.current = JSON.stringify(doc)
        onDocumentChangeRef.current?.(doc)
    }, [connections, hasInteracted, items, pan, scale])

    const markInteraction = () => {
        if (!hasInteracted) setHasInteracted(true)
    }

    const addToHistory = (newItems: CanvasItem[], newConnections: CanvasConnection[]) => {
        const newHistory = history.slice(0, historyStep + 1)
        newHistory.push(createHistoryEntry(newItems, newConnections))
        setHistory(newHistory)
        setHistoryStep(newHistory.length - 1)
    }
    const undo = () => {
        if (historyStep <= 0) return
        const prevStep = historyStep - 1
        setHistoryStep(prevStep)
        setItems(history[prevStep]!.items)
        setConnections(history[prevStep]!.connections)
    }

    const redo = () => {
        if (historyStep >= history.length - 1) return
        const nextStep = historyStep + 1
        setHistoryStep(nextStep)
        setItems(history[nextStep]!.items)
        setConnections(history[nextStep]!.connections)
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const { scale: currentScale, pan: currentPan } = stateRef.current
                const rect = container.getBoundingClientRect()
                const mouseX = e.clientX - rect.left
                const mouseY = e.clientY - rect.top
                const scaleFactor = currentScale / 100
                const worldX = (mouseX - currentPan.x) / scaleFactor
                const worldY = (mouseY - currentPan.y) / scaleFactor
                const zoomDelta = -e.deltaY * 0.003
                let newScale = currentScale * Math.exp(zoomDelta)
                newScale = Math.min(Math.max(newScale, 10), 500)
                const newScaleFactor = newScale / 100
                setScale(newScale)
                setPan({ x: mouseX - worldX * newScaleFactor, y: mouseY - worldY * newScaleFactor })
            }
        }

        container.addEventListener('wheel', onWheel, { passive: false })
        return () => container.removeEventListener('wheel', onWheel)
    }, [])

    useEffect(() => {
        const shortcuts: Record<string, string> = {
            v: 'select',
            r: 'square',
            o: 'circle',
            l: 'line',
            a: 'arrow',
            p: 'pen',
            t: 'text',
            e: 'eraser',
            h: 'hand',
            f: 'frame',
        }

        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target) {
                const tag = target.tagName
                if (
                    tag === 'INPUT' ||
                    tag === 'TEXTAREA' ||
                    tag === 'SELECT' ||
                    target.isContentEditable
                ) {
                    return
                }
            }

            // spacebar or shift key down: temporarily shift to 'hand' tool
            if (e.key === ' ' || e.key === 'Shift') {
                const currentTool = activeToolRef.current
                if (currentTool !== 'hand' && !previousToolRef.current) {
                    previousToolRef.current = currentTool
                    setActiveTool('hand')
                }
                if (e.key === ' ') {
                    e.preventDefault() // prevent page scrolling
                }
                return
            }

            if (e.metaKey || e.ctrlKey || e.altKey || (e.shiftKey && e.key !== 'Shift')) return

            const nextTool = shortcuts[e.key.toLowerCase()]
            if (!nextTool) return

            e.preventDefault()
            setActiveTool(nextTool)
        }

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Shift') {
                if (previousToolRef.current) {
                    setActiveTool(previousToolRef.current)
                    previousToolRef.current = null
                }
            }
        }

        const onWindowBlur = () => {
            if (previousToolRef.current) {
                setActiveTool(previousToolRef.current)
                previousToolRef.current = null
            }
        }

        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        window.addEventListener('blur', onWindowBlur)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
            window.removeEventListener('blur', onWindowBlur)
        }
    }, [])

    const getDefaultItemSize = (item: CanvasItem) => {
        switch (item.type) {
            case 'note':
                return { width: 256, height: 180 }
            case 'text':
                return { width: 10, height: 30 }
            case 'image':
                return { width: 320, height: 288 }
            case 'link':
                return { width: 480, height: 120 }
            case 'frame':
                return { width: 384, height: 384 }
            case 'square':
            case 'circle':
                return { width: 128, height: 128 }
            case 'line':
            case 'arrow':
                return { width: 192, height: 48 }
            case 'pen':
                return { width: 192, height: 96 }
            default:
                return { width: 120, height: 80 }
        }
    }

    const getItemBounds = (item: CanvasItem) => {
        const defaults = getDefaultItemSize(item)
        return {
            x: item.x,
            y: item.y,
            width: Math.max(item.width ?? defaults.width, 2),
            height: Math.max(item.height ?? defaults.height, 2),
        }
    }

    const getLineAbsolutePoints = (item: CanvasItem) => {
        const bounds = getItemBounds(item)
        const relativePoints =
            item.points && item.points.length >= 2
                ? item.points
                : [
                      { x: 2, y: bounds.height / 2 },
                      { x: bounds.width - 2, y: bounds.height / 2 },
                  ]

        return relativePoints.map((pt) => ({ x: item.x + pt.x, y: item.y + pt.y }))
    }

    const buildSmoothPath = (points: { x: number; y: number }[]) => {
        if (points.length === 0) return ''
        if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`
        if (points.length === 2) {
            return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`
        }

        let d = `M ${points[0]!.x} ${points[0]!.y}`
        for (let i = 1; i < points.length - 1; i += 1) {
            const current = points[i]!
            const next = points[i + 1]!
            const midX = (current.x + next.x) / 2
            const midY = (current.y + next.y) / 2
            d += ` Q ${current.x} ${current.y} ${midX} ${midY}`
        }

        const last = points[points.length - 1]!
        d += ` L ${last.x} ${last.y}`
        return d
    }

    const buildPolylinePath = (points: { x: number; y: number }[]) => {
        if (points.length < 2) return ''
        return points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
    }

    const distanceToSegment = (
        point: { x: number; y: number },
        a: { x: number; y: number },
        b: { x: number; y: number }
    ) => {
        const abx = b.x - a.x
        const aby = b.y - a.y
        const apx = point.x - a.x
        const apy = point.y - a.y
        const ab2 = abx * abx + aby * aby
        if (ab2 === 0) return Math.hypot(point.x - a.x, point.y - a.y)
        const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
        const cx = a.x + abx * t
        const cy = a.y + aby * t
        return Math.hypot(point.x - cx, point.y - cy)
    }

    const ERASE_TOLERANCE = 8

    const isPointNearRectStroke = (
        point: { x: number; y: number },
        bounds: { x: number; y: number; width: number; height: number },
        tolerance = ERASE_TOLERANCE
    ) => {
        const left = bounds.x
        const top = bounds.y
        const right = bounds.x + bounds.width
        const bottom = bounds.y + bounds.height

        const edges: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
            [
                { x: left, y: top },
                { x: right, y: top },
            ],
            [
                { x: right, y: top },
                { x: right, y: bottom },
            ],
            [
                { x: right, y: bottom },
                { x: left, y: bottom },
            ],
            [
                { x: left, y: bottom },
                { x: left, y: top },
            ],
        ]

        return edges.some(([start, end]) => distanceToSegment(point, start, end) <= tolerance)
    }

    const isPointNearEllipseStroke = (
        point: { x: number; y: number },
        bounds: { x: number; y: number; width: number; height: number },
        tolerance = ERASE_TOLERANCE
    ) => {
        const rx = bounds.width / 2
        const ry = bounds.height / 2
        if (rx < 1 || ry < 1) return false

        const cx = bounds.x + rx
        const cy = bounds.y + ry
        const nx = (point.x - cx) / rx
        const ny = (point.y - cy) / ry
        const radialDelta = Math.abs(Math.sqrt(nx * nx + ny * ny) - 1)
        const approxDistance = radialDelta * Math.min(rx, ry)
        return approxDistance <= tolerance
    }

    const isPointInsideItem = (point: { x: number; y: number }, item: CanvasItem) => {
        const bounds = getItemBounds(item)

        if (item.type === 'line' || item.type === 'arrow') {
            const points = getLineAbsolutePoints(item)
            for (let i = 0; i < points.length - 1; i += 1) {
                if (distanceToSegment(point, points[i]!, points[i + 1]!) <= ERASE_TOLERANCE) {
                    return true
                }
            }
            return false
        }

        if (item.type === 'pen' && item.points && item.points.length > 1) {
            const absolutePoints = item.points.map((pt) => ({ x: item.x + pt.x, y: item.y + pt.y }))
            for (let i = 0; i < absolutePoints.length - 1; i += 1) {
                if (
                    distanceToSegment(point, absolutePoints[i]!, absolutePoints[i + 1]!) <=
                    ERASE_TOLERANCE
                ) {
                    return true
                }
            }
            return false
        }

        if (item.type === 'square' || item.type === 'frame') {
            return isPointNearRectStroke(point, bounds)
        }

        if (item.type === 'circle') {
            return isPointNearEllipseStroke(point, bounds)
        }

        return (
            point.x >= bounds.x &&
            point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y &&
            point.y <= bounds.y + bounds.height
        )
    }

    const normalizeRect = (start: { x: number; y: number }, end: { x: number; y: number }) => ({
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.max(Math.abs(end.x - start.x), 2),
        height: Math.max(Math.abs(end.y - start.y), 2),
    })

    const ERASABLE_TYPES = new Set(['pen', 'square', 'circle', 'line', 'arrow', 'text'])

    const eraseAtPoint = (point: { x: number; y: number }) => {
        const currentItems = stateRef.current.items
        const currentConnections = stateRef.current.connections
        const target = [...currentItems]
            .reverse()
            .find(
                (item) =>
                    ERASABLE_TYPES.has(item.type) &&
                    !erasedItemIdsRef.current.has(item.id) &&
                    isPointInsideItem(point, item)
            )

        if (!target) return

        const idsToRemove = new Set<string>()
        idsToRemove.add(target.id)

        idsToRemove.forEach((id) => erasedItemIdsRef.current.add(id))

        const newItems = currentItems.filter((item) => !idsToRemove.has(item.id))
        const newConnections = currentConnections.filter(
            (conn) => !idsToRemove.has(conn.from) && !idsToRemove.has(conn.to)
        )

        didEraseRef.current = true
        setItems(newItems)
        setConnections(newConnections)
        setSelectedId((prev) => (prev && idsToRemove.has(prev) ? null : prev))
        stateRef.current = { ...stateRef.current, items: newItems, connections: newConnections }
    }

    const eraseAlongLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const dx = to.x - from.x
        const dy = to.y - from.y
        const dist = Math.hypot(dx, dy)
        const step = 4
        const steps = Math.max(Math.ceil(dist / step), 1)

        for (let i = 0; i <= steps; i++) {
            const t = i / steps
            eraseAtPoint({ x: from.x + dx * t, y: from.y + dy * t })
        }
    }

    const getInsertionOrigin = (type: CanvasItem['type']) => {
        const viewportCenterX = window.innerWidth / 2
        const viewportCenterY = window.innerHeight / 2
        const centerX = (viewportCenterX - pan.x) / (scale / 100)
        const centerY = (viewportCenterY - pan.y) / (scale / 100)
        const jitter = type !== 'link' ? Math.random() * 40 - 20 : 0

        return {
            x: centerX + jitter - (type === 'image' || type === 'link' ? 130 : 50),
            y: centerY + jitter - (type === 'image' || type === 'link' ? 120 : 50),
        }
    }

    const handleAddItems = (drafts: CanvasItemDraft[]) => {
        if (drafts.length === 0) {
            return
        }

        markInteraction()
        const origin = getInsertionOrigin(drafts[0]!.type)
        const createdItems = drafts.map((draft, index) => ({
            ...draft,
            id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
            x: origin.x + index * 28,
            y: origin.y + index * 28,
        }))
        const newItems = [...items, ...createdItems]
        setItems(newItems)
        setSelectedId(createdItems[createdItems.length - 1]?.id ?? null)
        addToHistory(newItems, connections)
    }

    const handleAddItem = (type: CanvasItem['type'], content?: string) => {
        if (type === 'link' && content) {
            handleAddItems([
                {
                    type: 'image',
                    content: `https://placehold.co/600x400/1C1C1E/FFFFFF?text=${encodeURIComponent(content)}&font=inter`,
                    width: 260,
                    height: 240,
                },
            ])
            return
        }

        if (DRAW_TOOLS.has(type)) {
            markInteraction()
            setActiveTool(type)
            return
        }

        handleAddItems([
            {
                type,
                ...(content !== undefined ? { content } : {}),
            },
        ])
    }

    useImperativeHandle(ref, () => ({
        triggerImageUpload: () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = (e) => {
                markInteraction()
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) {
                    const reader = new FileReader()
                    reader.onload = (evt) => {
                        if (evt.target?.result) handleAddItem('image', evt.target.result as string)
                    }
                    reader.readAsDataURL(file)
                }
            }
            input.click()
        },
    }))

    const handleRemoveItem = (id: string) => {
        markInteraction()
        const itemToRemove = items.find((i) => i.id === id)
        if (!itemToRemove) return

        let newItems: CanvasItem[]
        let newConnections: typeof connections

        if (itemToRemove.type === 'frame') {
            newItems = items.filter((item) => item.id !== id && item.parentId !== id)
            newConnections = connections.filter((c) => c.from !== id && c.to !== id)
        } else {
            newItems = items.filter((item) => item.id !== id)
            newConnections = connections.filter((c) => c.from !== id && c.to !== id)
        }

        setItems(newItems)
        setConnections(newConnections)
        addToHistory(newItems, newConnections)
        if (selectedId === id) setSelectedId(null)
    }

    const handleItemSelect = (id: string) => {
        if (activeTool !== 'select') return
        if (connectionDraft) return

        const item = items.find((i) => i.id === id)
        if (item?.parentId) setSelectedId(item.parentId)
        else setSelectedId(id)
    }

    const handleItemDrag = (id: string, delta: { x: number; y: number }) => {
        markInteraction()
        setItems((prev) =>
            prev.map((item) => {
                if (item.id === id) return { ...item, x: item.x + delta.x, y: item.y + delta.y }
                if (item.parentId === id)
                    return { ...item, x: item.x + delta.x, y: item.y + delta.y }
                return item
            })
        )
    }

    const handleItemDragEnd = () => {
        markInteraction()
        addToHistory(stateRef.current.items, stateRef.current.connections)
    }

    const getCanvasCoordinates = (e: React.PointerEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 }
        const rect = containerRef.current.getBoundingClientRect()
        const scaleFactor = scale / 100
        return {
            x: (e.clientX - rect.left - pan.x) / scaleFactor,
            y: (e.clientY - rect.top - pan.y) / scaleFactor,
        }
    }

    const handleConnectStart = (itemId: string, side: 'left' | 'right', e: React.PointerEvent) => {
        markInteraction()
        e.stopPropagation()
        e.preventDefault()
        const coords = getCanvasCoordinates(e)
        setConnectionDraft({ fromId: itemId, fromSide: side, toPoint: coords })
    }

    const handleConnectEnd = (itemId: string, side: 'left' | 'right') => {
        markInteraction()
        if (!connectionDraft) return

        if (connectionDraft.fromId !== itemId) {
            const newConnection: CanvasConnection = {
                id: Date.now().toString(),
                from: connectionDraft.fromId,
                to: itemId,
                fromSide: connectionDraft.fromSide,
                toSide: side,
            }
            const newConnections = [...connections, newConnection]
            setConnections(newConnections)
            addToHistory(items, newConnections)
        }

        setConnectionDraft(null)
    }

    const getAnchorPoint = (itemId: string, side: 'left' | 'right') => {
        const item = items.find((i) => i.id === itemId)
        if (!item) return { x: 0, y: 0 }

        const w = item.width || (item.type === 'frame' ? 320 : 100)
        const h = item.height || (item.type === 'frame' ? 320 : 100)
        const cy = item.y + h / 2
        return side === 'left' ? { x: item.x, y: cy } : { x: item.x + w, y: cy }
    }

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 && e.button !== 1) return

        const coords = getCanvasCoordinates(e)

        if (activeTool === 'hand' || e.button === 1) {
            setIsPanning(true)
            const pt = { x: e.clientX, y: e.clientY }
            setDragStart(pt)
            lastPanPointRef.current = pt
            e.currentTarget.setPointerCapture(e.pointerId)
            e.preventDefault()
            return
        }

        if (e.button !== 0) return

        if (activeTool === 'eraser') {
            markInteraction()
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.setPointerCapture(e.pointerId)
            setSelectedId(null)
            setIsErasing(true)
            didEraseRef.current = false
            erasedItemIdsRef.current = new Set()
            lastEraserPointRef.current = coords
            eraseAtPoint(coords)
            return
        }

        if (activeTool === 'text') {
            markInteraction()
            e.preventDefault()
            e.stopPropagation()
            const textItem: CanvasItem = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'text',
                x: coords.x,
                y: coords.y,
                width: 10,
                height: 30,
                content: '',
            }
            const newItems = [...stateRef.current.items, textItem]
            setItems(newItems)
            setSelectedId(textItem.id)
            addToHistory(newItems, stateRef.current.connections)
            setActiveTool('select')
            return
        }

        if (SHAPE_TOOLS.has(activeTool)) {
            markInteraction()
            e.preventDefault()
            e.stopPropagation()
            setDragStart(coords)
            setIsDrawing(true)
            setSelectedId(null)

            const tempBase: CanvasItem = {
                id: 'temp-item',
                type: activeTool as CanvasItem['type'],
                x: coords.x,
                y: coords.y,
                width: 2,
                height: 2,
                content: activeTool === 'frame' ? 'Custom' : undefined,
            }

            if (activeTool === 'line' || activeTool === 'arrow') {
                tempBase.points = [
                    { x: 0, y: 0 },
                    { x: 2, y: 2 },
                ]
            }

            setTempItem(tempBase)
            return
        }

        if (activeTool === 'pen') {
            markInteraction()
            e.preventDefault()
            e.stopPropagation()
            setDragStart(coords)
            setIsDrawing(true)
            setSelectedId(null)
            setTempItem({
                id: 'temp-pen',
                type: 'pen',
                x: coords.x,
                y: coords.y,
                width: 2,
                height: 2,
                points: [{ x: 0, y: 0 }],
            })
        }
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        const coords = getCanvasCoordinates(e)

        if (connectionDraft) {
            setConnectionDraft((prev) => (prev ? { ...prev, toPoint: coords } : null))
            return
        }

        if (isPanning && lastPanPointRef.current) {
            const dx = e.clientX - lastPanPointRef.current.x
            const dy = e.clientY - lastPanPointRef.current.y
            if (dx !== 0 || dy !== 0) {
                setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
                lastPanPointRef.current = { x: e.clientX, y: e.clientY }
            }
            return
        }

        if (activeTool === 'eraser' && isErasing) {
            if (lastEraserPointRef.current) {
                eraseAlongLine(lastEraserPointRef.current, coords)
            } else {
                eraseAtPoint(coords)
            }
            lastEraserPointRef.current = coords
            return
        }

        if (isDrawing && dragStart && tempItem) {
            if (tempItem.type === 'pen') {
                setTempItem((prev) => {
                    if (!prev || prev.type !== 'pen') return prev

                    const existingPoints = prev.points || []
                    const absolutePoints = existingPoints.map((pt) => ({
                        x: prev.x + pt.x,
                        y: prev.y + pt.y,
                    }))
                    const lastPoint = absolutePoints[absolutePoints.length - 1]
                    const distance = lastPoint
                        ? Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y)
                        : Infinity

                    if (distance < 0.9) {
                        return prev
                    }

                    const nextPoint = lastPoint
                        ? {
                              x: lastPoint.x + (coords.x - lastPoint.x) * 0.65,
                              y: lastPoint.y + (coords.y - lastPoint.y) * 0.65,
                          }
                        : coords

                    absolutePoints.push(nextPoint)

                    const xs = absolutePoints.map((pt) => pt.x)
                    const ys = absolutePoints.map((pt) => pt.y)
                    const minX = Math.min(...xs)
                    const maxX = Math.max(...xs)
                    const minY = Math.min(...ys)
                    const maxY = Math.max(...ys)

                    return {
                        ...prev,
                        x: minX,
                        y: minY,
                        width: Math.max(maxX - minX, 2),
                        height: Math.max(maxY - minY, 2),
                        points: absolutePoints.map((pt) => ({ x: pt.x - minX, y: pt.y - minY })),
                    }
                })
                return
            }

            const rect = normalizeRect(dragStart, coords)
            if (tempItem.type === 'line' || tempItem.type === 'arrow') {
                setTempItem((prev) =>
                    prev
                        ? {
                              ...prev,
                              x: rect.x,
                              y: rect.y,
                              width: rect.width,
                              height: rect.height,
                              points: [
                                  { x: dragStart.x - rect.x, y: dragStart.y - rect.y },
                                  { x: coords.x - rect.x, y: coords.y - rect.y },
                              ],
                          }
                        : null
                )
                return
            }

            setTempItem((prev) =>
                prev
                    ? {
                          ...prev,
                          x: rect.x,
                          y: rect.y,
                          width: rect.width,
                          height: rect.height,
                      }
                    : null
            )
        }
    }

    const handlePointerUp = () => {
        if (connectionDraft) setConnectionDraft(null)
        if (isPanning) {
            setIsPanning(false)
            setDragStart(null)
            lastPanPointRef.current = null
        }

        if (isErasing) {
            setIsErasing(false)
            if (didEraseRef.current)
                addToHistory(stateRef.current.items, stateRef.current.connections)
            didEraseRef.current = false
            erasedItemIdsRef.current = new Set()
            lastEraserPointRef.current = null
        }

        if (isDrawing && tempItem) {
            let shouldCreate = false

            if (tempItem.type === 'frame') {
                shouldCreate = (tempItem.width || 0) > 50 && (tempItem.height || 0) > 50
            } else if (tempItem.type === 'square' || tempItem.type === 'circle') {
                shouldCreate = (tempItem.width || 0) > 8 && (tempItem.height || 0) > 8
            } else if (tempItem.type === 'line' || tempItem.type === 'arrow') {
                const pts = tempItem.points || []
                if (pts.length >= 2) {
                    const start = pts[0]!
                    const end = pts[pts.length - 1]!
                    shouldCreate = Math.hypot(end.x - start.x, end.y - start.y) > 6
                }
            } else if (tempItem.type === 'pen') {
                shouldCreate = (tempItem.points?.length || 0) > 1
            }

            if (shouldCreate) {
                const newItem: CanvasItem = {
                    ...tempItem,
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    width: Math.max(tempItem.width || 0, 2),
                    height: Math.max(tempItem.height || 0, 2),
                }
                const newItems = [...stateRef.current.items, newItem]
                setItems(newItems)
                setSelectedId(newItem.id)
                addToHistory(newItems, stateRef.current.connections)
            }

            if (ONE_SHOT_TOOLS.has(tempItem.type)) setActiveTool('select')
            setIsDrawing(false)
            setDragStart(null)
            setTempItem(null)
        }
    }

    const getTempFramePath = (w: number, h: number) => {
        const width = Math.abs(w)
        const height = Math.abs(h)
        const radius = 8
        const tabHeight = 32
        const tabWidth = 120
        return `
      M 0 ${radius}
      Q 0 0 ${radius} 0
      L ${tabWidth - radius} 0
      Q ${tabWidth} 0 ${tabWidth} ${radius}
      L ${tabWidth} ${tabHeight}
      L ${width - radius} ${tabHeight}
      Q ${width} ${tabHeight} ${width} ${tabHeight + radius}
      L ${width} ${height - radius}
      Q ${width} ${height} ${width - radius} ${height}
      L ${radius} ${height}
      Q 0 ${height} 0 ${height - radius}
      Z
    `
    }

    const getDraftLinePoints = (item: CanvasItem) => {
        if (item.points && item.points.length >= 2) return item.points
        const w = Math.max(item.width || 2, 2)
        const h = Math.max(item.height || 2, 2)
        return [
            { x: 2, y: h / 2 },
            { x: w - 2, y: h / 2 },
        ]
    }

    const getConnectionPath = (x1: number, y1: number, x2: number, y2: number) => {
        const dist = Math.abs(x2 - x1)
        const cp1x = x1 + dist * 0.5
        const cp2x = x2 - dist * 0.5
        return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`
    }

    const handleItemUpdate = (
        id: string,
        updates: Partial<CanvasItem>,
        options?: UpdateOptions
    ) => {
        const commitHistory = options?.commitHistory !== false
        const newItems = stateRef.current.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
        )

        setItems(newItems)
        stateRef.current = { ...stateRef.current, items: newItems }

        if (commitHistory) {
            addToHistory(newItems, stateRef.current.connections)
        }
    }

    const handleItemUpdateEnd = () => {
        addToHistory(stateRef.current.items, stateRef.current.connections)
    }

    return {
        items,
        connections,
        hasInteracted,
        history,
        historyStep,
        activeTool,
        setActiveTool,
        scale,
        setScale,
        selectedId,
        setSelectedId,
        pan,
        setPan,
        isPanning,
        isDrawing,
        tempItem,
        isErasing,
        connectionDraft,
        containerRef,
        undo,
        redo,
        markInteraction,
        handleAddItem,
        handleAddItems,
        handleRemoveItem,
        handleItemSelect,
        handleItemDrag,
        handleItemDragEnd,
        handleConnectStart,
        handleConnectEnd,
        getAnchorPoint,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        getTempFramePath,
        getDraftLinePoints,
        getConnectionPath,
        handleItemUpdate,
        handleItemUpdateEnd,
        buildSmoothPath,
        buildPolylinePath,
    }
}
