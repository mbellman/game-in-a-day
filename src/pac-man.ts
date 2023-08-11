import { ClipMap, createCanvas, createSpriteFromImage, drawArc, drawSprite, drawSquare, Position, Screen, SpriteSheet } from "./canvas"

const SCREEN_WIDTH = 800
const SCREEN_HEIGHT = 700

const PAC_MAN_RADIUS = 30
const PAC_MAN_ANIMATION_SPEED = 20
const PAC_MAN_MOVEMENT_SPEED = 3

const GHOST_SIZE = 13 * 4

const GRID_CELL_SIZE = 50

const sprites: SpriteSheet = {
    ghosts: null
}

const clipMap: ClipMap = {
    blinky: {
        x: 0,
        y: 0,
        width: 14,
        height: 14
    },
    pinky: {
        x: 0,
        y: 14,
        width: 14,
        height: 14
    },
    inky: {
        x: 0,
        y: 28,
        width: 14,
        height: 14
    },
    clyde: {
        x: 0,
        y: 42,
        width: 14,
        height: 14
    }
}

enum Direction {
    UP,
    DOWN,
    LEFT,
    RIGHT
}

enum GhostMode {
    ACTIVE,
    RUNNING_AWAY,
    DEAD
}

interface Ghost {
    position: Position
    spriteName: string
    path: Position[]
    speed: number
    mode: GhostMode
}

interface GameState {
    startTime: number
    position: Position
    gridPosition: Position
    direction: Direction
    queuedDirection: Direction,
    directionChangeTarget: number
    dots: Position[]
    ghosts: Ghost[]
}

type LevelLayout = number[][]

const levelLayout: LevelLayout = [
    [ 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1 ],
    [ 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1 ],
    [ 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0 ],
    [ 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1 ],
    [ 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1 ],
    [ 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1 ],
    [ 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0 ],
    [ 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1 ],
    [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1 ],
    [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1 ],
    [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1 ],
    [ 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1 ],
]

const state: GameState = {
    startTime: 0,
    position: {
        x: 250,
        y: 300
    },
    gridPosition: { x: -1, y: -1 },
    direction: Direction.RIGHT,
    queuedDirection: null,
    directionChangeTarget: 0,
    dots: [],
    ghosts: [
        {
            position: { x: 100, y: 100 },
            spriteName: 'blinky',
            path: [],
            speed: 3,
            mode: GhostMode.ACTIVE
        },
        {
            position: { x: 100, y: 150 },
            spriteName: 'pinky',
            path: [],
            speed: 2.5,
            mode: GhostMode.ACTIVE
        },
        {
            position: { x: 100, y: 200 },
            spriteName: 'inky',
            path: [],
            speed: 2,
            mode: GhostMode.ACTIVE
        },
        {
            position: { x: 100, y: 250 },
            spriteName: 'clyde',
            path: [],
            speed: 1.5,
            mode: GhostMode.ACTIVE
        }
    ]
}

function toRadians(angle: number) {
    return angle * (Math.PI / 180)
}

function getPositionDelta(): Position {
    switch (state.direction) {
        case Direction.UP:
            return { x: 0, y: -1 }
        case Direction.DOWN:
            return { x: 0, y: 1 }
        case Direction.LEFT:
            return { x: -1, y: 0 }
        case Direction.RIGHT:
            return { x: 1, y: 0 } 
    }
}

function getRotationOffset(): number {
    switch (state.direction) {
        case Direction.UP:
            return -90
        case Direction.DOWN:
            return 90
        case Direction.LEFT:
            return 180
        case Direction.RIGHT:
            return 0
    }
}

function isSameAxis(directionA: Direction, directionB: Direction) {
    return (
        (directionA === Direction.UP && directionB === Direction.DOWN) ||
        (directionA === Direction.DOWN && directionB === Direction.UP) ||
        (directionA === Direction.LEFT && directionB === Direction.RIGHT) ||
        (directionA === Direction.RIGHT && directionB === Direction.LEFT)
    )
}

function setQueuedDirection(direction: Direction) {
    if (state.direction === direction || isSameAxis(state.direction, direction)) {
        state.direction = direction

        return
    }

    state.queuedDirection = direction

    switch (state.direction) {
        case Direction.UP:
            state.directionChangeTarget = Math.floor(state.position.y / GRID_CELL_SIZE) * GRID_CELL_SIZE
            break;
        case Direction.DOWN:
            state.directionChangeTarget = Math.ceil(state.position.y / GRID_CELL_SIZE) * GRID_CELL_SIZE
            break
        case Direction.LEFT:
            state.directionChangeTarget = Math.floor(state.position.x / GRID_CELL_SIZE) * GRID_CELL_SIZE
            break;
        case Direction.RIGHT:
            state.directionChangeTarget = Math.ceil(state.position.x / GRID_CELL_SIZE) * GRID_CELL_SIZE
            break
            
    }
}

function hasPassedDirectionChangeTarget() {
    switch (state.direction) {
        case Direction.UP:
            return state.position.y < state.directionChangeTarget
        case Direction.DOWN:
            return state.position.y > state.directionChangeTarget
        case Direction.LEFT:
            return state.position.x < state.directionChangeTarget
        case Direction.RIGHT:
            return state.position.x > state.directionChangeTarget
    }
}

function updateGhostPaths() {
    const targetGridPosition = getGridPosition(state.position)

    for (const ghost of state.ghosts) {
        const layout = copyLevelLayout()
        const gridPosition = getGridPosition(ghost.position)

        layout[gridPosition.y][gridPosition.x] = 1

        const newPath = getShortestGridPath(gridPosition, targetGridPosition, layout)

        if (ghost.path[0] && newPath[0]) {
            if (ghost.path[0].x !== newPath[0].x || ghost.path[0].y !== newPath[0].y) {
                // If we compute a new path starting from a different adjacent cell,
                // prepend that path with the current grid position so the ghost
                // stays grid-aligned, and does not drift diagonally to the new
                // path start position.
                ghost.path = [gridPosition, ...newPath]
            }
        } else {
            ghost.path = newPath
        }
    }
}

function updatePlayerPosition() {
    const delta = getPositionDelta()

    const nextGridPosition = getGridPosition({
        x: state.position.x + delta.x * GRID_CELL_SIZE / 2,
        y: state.position.y + delta.y * GRID_CELL_SIZE / 2
    })

    if (levelLayout[nextGridPosition.y][nextGridPosition.x] === 1) {
        if (state.queuedDirection !== null) {
            state.direction = state.queuedDirection
            state.queuedDirection = null
        }
    } else {
        state.position = {
            x: state.position.x + delta.x * PAC_MAN_MOVEMENT_SPEED,
            y: state.position.y + delta.y * PAC_MAN_MOVEMENT_SPEED,
        }
    
        wrapPositionAlongAxis('x', SCREEN_WIDTH)
        wrapPositionAlongAxis('y', SCREEN_HEIGHT)
    }

    if (state.queuedDirection !== null && hasPassedDirectionChangeTarget()) {
        state.direction = state.queuedDirection
        state.queuedDirection = null
    }

    const newGridPosition = getGridPosition(state.position)

    if (newGridPosition.x !== state.gridPosition.x || newGridPosition.y !== state.gridPosition.y) {
        state.gridPosition = newGridPosition

        updateGhostPaths()
    }
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

function clampGridPosition(position: Position): Position {
    position.x = clamp(position.x, 0, levelLayout[0].length - 1)
    position.y = clamp(position.y, 0, levelLayout.length - 1)

    return position
}

function getGridPosition(pixelPosition: Position): Position {
    const position = { ...pixelPosition }

    return clampGridPosition({
        x: Math.round((position.x - GRID_CELL_SIZE) / GRID_CELL_SIZE),
        y: Math.round((position.y - GRID_CELL_SIZE) / GRID_CELL_SIZE)
    })
}

function getPixelPosition(gridPosition: Position): Position {
    return {
        x: gridPosition.x * GRID_CELL_SIZE + GRID_CELL_SIZE,
        y: gridPosition.y * GRID_CELL_SIZE + GRID_CELL_SIZE
    }
}

function getTile(layout: LevelLayout, { y, x }: Position): number {
    return layout[y][x]
}

function cost(cell: Position, target: Position): number {
    return Math.abs(target.x - cell.x) + Math.abs(target.y - cell.y)
}

function getAdjacentEmptyCells(cell: Position, target: Position, layout: LevelLayout): Position[] {
    const top: Position = clampGridPosition({ x: cell.x, y: cell.y - 1 })
    const bottom: Position = clampGridPosition({ x: cell.x, y: cell.y + 1 })
    const left: Position = clampGridPosition({ x: cell.x - 1, y: cell.y })
    const right: Position = clampGridPosition({ x: cell.x + 1, y: cell.y })
    const cells: Position[] = []

    if (getTile(layout, top) !== 1) {
        layout[top.y][top.x] = 1

        cells.push(top)
    }

    if (getTile(layout, bottom) !== 1) {
        layout[bottom.y][bottom.x] = 1

        cells.push(bottom)
    }

    if (getTile(layout, left) !== 1) {
        layout[left.y][left.x] = 1

        cells.push(left)
    }

    if (getTile(layout, right) !== 1) {
        layout[right.y][right.x] = 1

        cells.push(right)
    }

    cells.sort((a, b) => {
        return cost(a, target) < cost(b, target) ? -1 : 1
    });

    return cells
}

function getShortestGridPath(current: Position, target: Position, layout: LevelLayout, path: Position[] = []): Position[] {
    if (current.x === target.x && current.y === target.y) {
        return path
    }

    const adjacentEmptyCells = getAdjacentEmptyCells(current, target, layout)

    for (const cell of adjacentEmptyCells) {
        const newPath = getShortestGridPath(cell, target, layout, [...path, cell])
        const last = newPath[newPath.length - 1]

        if (last.x === target.x && last.y === target.y) {
            return newPath
        }
    }

    return path
}

function copyLevelLayout(): LevelLayout {
    const layout: LevelLayout = []

    for (let y = 0; y < levelLayout.length; y++) {
        layout.push([])

        for (let x = 0; x < levelLayout[y].length; x++) {
            layout[y].push(levelLayout[y][x])
        }
    }

    return layout
}

function updateGhosts() {
    for (const ghost of state.ghosts) {
        const nextTile = ghost.path[0]
        
        if (nextTile) {
            const nextTilePixelPosition = getPixelPosition(nextTile)

            ghost.position.x += Math.sign(nextTilePixelPosition.x - ghost.position.x) * ghost.speed
            ghost.position.y += Math.sign(nextTilePixelPosition.y - ghost.position.y) * ghost.speed

            if (distance(ghost.position, nextTilePixelPosition) <= 3) {
                ghost.position = nextTilePixelPosition

                ghost.path.shift()
            }
        }
    }
}

function eatNearbyDots() {
    for (let i = 0; i < state.dots.length; i++) {
        if (distance(state.position, state.dots[i]) < PAC_MAN_RADIUS) {
            state.dots.splice(i, 1)
        }
    }
}

function drawWalls(screen: Screen) {
    for (let i = 0; i < levelLayout.length; i++) {
        for (let j = 0; j < levelLayout[i].length; j++) {
            if (levelLayout[i][j] === 1) {
                drawSquare(screen, {
                    x: j * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
                    y: i * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
                    width: GRID_CELL_SIZE,
                    height: GRID_CELL_SIZE
                }, '#00f')
            }
        }
    }
}

function drawDots(screen: Screen) {
    const DOT_SIZE = 6
    const HALF_DOT_SIZE = DOT_SIZE / 2

    for (const dot of state.dots) {
        drawSquare(screen, {
            x: dot.x - HALF_DOT_SIZE,
            y: dot.y - HALF_DOT_SIZE,
            width: DOT_SIZE,
            height: DOT_SIZE
        }, '#fff')
    }
}

function distance(p1: Position, p2: Position): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y

    return Math.sqrt(dx*dx + dy*dy)
}

function unit(position: Position): Position {
    const magnitude = Math.sqrt(position.x * position.x + position.y * position.y)

    return {
        x: position.x / magnitude,
        y: position.y / magnitude
    }
}

function drawGhosts(screen: Screen) {
    for (const ghost of state.ghosts) {
        const clip = clipMap[ghost.spriteName]

        drawSprite(screen, sprites.ghosts, clip, {
            x: ghost.position.x,
            y: ghost.position.y,
            width: GHOST_SIZE,
            height: GHOST_SIZE
        })

        const eyeOffset = unit({
            x: state.position.x - ghost.position.x,
            y: state.position.y - ghost.position.y
        })

        drawSquare(screen, {
            x: ghost.position.x - GHOST_SIZE * 0.22 + 5 * eyeOffset.x,
            y: ghost.position.y - GHOST_SIZE * 0.18 + 5 * eyeOffset.y,
            width: 8,
            height: 8
        }, '#05f')

        drawSquare(screen, {
            x: ghost.position.x + GHOST_SIZE * 0.22 + 5 * eyeOffset.x,
            y: ghost.position.y - GHOST_SIZE * 0.18 + 5 * eyeOffset.y,
            width: 8,
            height: 8
        }, '#05f')
    }
}

function drawPacMan(screen: Screen) {
    const alpha = PAC_MAN_ANIMATION_SPEED * (Date.now() - state.startTime) / 1000
    const rotationOffset = getRotationOffset()

    const topRotation = 180 - ((Math.sin(alpha) + 1) / 2) * 50 + rotationOffset
    const bottomRotation = 0 + ((Math.sin(alpha) + 1) / 2) * 50 + rotationOffset

    const baseParams = {
        ...state.position,
        radius: PAC_MAN_RADIUS,
        angle: toRadians(180)
    }

    drawArc(screen, { ...baseParams, rotation: toRadians(topRotation) }, '#ff0')
    drawArc(screen, { ...baseParams, rotation: toRadians(bottomRotation) }, '#ff0')
}

function wrapPositionAlongAxis(axis: 'x' | 'y', max: number) {
    if (state.position[axis] < -PAC_MAN_RADIUS) {
        state.position[axis] = max + PAC_MAN_RADIUS
    }

    if (state.position[axis] > max + PAC_MAN_RADIUS) {
        state.position[axis] = -PAC_MAN_RADIUS
    }
}

function loop(screen: Screen) {
    screen.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

    updatePlayerPosition()
    updateGhosts()
    eatNearbyDots()
    drawWalls(screen)
    drawDots(screen)
    drawGhosts(screen)
    drawPacMan(screen)

    requestAnimationFrame(() => loop(screen))
}

export default async function main() {
    const container = document.querySelector('.app')
    const canvas = createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT)
    const screen = canvas.getContext('2d')

    screen.imageSmoothingEnabled = false

    screen.fillStyle = '#000'
    state.startTime = Date.now()

    sprites.ghosts = await createSpriteFromImage('./assets/ghost-sprites.png')

    container.appendChild(canvas)

    window.addEventListener('keydown', event => {
        switch (event.key) {
            case 'ArrowUp':
                setQueuedDirection(Direction.UP)
                break
            case 'ArrowDown':
                setQueuedDirection(Direction.DOWN)
                break
            case 'ArrowLeft':
                setQueuedDirection(Direction.LEFT)
                break
            case 'ArrowRight':
                setQueuedDirection(Direction.RIGHT)
                break
                
        }
    })

    for (let i = 0; i < levelLayout.length; i++) {
        const row = levelLayout[i]

        for (let j = 0; j < row.length; j++) {
            if (row[j] === 0) {
                state.dots.push({
                    x: GRID_CELL_SIZE + j * GRID_CELL_SIZE,
                    y: GRID_CELL_SIZE + i * GRID_CELL_SIZE
                })
            }
        }
    }

    loop(screen)
}