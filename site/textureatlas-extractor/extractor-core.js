// Shared extraction logic, used by both the main thread and the worker.
// Only needs createCanvas(width, height) and canvasToBlob(canvas).

export const PREVIEW_MAX_SIZE = 2048

export const isTextureValid = texture =>
	!!texture &&
	[texture.sourceX, texture.sourceY, texture.sourceWidth, texture.sourceHeight]
		.every(value => Number.isFinite(value)) &&
	texture.sourceWidth > 0 &&
	texture.sourceHeight > 0

const toPixelSize = value => {
	const size = Math.floor(value)
	return Number.isFinite(size) ? Math.max(1, size) : 0
}

export const drawTexture = (createCanvas, source, texture) => {
	const destinationX = texture.destinationX || 0
	const destinationY = texture.destinationY || 0
	const destinationWidth = texture.destinationWidth || texture.sourceWidth
	const destinationHeight = texture.destinationHeight || texture.sourceHeight

	// Need to expand the frame in case some atlas generators put it too small
	const placedWidth = texture.rotated ? destinationHeight : destinationWidth
	const placedHeight = texture.rotated ? destinationWidth : destinationHeight
	const offsetX = Math.min(0, destinationX)
	const offsetY = Math.min(0, destinationY)

	const width = toPixelSize(Math.max(texture.canvasWidth || placedWidth, destinationX + placedWidth) - offsetX)
	const height = toPixelSize(Math.max(texture.canvasHeight || placedHeight, destinationY + placedHeight) - offsetY)
	if (!width || !height) throw new Error('Frame has no drawable area.')

	const canvas = createCanvas(width, height)
	const context = canvas.getContext('2d')

	const drawX = destinationX - offsetX
	const drawY = destinationY - offsetY
	if (texture.rotated) {
		context.translate(drawX, drawY + destinationWidth)
		context.rotate(-Math.PI / 2)
		context.drawImage(
			source,
			texture.sourceX, texture.sourceY, texture.sourceWidth, texture.sourceHeight,
			0, 0, destinationWidth, destinationHeight
		)
	} else {
		context.drawImage(
			source,
			texture.sourceX, texture.sourceY, texture.sourceWidth, texture.sourceHeight,
			drawX, drawY, destinationWidth, destinationHeight
		)
	}

	return canvas
}

// Downscale the atlas so the preview never needs a full-size canvas.
export const renderPreview = (createCanvas, source, sourceWidth, sourceHeight, maxSize = PREVIEW_MAX_SIZE) => {
	const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight))
	const width = Math.max(1, Math.round(sourceWidth * scale))
	const height = Math.max(1, Math.round(sourceHeight * scale))
	const canvas = createCanvas(width, height)
	canvas.getContext('2d').drawImage(source, 0, 0, width, height)
	return { canvas, scale, width, height }
}

// Draw a down-scaled atlas image on a canvas, optionally highlighting rectangles.
// Each rect is { x, y, w, h } in source-pixel coordinates (will be scaled).
export const drawAtlasPreview = (canvas, source, rects, highlightColor = '#ff0000', lineWidth = 3) => {
	if (!canvas || !source) return null
	const sourceWidth = source.naturalWidth || source.width
	const sourceHeight = source.naturalHeight || source.height
	const scale = Math.min(1, PREVIEW_MAX_SIZE / Math.max(sourceWidth, sourceHeight))
	const width = Math.max(1, Math.round(sourceWidth * scale))
	const height = Math.max(1, Math.round(sourceHeight * scale))

	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')
	ctx.clearRect(0, 0, width, height)
	ctx.drawImage(source, 0, 0, width, height)

	if (rects && rects.length) {
		ctx.strokeStyle = highlightColor
		// Stroke width scales with canvas size so it stays visible on large
		// atlases and doesn't overwhelm small ones.
		ctx.lineWidth = Math.max(1, Math.round(width * 0.004))
		for (const r of rects) {
			ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale)
		}
	}

	return { width, height, scale }
}

// Draw an already-rendered frame canvas onto a target preview canvas.
// Centralizes canvas sizing, clearing, and blitting so both pages behave the same.
export const drawFrameOnCanvas = (targetCanvas, frameCanvas) => {
	if (!frameCanvas) return null
	targetCanvas.width = frameCanvas.width
	targetCanvas.height = frameCanvas.height
	const ctx = targetCanvas.getContext('2d')
	ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
	ctx.drawImage(frameCanvas, 0, 0)
	return { width: targetCanvas.width, height: targetCanvas.height }
}

// Combined helper: draw the frame preview and the atlas preview with highlights in one call.
// rects are { x, y, w, h } in source-pixel coordinates.
export const drawPreviewPair = (
	frameCanvas,
	frameContentCanvas,
	atlasCanvas,
	atlasImage,
	rects,
	highlightColor = '#ff0000',
	lineWidth = 3
) => {
	drawFrameOnCanvas(frameCanvas, frameContentCanvas)
	drawAtlasPreview(atlasCanvas, atlasImage, rects, highlightColor, lineWidth)
}

// Duplicate names would overwrite each other inside the zip, so make them unique.
export const createNameAllocator = () => {
	const used = new Set()
	return name => {
		const base = String(name ?? '').replace(/\.png$/i, '') || 'texture'
		let candidate = base + '.png'
		let suffix = 1
		while (used.has(candidate)) candidate = `${base} (${++suffix}).png`
		used.add(candidate)
		return candidate
	}
}

export const runLimited = async (items, limit, worker) => {
	const size = Math.max(1, Math.min(limit, items.length))
	let next = 0
	await Promise.all(Array.from({ length: size }, async () => {
		while (next < items.length) {
			const index = next++
			await worker(items[index], index)
		}
	}))
}

export const processTextures = async ({
	source,
	textures,
	zip,
	createCanvas,
	canvasToBlob,
	concurrency = 1,
	allocateName = createNameAllocator(),
	onProgress = () => {},
	onSkip = () => {},
}) => {
	const total = textures.length
	let done = 0

	await runLimited(textures, concurrency, async (texture, index) => {
		if (!isTextureValid(texture)) {
			onSkip(texture, 'invalid frame bounds')
			return
		}

		let canvas
		try {
			canvas = drawTexture(createCanvas, source, texture)
		} catch (error) {
			onSkip(texture, error?.message || String(error))
			return
		}

		let blob = null
		try {
			blob = await canvasToBlob(canvas)
		} catch (error) {
			onSkip(texture, error?.message || String(error))
			return
		}

		// Release the canvas right away instead of waiting for the GC
		canvas.width = 0
		canvas.height = 0

		if (!blob || !blob.size) {
			onSkip(texture, 'encoding produced no data')
			return
		}

		zip.file(allocateName(texture.name), blob)
		done++
		onProgress(done, total, index)
	})

	return done
}

// Page helpers

export const createTimer = () => ({
	time: 0,

	start() {
		return this.time = Date.now()
	},

	stop() {
		return this.time = Date.now() - this.time
	}
})

export const createStatusUpdater = (selector = '#status-text') => (info, log = true) => {
	document.querySelector(selector).innerHTML = info
	if (log) console.info(info)
}

export const readFileAsText = file => new Promise((resolve, reject) => {
	const reader = new FileReader()
	reader.onload = () => resolve(reader.result)
	reader.onerror = () => reject(new Error(`Could not read "${file.name}".`))
	reader.readAsText(file)
})

export const loadImageSource = async file => {
	if (typeof createImageBitmap === 'function') {
		try {
			return await createImageBitmap(file)
		} catch (error) {
			console.warn('createImageBitmap failed, falling back to an <img>.', error)
		}
	}

	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file)
		const image = new Image()
		image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
		image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not load "${file.name}" as an image.`)) }
		image.src = url
	})
}

export const sanitizeFileName = name => name.replace(/[\\/:*?"<>|]+/g, '_').replace(/^\.+/, '').trim() || 'frame'

export const createElementCanvas = (width, height) => {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	return canvas
}

export const canvasToBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/png'))

export const flagFormat = name => {
	for (const element of document.querySelectorAll('.formats .badge')) {
		const detected = element.dataset.name === name
		element.classList.toggle('badge-primary', detected)
		element.classList.toggle('badge-secondary', !detected)
	}
}

// PNGs are already compressed, so STORE avoids re-deflating them
export const zipToBlob = zip => zip.generateAsync({ type: 'blob', streamFiles: true, compression: 'STORE' })
