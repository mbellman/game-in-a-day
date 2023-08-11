import { createCanvas, createSpriteFromImage, drawSprite, drawSquare, Screen, setAlpha, SpriteSheet } from "./canvas";

const SCREEN_WIDTH = 720
const SCREEN_HEIGHT = 540

const TOTAL_ROAD_SEGMENTS = 50

interface GameState {
    startTime: number
    controls: {
        accelerating: boolean
        steeringLeft: boolean
        steeringRight: boolean
    }
    velocity: number
    xVelocity: number
    deviation: number
    distance: number
}

const sprites: SpriteSheet = {
    road: null,
    car: null,
    hills: null,
    clouds: null,
    tree: null
}

const state: GameState = {
    startTime: 0,
    controls: {
        accelerating: false,
        steeringLeft: false,
        steeringRight: false
    },
    velocity: 0,
    xVelocity: 0,
    deviation: 0,
    distance: 0
}

function getRunningTime() {
    return Date.now() - state.startTime
}

function getRunningTimeInSeconds() {
    return getRunningTime() / 1000
}

function mod(n: number, m: number) {
    return ((n % m) + m) % m;
}

function getRoadCurvature() {
    return Math.sin(state.distance * 0.1)
}

function getBackgroundShift() {
    return Math.cos(state.distance * 0.1) * Math.PI
}

function handleControls() {
    const MAX_VELOCITY = 10

    const isOffroad = Math.abs(state.deviation) > 300
    const steeringFactor = isOffroad ? 5 : 1

    // Handle acceleration
    {
        if (state.controls.accelerating) {
            state.velocity = Math.min(MAX_VELOCITY, state.velocity + 0.1)
        } else {
            state.velocity = Math.max(0, state.velocity - 0.1)
        }
    }

    // Handle steering
    {
        if (state.controls.steeringLeft || state.controls.steeringRight) {
            state.xVelocity = Math.min(MAX_VELOCITY, state.xVelocity + 0.5)
        } else {
            state.xVelocity *= 0.999
        }
    
        if (state.controls.steeringLeft) {
            state.deviation += state.xVelocity * state.velocity / MAX_VELOCITY * steeringFactor
        }
    
        if (state.controls.steeringRight) {
            state.deviation -= state.xVelocity * state.velocity / MAX_VELOCITY * steeringFactor
        }
    }

    if (state.velocity > 0) {
        state.distance += state.velocity * 0.01
        state.deviation += getRoadCurvature() * state.velocity
    }

    if (isOffroad) {
        // Dampen velocity when driving offroad
        state.velocity *= 0.9
    }
}

function drawClouds(screen: Screen) {
    const shift = getBackgroundShift()
    const cameraShift = -shift * 130
    const w = sprites.clouds.width
    const h = sprites.clouds.height

    let xOffset = mod(cameraShift, w)
    let coverage = 0

    while (coverage < SCREEN_WIDTH) {
        const clipWidth = w - xOffset

        drawSprite(screen, sprites.clouds, {
            x: xOffset,
            y: 0,
            width: clipWidth,
            height: h
        }, {
            x: coverage + clipWidth / 2,
            y: 220,
            width: clipWidth,
            height: h
        })

        coverage += clipWidth
        xOffset += clipWidth

        xOffset = xOffset % w
    }
}

function drawHills(screen: Screen) {
    const shift = getBackgroundShift()
    const cameraShift = -shift * 150
    const w = sprites.hills.width
    const h = sprites.hills.height

    let xOffset = mod(cameraShift, w)
    let coverage = 0

    while (coverage < SCREEN_WIDTH) {
        const clipWidth = w - xOffset

        drawSprite(screen, sprites.hills, {
            x: xOffset,
            y: 0,
            width: clipWidth,
            height: h
        }, {
            x: coverage + clipWidth / 2,
            y: 278,
            width: clipWidth,
            height: h
        })

        coverage += clipWidth
        xOffset += clipWidth

        xOffset = xOffset % w
    }
}

function drawRoad(screen: Screen) {
    const baseScale = SCREEN_WIDTH / sprites.road.width
    const STRIP_HEIGHT = 3
    const offset = state.distance * 150

    const curvature = getRoadCurvature()
    const cameraShift = state.deviation

    for (let i = 0; i < TOTAL_ROAD_SEGMENTS; i++) {
        const depth = i / TOTAL_ROAD_SEGMENTS
        const y = SCREEN_HEIGHT - i * STRIP_HEIGHT
        const clipY = (i * STRIP_HEIGHT * (1 + depth * 5) + depth + offset) % (sprites.road.height - STRIP_HEIGHT)
        const scale = baseScale * (1 - depth)
        const dx = (curvature * depth * Math.pow(1 + depth, 2)) * 100

        drawSprite(screen, sprites.road, {
            x: 0,
            y: clipY,
            width: sprites.road.width,
            height: STRIP_HEIGHT
        }, {
            x: SCREEN_WIDTH / 2 + dx + cameraShift,
            y,
            width: sprites.road.width * scale,
            height: STRIP_HEIGHT
        })
    }
}

function drawCar(screen: Screen) {
    const w = sprites.car.width
    const h = sprites.car.height

    drawSprite(screen, sprites.car, {
        x: 0,
        y: 0,
        width: w,
        height: h
    }, {
        x: SCREEN_WIDTH / 2,
        y: 490,
        width: w,
        height: h
    })
}

function drawTrees(screen: Screen) {
    const distance = state.distance
    const w = sprites.tree.width
    const h = sprites.tree.height

    const curvature = getRoadCurvature()
    const cameraShift = state.deviation
    const DISTANCE_FROM_ROAD = 50
    const TOTAL_TREES = 10

    // Left side
    {
        for (let i = TOTAL_TREES; i >= 0; i--) {
            const depth = Math.pow(mod(i - distance, TOTAL_TREES) / TOTAL_TREES, 1/4)
            const scale = (1 - depth) * 3

            const dx = (curvature * depth * Math.pow(1 + depth, 2)) * 100

            drawSprite(screen, sprites.tree, {
                x: 0,
                y: 0,
                width: w,
                height: h
            }, {
                x: SCREEN_WIDTH / 2 - SCREEN_WIDTH / 2 * (1 - depth) + dx + cameraShift - w + DISTANCE_FROM_ROAD * depth,
                y: SCREEN_HEIGHT - 200 + depth * 50,
                width: w * scale,
                height: h * scale
            })
        }
    }

    // Right side
    {
        for (let i = TOTAL_TREES; i >= 0; i--) {
            const depth = Math.pow(mod(i - distance, TOTAL_TREES) / TOTAL_TREES, 1/4)
            const scale = (1 - depth) * 3

            const dx = (curvature * depth * Math.pow(1 + depth, 2)) * 100

            drawSprite(screen, sprites.tree, {
                x: 0,
                y: 0,
                width: w,
                height: h
            }, {
                x: SCREEN_WIDTH / 2 + SCREEN_WIDTH / 2 * (1 - depth) + dx + cameraShift + w - DISTANCE_FROM_ROAD * depth,
                y: SCREEN_HEIGHT - 200 + depth * 50,
                width: w * scale,
                height: h * scale
            })
        }
    }
}

function loop(screen: Screen) {
    screen.fillStyle = '#00f'
    screen.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

    handleControls()

    // Ground
    drawSquare(screen, {
        x: 0, y: SCREEN_HEIGHT - TOTAL_ROAD_SEGMENTS * 3,
        width: SCREEN_WIDTH,
        height: TOTAL_ROAD_SEGMENTS * 3
    }, '#fb5')

    drawClouds(screen)
    drawHills(screen)
    drawRoad(screen)
    drawCar(screen)
    drawTrees(screen)

    requestAnimationFrame(() => loop(screen))
}

export default async function main() {
    const container = document.querySelector('.app')
    const canvas = createCanvas(720, 540)
    const screen = canvas.getContext('2d')

    container.appendChild(canvas)
    
    screen.fillStyle = '#000'
    screen.imageSmoothingEnabled = false

    sprites.road = await createSpriteFromImage('./assets/road.png')
    sprites.car = await createSpriteFromImage('./assets/car.png')
    sprites.hills = await createSpriteFromImage('./assets/hills.png')
    sprites.clouds = await createSpriteFromImage('./assets/clouds.png')
    sprites.tree = await createSpriteFromImage('./assets/tree.png')

    setAlpha(sprites.car, 0, 0, 255)
    setAlpha(sprites.hills, 0, 0, 0)
    setAlpha(sprites.clouds, 0, 0, 0)
    setAlpha(sprites.tree, 0, 0, 0)

    state.startTime = Date.now()

    window.addEventListener('keydown', e => {
        switch (e.key) {
            case ' ':
                state.controls.accelerating = true
                break
            case 'ArrowLeft':
                state.controls.steeringLeft = true
                break
            case 'ArrowRight':
                state.controls.steeringRight = true
                break            
        }
    })

    window.addEventListener('keyup', e => {
        switch (e.key) {
            case ' ':
                state.controls.accelerating = false
                break
            case 'ArrowLeft':
                state.controls.steeringLeft = false
                break
            case 'ArrowRight':
                state.controls.steeringRight = false
                break            
        }
    })

    loop(screen)
}