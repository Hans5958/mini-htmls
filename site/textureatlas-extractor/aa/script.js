/**
 * References:
 * - https://github.com/Dot-Stuff/flxanimate
 * - https://github.com/Gamua/Starling-Extension-Adobe-Animate
 * - https://github.com/PluieElectrique/texture-atlas-renderer
 */

import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3/+esm'
import saveAs from 'https://cdn.jsdelivr.net/npm/file-saver@2/+esm'

import {
	createTimer, createStatusUpdater, readFileAsText, loadImageSource,
	sanitizeFileName, createElementCanvas as createCanvas, canvasToBlob,
	flagFormat, zipToBlob, drawAtlasPreview, drawFrameOnCanvas, drawPreviewPair,
} from '../extractor-core.js'

const mainForm = document.querySelector('#form-main')
const frameCanvas = document.querySelector('#canvas-frame')
const atlasCanvas = document.querySelector('#canvas-atlas')
const animationSelect = document.querySelector('#selectAnimation')
const animationSelectGroup = document.querySelector('#animation-select-group')
const frameSlider = document.querySelector('#inputFrame')
const frameLabel = document.querySelector('#frame-label')

let showPreviewFrame = null
let previewJobs = []
let previewRenderer = null
let previewJobIndex = 0
let textureImage = null
let spriteAtlas = null

frameSlider.addEventListener('input', () => {
	if (showPreviewFrame) showPreviewFrame(+frameSlider.value)
})

// Redraw both previews when the atlas details element is opened
const atlasCanvasDetails = document.querySelector('#canvas-atlas').closest('details')
if (atlasCanvasDetails) {
	atlasCanvasDetails.addEventListener('toggle', () => {
		if (atlasCanvasDetails.open && showPreviewFrame) {
			showPreviewFrame(+frameSlider.value)
		}
	})
	// Force initial draw if details is already open (e.g. after export)
	if (atlasCanvasDetails.open && showPreviewFrame) {
		showPreviewFrame(+frameSlider.value)
	}
}

const showPreviewAnimation = index => {
	const job = previewJobs[index]
	if (!job || !previewRenderer) return

	previewJobIndex = index
	previewRenderer.canvasWidth = job.width
	previewRenderer.canvasHeight = job.height
	previewRenderer.baseTransform = job.baseTransform

	frameCanvas.width = job.width
	frameCanvas.height = job.height
	frameSlider.max = job.length - 1

	const current = Math.min(Math.max(+frameSlider.value || 0, 0), job.length - 1)
	frameSlider.value = current
	if (showPreviewFrame) showPreviewFrame(current)
}

animationSelect.addEventListener('change', () => {
	showPreviewAnimation(+animationSelect.value)
})

// Collect the sprite names actually drawn on one frame of an animation key.
// Walks the same timeline path as renderInto(), so it matches what the user
// sees rather than every sprite used anywhere in the animation.
const collectUsedSpriteRects = (renderer, key, frameIdx, spriteAtlas) => {
	const used = new Set()
	const walk = (symbolName, age) => {
		for (const layer of renderer.timelines.get(symbolName) || []) {
			const frame = renderer.frameAt(layer, age)
			if (!frame) continue
			for (const element of frame.elements || []) {
				if (element.symbolInstance) {
					const instance = element.symbolInstance
					if (!renderer.timelines.has(instance.symbolName) && instance.bitmap) {
						used.add(instance.bitmap.name)
					} else if (renderer.timelines.has(instance.symbolName)) {
						walk(instance.symbolName, renderer.getChildFrame(instance, age - frame.index))
					}
				} else if (element.atlasSpriteInstance) {
					used.add(element.atlasSpriteInstance.name)
				}
			}
		}
	}
	walk(key, frameIdx)
	return [...used].map(name => {
		const sprite = spriteAtlas.spriteInfo[name]
		return sprite ? { x: sprite.x, y: sprite.y, w: sprite.w, h: sprite.h } : null
	}).filter(Boolean)
}

const timer = createTimer()

const updateStatus = createStatusUpdater('#status-text')

const clampChannel = value => value < 0 ? 0 : value > 255 ? 255 : value | 0

const hexToRgb = hex => {
	let value = hex.replace('#', '')
	if (value.length === 3) value = value.split('').map(c => c + c).join('')
	return [
		parseInt(value.substring(0, 2), 16),
		parseInt(value.substring(2, 4), 16),
		parseInt(value.substring(4, 6), 16)
	]
}

const KEY_ALIASES = {
	// Long names
	ANIMATION: 'animation',
	AlphaMultiplier: 'alphaMultiplier',
	AlphaOffset: 'alphaOffset',
	ATLAS_SPRITE_instance: 'atlasSpriteInstance',
	BlueMultiplier: 'blueMultiplier',
	BlueOffset: 'blueOffset',
	Brightness: 'brightness',
	DecomposedMatrix: 'decomposedMatrix',
	Frames: 'frames',
	framerate: 'frameRate',
	GreenMultiplier: 'greenMultiplier',
	GreenOffset: 'greenOffset',
	Instance_Name: 'instanceName',
	Layer_name: 'layerName',
	Layer_type: 'layerType',
	LAYERS: 'layers',
	Matrix3D: 'matrix3D',
	Position: 'position',
	RedMultiplier: 'redMultiplier',
	RedOffset: 'redOffset',
	Rotation: 'rotation',
	Scaling: 'scaling',
	SYMBOL_DICTIONARY: 'symbolDictionary',
	SYMBOL_Instance: 'symbolInstance',
	SYMBOL_name: 'symbolName',
	Symbols: 'symbols',
	TIMELINE: 'timeline',
	TintColor: 'tintColor',
	TintMultiplier: 'tintMultiplier',
	Clipped_by: 'clippedBy',

	// Short names
	AN: 'animation',
	AM: 'alphaMultiplier',
	AO: 'alphaOffset',
	ASI: 'atlasSpriteInstance',
	BM: 'blueMultiplier',
	BO: 'blueOffset',
	BRT: 'brightness',
	C: 'color',
	Clpb: 'clippedBy',
	DU: 'duration',
	E: 'elements',
	FF: 'firstFrame',
	FR: 'frames',
	FRT: 'frameRate',
	GM: 'greenMultiplier',
	GO: 'greenOffset',
	I: 'index',
	IN: 'instanceName',
	L: 'layers',
	LN: 'layerName',
	LP: 'loop',
	LT: 'layerType',
	M: 'mode',
	M3D: 'matrix3D',
	Matrix: 'matrix3D',
	MD: 'metadata',
	MX: 'matrix3D',
	N: 'name',
	POS: 'position',
	RM: 'redMultiplier',
	RO: 'redOffset',
	S: 'symbols',
	SD: 'symbolDictionary',
	SI: 'symbolInstance',
	SN: 'symbolName',
	ST: 'symbolType',
	TC: 'tintColor',
	TL: 'timeline',
	TM: 'tintMultiplier',
	TRP: 'transformationPoint'
}

const normalizeKeys = value => {
	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) value[i] = normalizeKeys(value[i])
		return value
	}
	if (!value || typeof value !== 'object') return value

	for (const key of Object.keys(value)) value[key] = normalizeKeys(value[key])
	for (const [key, alias] of Object.entries(KEY_ALIASES)) {
		if (key in value && !(alias in value)) value[alias] = value[key]
	}
	return value
}

const detectExporter = animationData => {
	const metadata = animationData?.metadata || {}
	const version = String(metadata.version ?? metadata.V ?? '')
	if (/^BTA/i.test(version)) return 'betterTextureAtlas'
	if (metadata.backgroundColor !== undefined || metadata.BGC !== undefined) return 'betterTextureAtlas'
	return 'adobeAnimate'
}

const pick = (object, ...keys) => {
	for (const key of keys) {
		if (object && object[key] !== undefined) return object[key]
	}
	return undefined
}
class TransformMatrix {
	constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
		this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f
	}

	static fromAnimate(matrix) {
		if (Array.isArray(matrix)) {
			if (matrix.length <= 6) {
				return new TransformMatrix(matrix[0] ?? 1, matrix[1] ?? 0, matrix[2] ?? 0, matrix[3] ?? 1, matrix[4] ?? 0, matrix[5] ?? 0)
			}
			return new TransformMatrix(matrix[0], matrix[1], matrix[4], matrix[5], matrix[12], matrix[13])
		}
		if (matrix && typeof matrix === 'object') {
			return new TransformMatrix(
				matrix.m00 ?? 1, matrix.m01 ?? 0, matrix.m10 ?? 0, matrix.m11 ?? 1, matrix.m30 ?? 0, matrix.m31 ?? 0
			)
		}
		return new TransformMatrix()
	}

	static translate(x, y) {
		return new TransformMatrix(1, 0, 0, 1, x, y)
	}

	multiply(other) {
		return new TransformMatrix(
			this.a * other.a + this.c * other.b,
			this.b * other.a + this.d * other.b,
			this.a * other.c + this.c * other.d,
			this.b * other.c + this.d * other.d,
			this.a * other.e + this.c * other.f + this.e,
			this.b * other.e + this.d * other.f + this.f
		)
	}

	apply(x, y) {
		return [this.a * x + this.c * y + this.e, this.b * x + this.d * y + this.f]
	}

	setTransform(ctx) {
		ctx.setTransform(this.a, this.b, this.c, this.d, this.e, this.f)
	}

	key() {
		return [this.a, this.b, this.c, this.d, this.e, this.f].join(',')
	}
}

class ColorEffect {
	constructor(multiplier = null, offset = null) {
		this.multiplier = multiplier
		this.offset = offset
	}

	static parse(effect) {
		if (!effect) return new ColorEffect()

		const mode = String(effect.mode || '').toUpperCase()
		if (mode === 'AD' || mode === 'ADVANCED') {
			// Advanced
			return new ColorEffect(
				[effect.redMultiplier, effect.greenMultiplier, effect.blueMultiplier, effect.alphaMultiplier],
				[effect.redOffset, effect.greenOffset, effect.blueOffset, effect.alphaOffset]
			)
		} else if (mode === 'CA' || mode === 'ALPHA') {
			// Alpha
			return new ColorEffect([1, 1, 1, effect.alphaMultiplier], [0, 0, 0, 0])
		} else if (mode === 'CBRT' || mode === 'BRIGHTNESS') {
			// Brightness
			const brightness = effect.brightness
			if (brightness < 0) {
				return new ColorEffect([1 + brightness, 1 + brightness, 1 + brightness, 1], [0, 0, 0, 0])
			}
			return new ColorEffect(
				[1 - brightness, 1 - brightness, 1 - brightness, 1],
				[brightness * 255, brightness * 255, brightness * 255, 0]
			)
		} else if (mode === 'T' || mode === 'TINT') {
			// Tint
			const tint = hexToRgb(effect.tintColor)
			const amount = effect.tintMultiplier
			return new ColorEffect(
				[1 - amount, 1 - amount, 1 - amount, 1],
				[tint[0] * amount, tint[1] * amount, tint[2] * amount, 0]
			)
		}

		console.warn('Unsupported color effect:', effect)
		return new ColorEffect()
	}

	combine(other) {
		if (!this.multiplier) return other
		if (!other.multiplier) return this
		return new ColorEffect(
			[0, 1, 2, 3].map(i => this.multiplier[i] * other.multiplier[i]),
			[0, 1, 2, 3].map(i => this.multiplier[i] * other.offset[i] + this.offset[i])
		)
	}

	get isEmpty() {
		return !this.multiplier
	}

	key() {
		return this.multiplier ? this.multiplier.join(',') + '|' + this.offset.join(',') : ''
	}

	apply(canvas) {
		if (!this.multiplier) return canvas

		const ctx = canvas.getContext('2d')
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		const data = imageData.data
		const [mr, mg, mb, ma] = this.multiplier
		const [orr, og, ob, oa] = this.offset

		for (let i = 0; i < data.length; i += 4) {
			data[i] = clampChannel(data[i] * mr + orr)
			data[i + 1] = clampChannel(data[i + 1] * mg + og)
			data[i + 2] = clampChannel(data[i + 2] * mb + ob)
			data[i + 3] = clampChannel(data[i + 3] * ma + oa)
		}

		ctx.putImageData(imageData, 0, 0)
		return canvas
	}
}

const applyMask = (baseCanvas, maskedCanvas, maskCanvas) => {
	const width = maskedCanvas.width
	const height = maskedCanvas.height

	const maskData = maskCanvas.getContext('2d').getImageData(0, 0, width, height).data

	let maxAlpha = 0
	for (let i = 3; i < maskData.length; i += 4) {
		if (maskData[i] > maxAlpha) maxAlpha = maskData[i]
	}

	if (maxAlpha === 0) {
		console.warn('A mask is fully transparent and cannot be applied.')
		baseCanvas.getContext('2d').drawImage(maskedCanvas, 0, 0)
		return
	}

	const maskedCtx = maskedCanvas.getContext('2d')
	const maskedImageData = maskedCtx.getImageData(0, 0, width, height)
	const maskedData = maskedImageData.data

	for (let i = 0; i < maskedData.length; i += 4) {
		const maskAlpha = (maskData[i + 3] / maxAlpha * 255) | 0
		maskedData[i + 3] = (maskedData[i + 3] * maskAlpha / 255) | 0
	}

	maskedCtx.putImageData(maskedImageData, 0, 0)
	baseCanvas.getContext('2d').drawImage(maskedCanvas, 0, 0)
}

class SpriteAtlas {
	constructor(spritemap, image) {
		this.image = image
		this.spriteInfo = {}
		const sprites = pick(pick(spritemap, 'ATLAS', 'atlas'), 'SPRITES', 'sprites') || []
		for (const entry of sprites) {
			const sprite = pick(entry, 'SPRITE', 'sprite') || entry
			this.spriteInfo[sprite.name] = sprite
		}
		// Cap the cache by pixels, since large frames can pin a lot of memory
		this.cache = new Map()
		this.cachePixels = 0
		this.cachePixelLimit = 64 * 1024 * 1024
	}

	cropSprite(name) {
		const sprite = this.spriteInfo[name]
		const canvas = createCanvas(sprite.rotated ? sprite.h : sprite.w, sprite.rotated ? sprite.w : sprite.h)
		const ctx = canvas.getContext('2d')
		if (sprite.rotated) {
			ctx.translate(0, sprite.w)
			ctx.rotate(-Math.PI / 2)
		}
		ctx.drawImage(this.image, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h)
		return canvas
	}

	getSprite(name, m, color, canvasWidth, canvasHeight) {
		const key = name + '|' + m.key() + '|' + color.key() + '|' + canvasWidth + 'x' + canvasHeight
		if (this.cache.has(key)) return this.cache.get(key)

		const result = this.renderSprite(name, m, color, canvasWidth, canvasHeight)
		const pixels = result ? result.canvas.width * result.canvas.height : 0

		while (this.cache.size && this.cachePixels + pixels > this.cachePixelLimit) {
			const oldestKey = this.cache.keys().next().value
			const oldest = this.cache.get(oldestKey)
			if (oldest) this.cachePixels -= oldest.canvas.width * oldest.canvas.height
			this.cache.delete(oldestKey)
		}

		this.cache.set(key, result)
		this.cachePixels += pixels
		return result
	}

	renderSprite(name, m, color, canvasWidth, canvasHeight) {
		if (!(name in this.spriteInfo)) {
			console.warn('Sprite not found in the atlas:', name)
			return null
		}

		let sprite = this.cropSprite(name)
		if (!color.isEmpty) sprite = color.apply(sprite)

		const corners = [[0, 0], [sprite.width, 0], [0, sprite.height], [sprite.width, sprite.height]]
			.map(([x, y]) => m.apply(x, y))

		let minX = Math.floor(Math.min(...corners.map(c => c[0])))
		let maxX = Math.ceil(Math.max(...corners.map(c => c[0])))
		let minY = Math.floor(Math.min(...corners.map(c => c[1])))
		let maxY = Math.ceil(Math.max(...corners.map(c => c[1])))

		if (maxX < 0 || canvasWidth <= minX || maxY < 0 || canvasHeight <= minY) return null

		minX = Math.max(0, minX)
		maxX = Math.min(canvasWidth - 1, maxX)
		minY = Math.max(0, minY)
		maxY = Math.min(canvasHeight - 1, maxY)

		const canvas = createCanvas(maxX - minX + 1, maxY - minY + 1)
		const ctx = canvas.getContext('2d')
		ctx.imageSmoothingEnabled = true
		TransformMatrix.translate(-minX, -minY).multiply(m).setTransform(ctx)
		ctx.drawImage(sprite, 0, 0)

		return { canvas, x: minX, y: minY }
	}
}

class Renderer {
	constructor(animation, spriteAtlas) {
		this.spriteAtlas = spriteAtlas
		this.canvasWidth = 1
		this.canvasHeight = 1
		this.baseTransform = new TransformMatrix()

		this.warned = new Set()
		this.timelines = new Map()
		for (const symbol of animation.symbolDictionary?.symbols || []) {
			this.timelines.set(symbol.symbolName, symbol.timeline?.layers || [])
		}
		// The main animation timeline is stored under null.
		this.timelines.set(null, animation.animation?.timeline?.layers || [])
	}

	getLength(name = null) {
		let length = 0
		for (const layer of this.timelines.get(name) || []) {
			const frames = layer.frames
			if (frames && frames.length) {
				const last = frames[frames.length - 1]
				length = Math.max(length, last.index + last.duration)
			}
		}
		return length
	}

	// Some exporters keep every animation as a symbol on a single root frame,
	// so the root timeline only has one frame. In that case the symbols are the
	// animations, and exporting the root would just stack them all together.
	getAnimations() {
		const rootLength = this.getLength(null)
		if (rootLength > 1) return [{ key: null, name: null, length: rootLength }]

		const layers = this.timelines.get(null) || []
		const singleRootFrame = layers.every(layer => (layer.frames?.length || 0) <= 1)

		const symbols = new Map()
		if (singleRootFrame) {
			for (const layer of layers) {
				for (const element of layer.frames?.[0]?.elements || []) {
					const instance = element.symbolInstance
					if (!instance?.symbolName || symbols.has(instance.symbolName)) continue

					const length = this.getLength(instance.symbolName)
					if (length > 1) symbols.set(instance.symbolName, length)
				}
			}
		}

		if (symbols.size >= 2) return [...symbols].map(([name, length]) => ({ key: name, name, length }))
		if (symbols.size === 1) {
			const [name, length] = symbols.entries().next().value
			return [{ key: name, name, length }]
		}
		return rootLength > 0 ? [{ key: null, name: null, length: rootLength }] : []
	}

	frameAt(layer, frameIdx) {
		const frames = layer.frames
		if (!frames || !frames.length) return null

		let low = 0
		let high = frames.length - 1
		while (low !== high) {
			const mid = (low + high + 1) >> 1
			if (frameIdx < frames[mid].index) high = mid - 1
			else low = mid
		}

		const frame = frames[low]
		return (frame.index <= frameIdx && frameIdx < frame.index + frame.duration) ? frame : null
	}

	newCanvas() {
		return createCanvas(this.canvasWidth, this.canvasHeight)
	}

	warnOnce(message) {
		if (this.warned.has(message)) return
		this.warned.add(message)
		console.warn(message)
	}

	getElementMatrix(instance) {
		const matrix = TransformMatrix.fromAnimate(instance.matrix3D)
		const position = instance.position
		if (position) {
			matrix.e += position.x || 0
			matrix.f += position.y || 0
		}
		return matrix
	}

	getBitmapMatrix(instance, m) {
		const elementMatrix = m.multiply(this.getElementMatrix(instance))
		const position = instance.bitmap.position || instance.bitmap.decomposedMatrix?.position
		return position
			? elementMatrix.multiply(TransformMatrix.translate(position.x || 0, position.y || 0))
			: elementMatrix
	}

	drawSprite(ctx, canvas, name, matrix, color) {
		const sprite = this.spriteAtlas.getSprite(name, matrix, color, canvas.width, canvas.height)
		if (sprite) ctx.drawImage(sprite.canvas, sprite.x, sprite.y)
	}

	getChildFrame(instance, frameAge) {
		const firstFrame = +instance.firstFrame || 0
		const rawLoop = String(instance.loop || 'LP').toUpperCase()
		const reversed = rawLoop.length > 1 && rawLoop.endsWith('R')
		const loop = reversed ? rawLoop.slice(0, -1) : rawLoop
		if (reversed) this.warnOnce('Reverse playback is not supported, playing forwards instead: ' + rawLoop)

		if (loop === 'SF' || loop === 'SINGLEFRAME') return firstFrame

		const length = this.getLength(instance.symbolName) || 1
		const frame = firstFrame + frameAge
		if (loop === 'PO' || loop === 'PLAYONCE') return Math.min(frame, length - 1)
		return ((frame % length) + length) % length
	}

	renderSymbol(name, frameIdx) {
		const canvas = this.newCanvas()
		this.renderInto(canvas, name, frameIdx, this.baseTransform, new ColorEffect())
		return canvas
	}

	renderInto(canvas, name, frameIdx, m, color) {
		const layers = [...this.timelines.get(name) || []].reverse()

		const canvasStack = []

		for (const layer of layers) {
			const frame = this.frameAt(layer, frameIdx)
			if (!frame) continue

			if (('clippedBy' in layer && !canvasStack.length) || layer.layerType === 'Clp') {
				canvasStack.push(canvas)
				canvas = this.newCanvas()
			}

			const ctx = canvas.getContext('2d')

			for (const element of frame.elements || []) {
				if (element.symbolInstance) {
					const instance = element.symbolInstance
					const elementColor = instance.color ? color.combine(ColorEffect.parse(instance.color)) : color

					// Older Animate exports inline bitmaps in symbol instances instead
					// of using a symbol dictionary or ATLAS_SPRITE_instance entries.
					if (!this.timelines.has(instance.symbolName) && instance.bitmap) {
						this.drawSprite(ctx, canvas, instance.bitmap.name, this.getBitmapMatrix(instance, m), elementColor)
						continue
					}

					if (!this.timelines.has(instance.symbolName)) {
						this.warnOnce('Symbol not found in the animation data: ' + instance.symbolName)
						continue
					}

					this.renderInto(
						canvas,
						instance.symbolName,
						this.getChildFrame(instance, frameIdx - frame.index),
						m.multiply(this.getElementMatrix(instance)),
						elementColor
					)
				} else if (element.atlasSpriteInstance) {
					const instance = element.atlasSpriteInstance
					const elementColor = instance.color ? color.combine(ColorEffect.parse(instance.color)) : color
					this.drawSprite(ctx, canvas, instance.name, m.multiply(this.getElementMatrix(instance)), elementColor)
				} else {
					this.warnOnce('Unsupported element type: ' + Object.keys(element).join(', '))
				}
			}

			if (layer.layerType === 'Clp') {
				const maskCanvas = canvas
				const maskedCanvas = canvasStack.pop()
				const baseCanvas = canvasStack.pop()
				applyMask(baseCanvas, maskedCanvas, maskCanvas)
				canvas = baseCanvas
			}
		}
	}

	getBounds(name = null) {
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

		const addSpriteBounds = (sprite, matrix) => {
			const width = sprite.rotated ? sprite.h : sprite.w
			const height = sprite.rotated ? sprite.w : sprite.h
			for (const [x, y] of [[0, 0], [width, 0], [0, height], [width, height]]) {
				const [px, py] = matrix.apply(x, y)
				minX = Math.min(minX, px); maxX = Math.max(maxX, px)
				minY = Math.min(minY, py); maxY = Math.max(maxY, py)
			}
		}

		const visit = (symbolName, frameIdx, m) => {
			for (const layer of this.timelines.get(symbolName) || []) {
				const frame = this.frameAt(layer, frameIdx)
				if (!frame) continue
				for (const element of frame.elements || []) {
					if (element.symbolInstance) {
						const instance = element.symbolInstance

						if (!this.timelines.has(instance.symbolName) && instance.bitmap) {
							const sprite = this.spriteAtlas.spriteInfo[instance.bitmap.name]
							if (sprite) addSpriteBounds(sprite, this.getBitmapMatrix(instance, m))
							continue
						}

						visit(
							instance.symbolName,
							this.getChildFrame(instance, frameIdx - frame.index),
							m.multiply(this.getElementMatrix(instance))
						)
					} else if (element.atlasSpriteInstance) {
						const instance = element.atlasSpriteInstance
						const sprite = this.spriteAtlas.spriteInfo[instance.name]
						if (sprite) addSpriteBounds(sprite, m.multiply(this.getElementMatrix(instance)))
					}
				}
			}
		}

		const length = this.getLength(name)
		for (let i = 0; i < length; i++) visit(name, i, new TransformMatrix())

		return { minX, minY, maxX, maxY }
	}
}

const parseAnimateJson = text => JSON.parse(text.replace(/^\uFEFF/, '').replace(/,\s*}/g, '}'))

mainForm.addEventListener('submit', async event => {
	event.preventDefault()

	// Reset the preview slider and animation selector
	showPreviewFrame = null
	previewJobs = []
	previewRenderer = null
	previewJobIndex = 0
	animationSelect.innerHTML = ''
	animationSelectGroup.classList.add('d-none')
	if (atlasCanvas) { atlasCanvas.width = 0; atlasCanvas.height = 0 }
	frameSlider.disabled = true
	frameSlider.min = 0
	frameSlider.max = 0
	frameSlider.value = 0
	frameLabel.textContent = '-'

	timer.start()
	document.querySelector('#status').classList.remove('d-none')

	const imageFile = mainForm.querySelector('#inputImage').files?.[0]
	const spriteDataFile = mainForm.querySelector('#inputSpriteData').files?.[0]
	const animationDataFile = mainForm.querySelector('#inputAnimationData').files?.[0]

	if (!imageFile || !spriteDataFile || !animationDataFile) {
		updateStatus('Please provide the image file, the sprite data file, and the animation data file.')
		return
	}

	let indexReady = 0

	const zip = new JSZip()
	const zipFileName = imageFile.name.replace(/\.[^./\\]+$/, '') + '.zip'

	try {
		updateStatus(`Loading resources... (${indexReady}/3)`)
		let spriteData, animationData
		;[textureImage, spriteData, animationData] = await Promise.all([
			loadImageSource(imageFile).then(result => { indexReady++; updateStatus(`Loading resources... (${indexReady}/3)`); return result }),
			readFileAsText(spriteDataFile).then(text => { indexReady++; updateStatus(`Loading resources... (${indexReady}/3)`); return parseAnimateJson(text) }),
			readFileAsText(animationDataFile).then(text => { indexReady++; updateStatus(`Loading resources... (${indexReady}/3)`); return parseAnimateJson(text) })
		])

		normalizeKeys(animationData)

		spriteAtlas = new SpriteAtlas(spriteData, textureImage)
		if (!Object.keys(spriteAtlas.spriteInfo).length) {
			updateStatus('No sprites found in the sprite data file. Make sure it is an Adobe Animate <code>spritemap1.json</code>.')
			return
		}
		if (!animationData?.animation?.timeline?.layers || !animationData?.symbolDictionary?.symbols) {
			updateStatus('Could not read the animation data. Make sure it is an Adobe Animate <code>Animation.json</code>.')
			return
		}

		const exporter = detectExporter(animationData)
		flagFormat(exporter)

		const renderer = new Renderer(animationData, spriteAtlas)

		const animations = renderer.getAnimations()
		if (!animations.length) {
			updateStatus('No frames detected. Is there any animation?')
			return
		}

		const animationName = String(animationData?.animation?.name || '').trim()
		const filePrefix = sanitizeFileName(animationName || imageFile.name.replace(/\.[^./\\]+$/, '') || 'frame')
		const usedPrefixes = new Set()

		const jobs = []
		const skippedAnimations = []
		for (const animation of animations) {
			const bounds = renderer.getBounds(animation.key)
			if (!isFinite(bounds.minX)) {
				skippedAnimations.push({
					name: animation.name,
					frames: animation.length,
					reason: 'no visible bounds',
				})
				continue
			}

			const requested = animation.name ? sanitizeFileName(animation.name) : filePrefix
			let prefix = requested
			let suffix = 2
			while (usedPrefixes.has(prefix)) prefix = requested + '_' + suffix++
			usedPrefixes.add(prefix)

			jobs.push({
				key: animation.key,
				length: animation.length,
				width: Math.max(1, Math.ceil(bounds.maxX) - Math.floor(bounds.minX)),
				height: Math.max(1, Math.ceil(bounds.maxY) - Math.floor(bounds.minY)),
				baseTransform: TransformMatrix.translate(-Math.floor(bounds.minX), -Math.floor(bounds.minY)),
				prefix,
				padding: Math.max(4, String(animation.length - 1).length),
			})
		}

		if (!jobs.length) {
			updateStatus('No frames detected. Is there any animation?')
			return
		}

		const multipleJobs = jobs.length > 1
		for (const job of jobs) {
			job.fileName = index => {
				const fileName = job.prefix + '_' + String(index).padStart(job.padding, '0') + '.png'
				return multipleJobs ? job.prefix + '/' + fileName : fileName
			}
		}

		const frameRate = +animationData?.metadata?.frameRate || 24
		const totalFrames = jobs.reduce((total, job) => total + job.length, 0)
		let renderedFrames = 0

		frameCanvas.width = jobs[0].width
		frameCanvas.height = jobs[0].height
		const frameCanvasContext = frameCanvas.getContext('2d')

		for (const job of jobs) {
			renderer.canvasWidth = job.width
			renderer.canvasHeight = job.height
			renderer.baseTransform = job.baseTransform

			frameCanvas.width = job.width
			frameCanvas.height = job.height

			// Precompute which atlas sprites each frame uses, so we don't walk
			// the entire timeline on every single frame during render.
			const frameRects = new Map()
			for (let i = 0; i < job.length; i++) {
				frameRects.set(i, collectUsedSpriteRects(renderer, job.key, i, spriteAtlas))
			}

			for (let i = 0; i < job.length; i++) {
				const canvas = renderer.renderSymbol(job.key, i)

				frameCanvasContext.clearRect(0, 0, job.width, job.height)
				frameCanvasContext.drawImage(canvas, 0, 0)

				// Only redraw the atlas preview if its panel is visible; skip
				// entirely when collapsed to avoid re-drawing the whole atlas
				// for every frame while hidden.
				if (atlasCanvas && textureImage && atlasCanvasDetails.open) {
					drawAtlasPreview(atlasCanvas, textureImage, frameRects.get(i), 'rgba(255, 0, 0, 0.7)', 3)
				}

				// Yield to the browser so the live canvas preview repaints mid-render
				await new Promise(resolve => requestAnimationFrame(resolve))

				const blob = await canvasToBlob(canvas)
				if (blob) zip.file(job.fileName(i), blob)
				else console.warn(`Frame ${job.fileName(i)} could not be encoded and was skipped.`)

				// Release the canvas right away instead of waiting for the GC
				canvas.width = 0
				canvas.height = 0

				updateStatus(`Rendered frame ${job.fileName(i)} (${++renderedFrames}/${totalFrames})...`)
			}
		}

		const content = await zipToBlob(zip)
		saveAs(content, imageFile.name.replace(/\.[^./\\]+$/, '') + '.zip')

		const elapsed = timer.stop() / 1000
		if (multipleJobs) {
			updateStatus(`Exported ${jobs.length} animations (${totalFrames} frames) in ${elapsed} seconds!`)
		} else {
			const job = jobs[0]
			updateStatus(`Exported ${job.length} frames (${job.width}×${job.height}, ${frameRate} fps) in ${elapsed} seconds!`)
		}

		previewJobs = jobs
		previewRenderer = renderer
		previewJobIndex = 0
		for (const [index, job] of jobs.entries()) {
			const option = document.createElement('option')
			option.value = String(index)
			option.textContent = `${job.prefix} (${job.length} frames)`
			animationSelect.append(option)
		}
		animationSelectGroup.classList.toggle('d-none', !multipleJobs)
		animationSelect.value = '0'

		showPreviewFrame = index => {
			const job = previewJobs[previewJobIndex]
			if (!job) return

			const canvas = previewRenderer.renderSymbol(job.key, index)
			const rects = collectUsedSpriteRects(previewRenderer, job.key, index, spriteAtlas)

			drawPreviewPair(
				frameCanvas,
				canvas,
				atlasCanvas,
				textureImage,
				rects,
				'rgba(255, 0, 0, 0.7)',
				3
			)

			canvas.width = 0
			canvas.height = 0

			frameLabel.textContent = previewJobs.length > 1
				? `${job.fileName(index)} (animation ${previewJobIndex + 1}/${previewJobs.length}, frame ${index + 1}/${job.length})`
				: `${job.fileName(index)} (${index + 1}/${job.length})`
		}

		frameSlider.value = 0
		frameSlider.disabled = false
		showPreviewAnimation(0)
	} catch (error) {
		updateStatus('Error: ' + error.message)
		console.error(error)
	}
})
