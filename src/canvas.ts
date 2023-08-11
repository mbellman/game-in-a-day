export interface Position {
    x: number
    y: number
}

export interface Region extends Position {
    width: number
    height: number
}

export type Sprite = HTMLCanvasElement
export type Screen = CanvasRenderingContext2D
export type SpriteSheet = Record<string, Sprite>
export type ClipMap = Record<string, Region>

export interface DrawSpriteParams extends Partial<Region> {
    rotation?: number
}

export interface DrawArcParams extends Partial<Position> {
    radius?: number
    angle?: number
    rotation?: number
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')

    canvas.width = width
    canvas.height = height

    return canvas
}

export async function createSpriteFromImage(imageUrl: string): Promise<Sprite> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const image = new Image()

    image.src = imageUrl

    return new Promise(resolve => {
        image.onload = () => {
            canvas.width = image.width
            canvas.height = image.height
    
            ctx.drawImage(image, 0, 0)

            resolve(canvas)
        }
    })
}

export function setAlpha(sprite: Sprite, r: number, g: number, b: number) {
    const ctx = sprite.getContext('2d')
    const imageData = ctx.getImageData(0, 0, sprite.width, sprite.height)
    const pixels = imageData.data

    for (let y = 0; y < sprite.height; y++) {
        for (let x = 0; x < sprite.width; x++) {
            const index = y * 4 * sprite.width + x * 4

            if (pixels[index] === r && pixels[index + 1] === g && pixels[index + 2] === b) {
                pixels[index + 3] = 0
            }
        }
    }

    ctx.putImageData(imageData, 0, 0)
}

export function drawSquare(screen: Screen, region: Region, color: string) {
    screen.fillStyle = color

    screen.fillRect(region.x, region.y, region.width, region.height)

    screen.fillStyle = '#000'
}

export function drawArc(screen: Screen, params: DrawArcParams, color: string) {
    const {
        x = 0,
        y = 0,
        radius = 10,
        angle = Math.PI * 2,
        rotation = 0
    } = params

    screen.save()

    screen.fillStyle = color

    screen.translate(x, y)
    screen.rotate(rotation)
    screen.beginPath()
    screen.arc(0, 0, radius, 0, angle)
    screen.stroke()
    screen.fill()

    screen.restore()
}

export function drawSprite(screen: Screen, sprite: Sprite, clip: Region, params: DrawSpriteParams) {
    const x = params.x || 0
    const y = params.y || 0
    const width = params.width || clip.width
    const height = params.height || clip.height
    const rotation = params.rotation || 0
    
    screen.save()

    screen.translate(x, y)
    screen.rotate(rotation)
    screen.drawImage(sprite, clip.x, clip.y, clip.width, clip.height, -width / 2, -height / 2, width, height)

    screen.restore()
}