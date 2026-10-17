// Extraction worker to process it off off the main thread so a big sheet does not take the whole tab down with it.

import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3/+esm'
import { processTextures, renderPreview, PREVIEW_MAX_SIZE, zipToBlob } from './extractor-core.js'

const createCanvas = (width, height) => new OffscreenCanvas(width, height)
const canvasToBlob = canvas => canvas.convertToBlob({ type: 'image/png' })

self.addEventListener('message', async event => {
	const { id, file, textures, concurrency } = event.data || {}
	const post = (type, payload = {}, transfer = []) => self.postMessage({ id, type, ...payload }, transfer)

	try {
		const source = await createImageBitmap(file)

		// Send a small preview back for the frame highlight
		const preview = renderPreview(createCanvas, source, source.width, source.height, PREVIEW_MAX_SIZE)
		const previewBitmap = preview.canvas.transferToImageBitmap()
		post('preview', { bitmap: previewBitmap, scale: preview.scale }, [previewBitmap])

		const zip = new JSZip()
		const count = await processTextures({
			source,
			textures,
			zip,
			createCanvas,
			canvasToBlob,
			concurrency,
			onProgress: (done, total, index) => post('progress', { count: done, total, index }),
			onSkip: (texture, reason) => post('skip', { name: texture?.name, reason }),
		})

		source.close?.()

		const blob = await zipToBlob(zip)
		post('done', { blob, count })
	} catch (error) {
		post('error', { message: error?.message || String(error) })
	}
})
