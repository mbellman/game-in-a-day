import { Position, Region, SpriteSheet, Sprite, ClipMap, Screen, createCanvas, drawSprite, drawSquare, createSpriteFromImage } from './canvas'

const SCREEN_WIDTH = 540
const SCREEN_HEIGHT = 720

const SHIP_WIDTH = 50
const SHIP_HEIGHT = 50
const SHIP_SPEED = 3

const ENEMY_WIDTH = 50
const ENEMY_HEIGHT = 40
const ENEMY_SPEED = 8

const BULLET_FIRE_COOLDOWN = 100

type GridCell = [number, number]

interface Star extends Position {
    speed: number
    color: string
}

interface KeyState {
    UP: boolean
    DOWN: boolean
    RIGHT: boolean
    LEFT: boolean
}

enum EnemyType {
    ENEMY_1,
    ENEMY_2,
    ENEMY_3,
    ENEMY_4
}

enum FlightPhase {
    ENTRY,
    TURN,
    TARGET,
    GRID
}

interface EnemySpawn {
    type: EnemyType
    spawnPosition: Position
    angle: number
    spawnTime: number
}

interface Enemy {
    type: EnemyType
    spawnTime: number
    position: Position
    targetGridCell: GridCell
    angle: number
    phase: FlightPhase
    phaseStartTime: number
    isMoving: boolean
}

interface Grid {
    cells: number[][]
    scale: number
    offset: Position
}

interface GameState {
    screen: Screen
    startTime: number
    lastBulletTime: number
    didFireBullet: boolean
    keys: KeyState
    stars: Star[]
    bullets: Position[]
    enemies: Enemy[]
    enemySpawns: EnemySpawn[]
    grid: Grid
    shipPosition: Position
}

const sprites: SpriteSheet = {
    ship: null,
    enemies: null
}

const clipMap: ClipMap = {
    ship: {
        x: 0,
        y: 0,
        width: 136,
        height: 152
    },
    enemy1: {
        x: 0,
        y: 0,
        width: 103,
        height: 79
    }
}

function createEnemySpawn(type: EnemyType, angle: number, time: number, position: Position): EnemySpawn {
    return {
        type,
        spawnPosition: position,
        spawnTime: time,
        angle: toRadians(angle)
    }
}

const stages: Array<EnemySpawn[]> = [
    // Level 1
    [
        createEnemySpawn(EnemyType.ENEMY_1, 135, 0, { x: 0, y: 100 }),
        createEnemySpawn(EnemyType.ENEMY_1, 135, 500, { x: 0, y: 100 }),
        createEnemySpawn(EnemyType.ENEMY_1, 135, 1000, { x: 0, y: 100 }),
        createEnemySpawn(EnemyType.ENEMY_1, 135, 1500, { x: 0, y: 100 }),
        createEnemySpawn(EnemyType.ENEMY_1, 135, 2000, { x: 0, y: 100 }),

        createEnemySpawn(EnemyType.ENEMY_1, -135, 5000, { x: SCREEN_WIDTH, y: 100 }),
        createEnemySpawn(EnemyType.ENEMY_1, -135, 5500, { x: SCREEN_WIDTH, y: 100 }),
        createEnemySpawn(EnemyType.ENEMY_1, -135, 6000, { x: SCREEN_WIDTH, y: 100 }),
        createEnemySpawn(EnemyType.ENEMY_1, -135, 6500, { x: SCREEN_WIDTH, y: 100 }),
        createEnemySpawn(EnemyType.ENEMY_1, -135, 7000, { x: SCREEN_WIDTH, y: 100 }),
    ]
]

const state: GameState = {
    startTime: 0,
    lastBulletTime: 0,
    didFireBullet: false,
    screen: null,
    keys: {
        UP: false,
        DOWN: false,
        RIGHT: false,
        LEFT: false
    },
    stars: [],
    bullets: [],
    enemies: [],
    enemySpawns: [],
    grid: {
        cells: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ],
        scale: 1,
        offset: {
            x: 0,
            y: 0
        }
    },
    shipPosition: {
        x: SCREEN_WIDTH / 2,
        y: 500
    }
}

function timeSince(time: number) {
    return Date.now() - time
}

function drawShip(screen: Screen) {
    drawSprite(screen, sprites.ship, clipMap.ship, {
        x: state.shipPosition.x,
        y: state.shipPosition.y,
        width: SHIP_WIDTH,
        height: SHIP_HEIGHT
    })
}

function drawEnemies(screen: Screen) {
    for (const enemy of state.enemies) {
        drawSprite(screen, sprites.enemies, clipMap.enemy1, {
            x: enemy.position.x,
            y: enemy.position.y,
            width: ENEMY_WIDTH,
            height: ENEMY_HEIGHT,
            rotation: enemy.angle
        })
    }
}

function drawStarfield(screen: Screen) {
    const offset = timeSince(state.startTime) / 20

    for (let i = 0; i < state.stars.length; i++) {
        const star = state.stars[i]
        const r = 255 * (star.speed / 5) * ((1 + Math.sin(i)) / 2)
        const g = 200 * (star.speed / 5) * ((1 + Math.sin(i + 1)) / 2)
        const b = 255 * (star.speed / 5) * ((1 + Math.sin(i + 2)) / 2)

        drawSquare(screen, {
            x: star.x,
            y: (star.y + offset * star.speed) % SCREEN_HEIGHT,
            width: 4,
            height: 4
        }, `rgb(${r},${g},${b})`)
    }
}

function drawBullets(screen: Screen) {
    for (const bullet of state.bullets) {
        drawSquare(screen, {
            x: bullet.x,
            y: bullet.y,
            width: 4,
            height: 12
        }, '#fff')
    }
}

function readInput() {
    if (state.keys.LEFT) {
        state.shipPosition.x -= SHIP_SPEED
    }

    if (state.keys.RIGHT) {
        state.shipPosition.x += SHIP_SPEED
    }

    if (state.keys.UP) {
        state.shipPosition.y -= SHIP_SPEED
    }

    if (state.keys.DOWN) {
        state.shipPosition.y += SHIP_SPEED
    }
}

function updateBullets() {
    for (const bullet of state.bullets) {
        bullet.y -= 10
    }
}

function lerp(a: number, b: number, alpha: number): number {
    return a + (b - a) * alpha
}

function lerpCircular(a: number, b: number, alpha: number, maxRange: number) {
    const range = b - a;

    if (range > maxRange) {
        a += maxRange * 2;
    } else if (range < -maxRange) {
        a -= maxRange * 2;
    }

    return a + (b - a) * alpha;
}

function toRadians(angle: number) {
    return angle * (Math.PI / 180)
}

function collision(a: Region, b: Region): boolean {
    return !(
        (a.x + a.width) < b.x ||
        a.x > (b.x + b.width) ||
        (a.y + a.height) < b.y ||
        a.y > (b.y + b.height)
    )
}

function handleBulletCollisions() {
    for (let i = 0; i < state.enemies.length; i++) {
        const enemy = state.enemies[i]

        const enemyHitbox: Region = {
            x: enemy.position.x,
            y: enemy.position.y,
            width: ENEMY_WIDTH,
            height: ENEMY_HEIGHT
        }

        for (const bullet of state.bullets) {
            const bulletHitbox: Region = {
                x: bullet.x,
                y: bullet.y,
                width: 4,
                height: 12
            }

            if (collision(enemyHitbox, bulletHitbox)) {
                state.enemies.splice(i, 1)

                break
            }
        }
    }
}

function getGridCellPosition(gridCell: GridCell): Position {
    const center: Position = {
        x: SCREEN_WIDTH / 2,
        y: 200
    }

    const xOffset = ((gridCell[0] - 3.5) * 60)
    const yOffset = ((gridCell[1] - 1.5) * 50)

    return {
        x: center.x + xOffset * state.grid.scale + state.grid.offset.x,
        y: center.y + yOffset * state.grid.scale + state.grid.offset.y
    }
}

function getTargetGridCell(): GridCell {
    let x = 0
    let y = 0

    while (state.grid.cells[y][x] !== 0) {
        x = Math.floor(Math.random() * 8)
        y = Math.floor(Math.random() * 4)
    }

    return [ x, y ]
}

function updateEnemies() {
    for (const enemy of state.enemies) {
        if (enemy.isMoving) {
            const targetPosition = getGridCellPosition(enemy.targetGridCell)

            if (enemy.phase === FlightPhase.GRID) {
                enemy.position = targetPosition
                enemy.angle = lerpCircular(enemy.angle, 0, 0.5, Math.PI)
            } else if (enemy.phase === FlightPhase.TARGET) {
                const offset: Position = {
                    x: enemy.position.x - targetPosition.x,
                    y: enemy.position.y - targetPosition.y
                }

                if (offset.x < 5 && offset.y < 5) {
                    enemy.phase = FlightPhase.GRID
                    enemy.phaseStartTime = Date.now()
                }

                let alpha = timeSince(enemy.phaseStartTime) / 1000
                if (alpha > 1) alpha = 1

                enemy.angle = lerpCircular(enemy.angle, Math.atan2(offset.y, offset.x) - toRadians(90), alpha, Math.PI)
            } else if (enemy.position.y < 400) {
                if (enemy.phase === FlightPhase.TURN) {
                    enemy.phase = FlightPhase.TARGET
                    enemy.phaseStartTime = Date.now()
                    enemy.targetGridCell = getTargetGridCell()

                    state.grid.cells[enemy.targetGridCell[1]][enemy.targetGridCell[0]] = 1
                }
            } else {
                enemy.phase = FlightPhase.TURN
                enemy.phaseStartTime = Date.now()
                enemy.angle += 0.01 * ENEMY_SPEED
            }

            const dx = Math.sin(enemy.angle)
            const dy = -Math.cos(enemy.angle)

            enemy.position.x += dx * ENEMY_SPEED
            enemy.position.y += dy * ENEMY_SPEED
        } else {
            // Stay in grid spot
        }
    }
}

function updateGrid() {
    const alpha = timeSince(state.startTime) / 1000

    state.grid.offset.x = Math.sin(alpha) * 50
    state.grid.scale = 1 + Math.sin(alpha * 0.5) * 0.2
}

function spawnEnemies() {
    let nextEnemy = state.enemySpawns[0]
    const runningTime = timeSince(state.startTime)

    while (runningTime > nextEnemy?.spawnTime) {
        spawnEnemy({
            type: nextEnemy.type,
            spawnTime: Date.now(),
            position: nextEnemy.spawnPosition,
            targetGridCell: [0, 0],
            angle: nextEnemy.angle,
            phaseStartTime: 0,
            phase: FlightPhase.ENTRY,
            isMoving: true
        })

        state.enemySpawns.splice(0, 1)

        nextEnemy = state.enemySpawns[0]
    }
}

function updateEntities() {
    updateBullets()
    handleBulletCollisions()
    updateEnemies()
    updateGrid()

    spawnEnemies()
}

function maybeFireBullet() {
    if (state.didFireBullet || timeSince(state.lastBulletTime) < BULLET_FIRE_COOLDOWN) {
        return
    }

    state.lastBulletTime = Date.now()
    state.didFireBullet = true

    state.bullets.push({
        x: state.shipPosition.x - 2,
        y: state.shipPosition.y
    })
}

function spawnEnemy(enemy: Enemy) {
    state.enemies.push(enemy)
}

function renderScene(screen: Screen) {
    drawStarfield(screen)
    drawBullets(screen)
    drawShip(screen)
    drawEnemies(screen)
}

function loop() {
    const { screen } = state

    screen.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
    
    readInput()
    updateEntities()
    renderScene(screen)

    requestAnimationFrame(loop)
}

export default async function main() {
    const container = document.querySelector('.app')
    const canvas = createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT)
    const screen = canvas.getContext('2d')

    screen.fillStyle = '#000'

    state.screen = screen
    state.startTime = Date.now()

    container.appendChild(canvas)

    sprites.ship = await createSpriteFromImage('./assets/ship-sprite.png')
    sprites.enemies = await createSpriteFromImage('./assets/enemy-sprites.png')

    for (let i = 0; i < 200; i++) {
        state.stars.push({
            x: Math.random() * SCREEN_WIDTH,
            y: Math.random() * SCREEN_HEIGHT,
            speed: 1 + Math.random() * 5,
            color: '#fff'
        })
    }

    state.enemySpawns = stages[0]

    window.addEventListener('keydown', event => {
        switch (event.key) {
            case 'ArrowUp':
                state.keys.UP = true
                break
            case 'ArrowDown':
                state.keys.DOWN = true
                break
            case 'ArrowLeft':
                state.keys.LEFT = true
                break
            case 'ArrowRight':
                state.keys.RIGHT = true
                break
            case ' ':
                maybeFireBullet()
                break;
                
        }
    })

    window.addEventListener('keyup', event => {
        switch (event.key) {
            case 'ArrowUp':
                state.keys.UP = false
                break
            case 'ArrowDown':
                state.keys.DOWN = false
                break
            case 'ArrowLeft':
                state.keys.LEFT = false
                break
            case 'ArrowRight':
                state.keys.RIGHT = false
                break
            case ' ':
                state.didFireBullet = false
                break
        }
    })

    loop()
}