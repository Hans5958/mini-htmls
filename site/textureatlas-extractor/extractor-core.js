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
