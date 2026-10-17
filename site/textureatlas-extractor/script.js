import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3/+esm'
import saveAs from 'https://cdn.jsdelivr.net/npm/file-saver@2/+esm'
import isMobile from 'https://cdn.jsdelivr.net/npm/ismobilejs@1/+esm'
import {
	processTextures, renderPreview, PREVIEW_MAX_SIZE,
	createTimer, createStatusUpdater, readFileAsText, loadImageSource,
	createElementCanvas as createMainCanvas, canvasToBlob as mainCanvasToBlob,
	flagFormat, zipToBlob,
} from './extractor-core.js'

const mainForm = document.querySelector('#form-main')
const mainCanvas = document.querySelector('#canvas-main')
const mainCanvasDetails = document.querySelector('#status > details:nth-child(3)')
const spriteSlider = document.querySelector('#inputSprite')
const spriteLabel = document.querySelector('#sprite-label')

const isMobileReal = isMobile(window.navigator).any

mainForm.querySelector('#parallel').checked = !isMobileReal
mainCanvasDetails.open = !isMobileReal

// Prefer the worker, which needs OffscreenCanvas and createImageBitmap
const supportsWorker = typeof Worker !== 'undefined'
	&& typeof OffscreenCanvas !== 'undefined'
	&& typeof createImageBitmap === 'function'
	&& typeof OffscreenCanvas.prototype.convertToBlob === 'function'
	&& typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function'

let showPreviewSprite = null
let preview = null
let activeTextures = []

spriteSlider.addEventListener('input', () => {
	if (showPreviewSprite) showPreviewSprite(+spriteSlider.value)
})

const timer = createTimer()

const updateStatus = createStatusUpdater('#status-text')

const xmlDictToObject = el => {
	const dict = {}
	let currentKeyDict = null

	;[...el.children].forEach(el => {
		if (el.tagName === 'key') {
			currentKeyDict = el.textContent
		} else {
			if (el.tagName === 'string') {
				dict[currentKeyDict] = el.textContent
			} else if (el.tagName === 'real') {
				dict[currentKeyDict] = Number(el.textContent)
			} else if (el.tagName === 'integer') {
				dict[currentKeyDict] = Number(el.textContent)
			} else if (el.tagName === 'true') {
				dict[currentKeyDict] = true
			} else if (el.tagName === 'false') {
				dict[currentKeyDict] = false
			}
		}
	})

	return dict
}

const frameIsShownSize = (frame, spriteSourceSize) => frame.w === spriteSourceSize.w && frame.h === spriteSourceSize.h

// DOMParser is not available in workers
const parseTextureSheet = text => {
	if (text.trimStart().startsWith('<')) {
		const xmlParser = new DOMParser()
		return {
			textureSheetFormat: 'xml',
			textureSheet: xmlParser.parseFromString(text.replace(/^\s*(?:<!--[\s\S]*?-->\s*)+/, ''), 'text/xml')
		}
	}
	try {
		return { textureSheetFormat: 'json', textureSheet: JSON.parse(text.replace(/,\s*}/g, '}')) }
	} catch {
		return { textureSheetFormat: '', textureSheet: null }
	}
}

const runInWorker = (file, textures, concurrency, handlers) => new Promise((resolve, reject) => {
	let worker
	try {
		worker = new Worker('./extractor-worker.js', { type: 'module' })
	} catch (error) {
		reject(error)
		return
	}

	const id = 'extract-' + Date.now()
	let settled = false
	let started = false

	const finish = (callback, value) => {
		if (settled) return
		settled = true
		worker.terminate()
		callback(value)
	}
	const fail = error => {
		// If the worker already produced output, surface the error instead of redoing it
		error.started = started
		finish(reject, error)
	}

	worker.addEventListener('message', event => {
		const data = event.data || {}
		if (data.id !== id) return
		switch (data.type) {
			case 'preview':
				started = true
				handlers.onPreview(data)
				break
			case 'progress':
				handlers.onProgress(data)
				break
			case 'skip':
				handlers.onSkip(data)
				break
			case 'done':
				finish(resolve, data)
				break
			case 'error':
				fail(new Error(data.message))
				break
		}
	})
	worker.addEventListener('error', event => fail(event.error || new Error(event.message || 'The extraction worker failed to start.')))

	worker.postMessage({ id, file, textures, concurrency })
})

const runInMainThread = async (file, textures, concurrency, handlers) => {
	const source = await loadImageSource(file)

	const rendered = renderPreview(createMainCanvas, source, source.width, source.height, PREVIEW_MAX_SIZE)
	handlers.onPreview({ bitmap: rendered.canvas, scale: rendered.scale })

	const zip = new JSZip()
	const count = await processTextures({
		source,
		textures,
		zip,
		createCanvas: createMainCanvas,
		canvasToBlob: mainCanvasToBlob,
		concurrency,
		onProgress: (done, total, index) => handlers.onProgress({ count: done, total, index }),
		onSkip: (texture, reason) => handlers.onSkip({ name: texture?.name, reason }),
	})

	source.close?.()

	const blob = await zipToBlob(zip)
	return { blob, count }
}

const drawPreview = index => {
	const texture = activeTextures[index]
	if (!preview || !texture) return

	mainCanvas.width = preview.width
	mainCanvas.height = preview.height
	const context = mainCanvas.getContext('2d')
	context.clearRect(0, 0, mainCanvas.width, mainCanvas.height)
	context.drawImage(preview.source, 0, 0, preview.width, preview.height)
	context.strokeStyle = '#ff0000'
	context.lineWidth = Math.max(1, 8 * preview.scale)
	context.strokeRect(
		texture.sourceX * preview.scale,
		texture.sourceY * preview.scale,
		texture.sourceWidth * preview.scale,
		texture.sourceHeight * preview.scale
	)
	spriteLabel.textContent = `${texture.name}.png (${index + 1}/${activeTextures.length})`
}

// The worker can report thousands of frames, so coalesce the updates
let pendingProgress = null
let progressScheduled = false
const scheduleProgress = data => {
	pendingProgress = data
	if (progressScheduled) return
	progressScheduled = true
	requestAnimationFrame(() => {
		progressScheduled = false
		const latest = pendingProgress
		pendingProgress = null
		if (!latest) return
		updateStatus(`Exported ${latest.count}/${latest.total} textures...`, false)
		if (mainCanvasDetails.open) drawPreview(latest.index)
	})
}

mainForm.addEventListener('submit', async event => {
	event.preventDefault()

	// Reset the preview slider.
	showPreviewSprite = null
	preview = null
	activeTextures = []
	spriteSlider.disabled = true
	spriteSlider.min = 0
	spriteSlider.max = 0
	spriteSlider.value = 0
	spriteLabel.textContent = '-'

	timer.start()
	document.querySelector('#status').classList.remove('d-none')

	const textureImageFile = mainForm.querySelector('#inputImage').files?.[0]
	const textureSheetFile = mainForm.querySelector('#inputXml').files?.[0]
	const useParallel = mainForm.querySelector('#parallel').checked

	if (!textureImageFile || !textureSheetFile) {
		updateStatus('Please provide both the image file and the data file.')
		return
	}

	try {
		updateStatus('Loading resources... (1/2)')
		const textureSheetText = (await readFileAsText(textureSheetFile)).replace(/^\uFEFF/, '')
		const { textureSheet, textureSheetFormat } = parseTextureSheet(textureSheetText)
		updateStatus('Loading resources... (2/2)')

		// First parser that detects the sheet wins
		const chosenParser = Object.keys(parser).find(name =>
			parser[name].format === textureSheetFormat && parser[name].detect(textureSheet)
		)

		if (!chosenParser) {
			updateStatus('No viable strategy! Please recheck your files.')
			return
		}

		flagFormat(chosenParser)

		const textures = parser[chosenParser].function(textureSheet)
		const texturesLength = textures.length
		if (!texturesLength) {
			updateStatus('No textures found. Are you sure this is a supported spritesheet?')
			return
		}
		activeTextures = textures
		updateStatus('Chosen strategy: ' + parser[chosenParser].name)

		// The worker is single-threaded, so parallel only overlaps the async encodes
		const concurrency = useParallel ? (isMobileReal ? 2 : 4) : 1
		const skipped = []

		const handlers = {
			onPreview: data => {
				preview = { source: data.bitmap, scale: data.scale, width: data.bitmap.width, height: data.bitmap.height }
			},
			onProgress: data => {
				scheduleProgress(data)
			},
			onSkip: data => {
				skipped.push(data)
				console.warn('Skipped texture:', data.name, '—', data.reason)
			},
		}

		let result
		if (supportsWorker) {
			try {
				result = await runInWorker(textureImageFile, textures, concurrency, handlers)
			} catch (error) {
				if (error.started) throw error
				console.warn('Extraction worker unavailable, using the main thread instead.', error)
				result = await runInMainThread(textureImageFile, textures, concurrency, handlers)
			}
		} else {
			result = await runInMainThread(textureImageFile, textures, concurrency, handlers)
		}

		saveAs(result.blob, textureImageFile.name.replace(/\.[^./\\]+$/, '') + '.zip')

		const skippedNote = skipped.length ? ` (${skipped.length} frame${skipped.length === 1 ? '' : 's'} skipped)` : ''
		updateStatus(`Extracted ${result.count} textures in ${timer.stop() / 1000} seconds!${skippedNote}`)

		showPreviewSprite = drawPreview
		spriteSlider.max = texturesLength - 1
		spriteSlider.value = 0
		spriteSlider.disabled = false
		drawPreview(0)
	} catch (error) {
		updateStatus('Error: ' + (error?.message || error))
		console.error(error)
	}
})

const parser = {
	starling: {
		name: "Starling",
		format: 'xml',
		detect: doc => doc.querySelector('SubTexture')?.attributes?.name,
		function: xmlDocument => {
			const textures = xmlDocument.querySelectorAll('SubTexture')
		
			return [...textures].map(texture => ({
				name: texture.attributes.name.value,
				rotated: texture.attributes.rotated?.value === 'true',
				sourceX: +texture.attributes.x.value,
				sourceY: +texture.attributes.y.value,
				sourceWidth: +texture.attributes.width.value,
				sourceHeight: +texture.attributes.height.value,
				destinationX: -(texture.attributes.frameX?.value ?? 0), 
				destinationY: -(texture.attributes.frameY?.value ?? 0), 
				destinationWidth: +texture.attributes.width.value,
				destinationHeight: +texture.attributes.height.value,
				canvasWidth: +(texture.attributes.frameWidth?.value ?? texture.attributes.width.value),
				canvasHeight: +(texture.attributes.frameHeight?.value ?? texture.attributes.height.value)
			}))
		}
	},
	ftpXml: {
		name: "XML (generic)",
		format: 'xml',
		detect: doc => doc.querySelector('sprite')?.attributes?.n,
		function: xmlDocument => {
			const textures = xmlDocument.querySelectorAll('sprite')
		
			return [...textures].map(texture => {
				const rotated = texture.attributes.r?.value === "y" || false
				const sourceWidth = rotated ? +texture.attributes.h.value : +texture.attributes.w.value
				const sourceHeight = rotated ? +texture.attributes.w.value : +texture.attributes.h.value
				return {
					name: texture.attributes.n.value,
					rotated,
					sourceX: +texture.attributes.x.value,
					sourceY: +texture.attributes.y.value,
					sourceWidth,
					sourceHeight,
					destinationX: +(texture.attributes.oX?.value ?? 0), 
					destinationY: +(texture.attributes.oY?.value ?? 0), 
					destinationWidth: rotated ? sourceWidth : +texture.attributes.w.value,
					destinationHeight: rotated ? sourceHeight : +texture.attributes.h.value,
					canvasWidth: +(texture.attributes.oW?.value ?? texture.attributes.w.value),
					canvasHeight: +(texture.attributes.oH?.value ?? texture.attributes.h.value)
				}
			})
		},
	},
	egret2d: {
		name: "Egret2D",
		format: 'json',
		detect: data => data.frames && Object.values(data.frames)?.[0]?.w,
		function: textures => {
			return [...Object.entries(textures.frames)].map(([name, texture]) => ({
				name: name,
				rotated: false,
				sourceX: +texture.x,
				sourceY: +texture.y,
				sourceWidth: +texture.w,
				sourceHeight: +texture.h,
				destinationX: 0, 
				destinationY: 0, 
				destinationWidth: +texture.w,
				destinationHeight: +texture.h,
				canvasWidth: +texture.w,
				canvasHeight: +texture.h
			}))
		}
	},
	cocos2d: {
		name: "cocos2d",
		format: 'xml',
		detect: doc => doc.querySelector('plist') && [...doc.querySelectorAll('key')].some(el => el.textContent === 'rotated'),
		function: xmlDocument => {
			const textures = xmlDocument.querySelectorAll('plist > dict > dict > dict')
		
			return [...textures].map(texture => {
				
				const dict = xmlDictToObject(texture)

				const rotated = dict.rotated
				if (!dict.frame || !dict.sourceSize || !dict.sourceColorRect) return null

				const frame = JSON.parse(dict.frame.replaceAll('{', '[').replaceAll('}', ']'))
				const sourceSize = JSON.parse(dict.sourceSize.replaceAll('{', '[').replaceAll('}', ']'))
				const sourceColorRect = JSON.parse(dict.sourceColorRect.replaceAll('{', '[').replaceAll('}', ']'))


				const sourceWidth = rotated ? frame[1][1] : frame[1][0]
				const sourceHeight = rotated ? frame[1][0] : frame[1][1]

				return {
					name: texture.previousElementSibling.textContent,
					rotated,
					sourceX: frame[0][0],
					sourceY: frame[0][1],
					sourceWidth,
					sourceHeight,
					destinationX: sourceColorRect[0][0],
					destinationY: sourceColorRect[0][1],
					destinationWidth: sourceWidth,
					destinationHeight: sourceHeight,
					canvasWidth: sourceSize[0],
					canvasHeight: sourceSize[1]
				}
			}).filter(texture => texture)
		},
	},
	cocos2d2: {
		name: "cocos2d 2",
		format: 'xml',
		detect: doc => doc.querySelector('plist') && [...doc.querySelectorAll('key')].some(el => el.textContent === 'textureRotated'),
		function: xmlDocument => {
			const textures = xmlDocument.querySelectorAll('plist > dict > dict > dict')
			// console.log(textures)
		
			return [...textures].map(texture => {
				
				const dict = xmlDictToObject(texture)
				if (!dict.textureRect || !dict.spriteSourceSize) return null

				const rotated = dict.textureRotated
				const spriteSourceSize = JSON.parse(dict.spriteSourceSize.replaceAll('{', '[').replaceAll('}', ']'))
				const textureRect = JSON.parse(dict.textureRect.replaceAll('{', '[').replaceAll('}', ']'))
				const spriteOffset = JSON.parse(dict.spriteOffset.replaceAll('{', '[').replaceAll('}', ']'))

				const sourceWidth = rotated ? textureRect[1][1] : textureRect[1][0]
				const sourceHeight = rotated ? textureRect[1][0] : textureRect[1][1]


				return {
					name: texture.previousElementSibling.textContent,
					rotated,
					sourceX: textureRect[0][0],
					sourceY: textureRect[0][1],
					sourceWidth: sourceWidth,
					sourceHeight: sourceHeight,
					destinationX: Number(spriteOffset[0]),
					destinationY: Number(spriteOffset[1]),
					destinationWidth: sourceWidth,
					destinationHeight: sourceHeight,
					canvasWidth: spriteSourceSize[0],
					canvasHeight: spriteSourceSize[1]
				}
			}).filter(texture => texture)
		},
	},
	godot: {
		name: "Godot",
		format: 'json',
		detect: data => data.textures?.[0]?.sprites,
		function: textures => {
			// TODO: Check image name
			return [...textures.textures[0].sprites].map(texture => ({
				name: texture.filename,
				rotated: false,
				sourceX: texture.region.x,
				sourceY: texture.region.y,
				sourceWidth: texture.region.w,
				sourceHeight: texture.region.h,
				destinationX: 0, 
				destinationY: 0, 
				destinationWidth: texture.region.w,
				destinationHeight: texture.region.h,
				canvasWidth: texture.region.w,
				canvasHeight: texture.region.h
			}))
		}
	},
	phaserArray: {
		name: "Phaser (array)",
		format: 'json',
		detect: data => data.frames?.[0]?.filename,
		function: textures => {
			return [...textures.frames].map(texture => {
				const rotated = texture.rotated
				const shown = rotated && frameIsShownSize(texture.frame, texture.spriteSourceSize)
				const sourceWidth = shown ? texture.frame.h : texture.frame.w
				const sourceHeight = shown ? texture.frame.w : texture.frame.h
				return {
					name: texture.filename,
					rotated,
					sourceX: texture.frame.x,
					sourceY: texture.frame.y,
					sourceWidth,
					sourceHeight,
					destinationX: texture.spriteSourceSize.x,
					destinationY: texture.spriteSourceSize.y,
					destinationWidth: rotated ? sourceWidth : texture.spriteSourceSize.w,
					destinationHeight: rotated ? sourceHeight : texture.spriteSourceSize.h,
					canvasWidth: texture.sourceSize.w,
					canvasHeight: texture.sourceSize.h
				}
			})
		}
	},
	phaserHash: {
		name: "Phaser (hash)",
		format: 'json',
		detect: data => data.frames && Object.values(data.frames)?.[0]?.frame,
		function: textures => {
			return [...Object.entries(textures.frames)].map(([name, texture]) => {
				const rotated = texture.rotated
				const shown = rotated && frameIsShownSize(texture.frame, texture.spriteSourceSize)
				const sourceWidth = shown ? texture.frame.h : texture.frame.w
				const sourceHeight = shown ? texture.frame.w : texture.frame.h
				return {
					name: name,
					rotated,
					sourceX: texture.frame.x,
					sourceY: texture.frame.y,
					sourceWidth,
					sourceHeight,
					destinationX: texture.spriteSourceSize.x,
					destinationY: texture.spriteSourceSize.y,
					destinationWidth: rotated ? sourceWidth : texture.spriteSourceSize.w,
					destinationHeight: rotated ? sourceHeight : texture.spriteSourceSize.h,
					canvasWidth: texture.sourceSize.w,
					canvasHeight: texture.sourceSize.h
					}	
			})
		}
	},
	phaser3: {
		name: "Phaser 3",
		format: 'json',
		detect: data => data.textures?.[0]?.frames,
		function: textures => {
			// TODO: Check image name
			return [...textures.textures[0].frames].map(texture => {
				const rotated = texture.rotated
				const shown = rotated && frameIsShownSize(texture.frame, texture.spriteSourceSize)
				const sourceWidth = shown ? texture.frame.h : texture.frame.w
				const sourceHeight = shown ? texture.frame.w : texture.frame.h
				return {
					name: texture.filename,
					rotated,
					sourceX: texture.frame.x,
					sourceY: texture.frame.y,
					sourceWidth,
					sourceHeight,
					destinationX: texture.spriteSourceSize.x,
					destinationY: texture.spriteSourceSize.y,
					destinationWidth: rotated ? sourceWidth : texture.spriteSourceSize.w,
					destinationHeight: rotated ? sourceHeight : texture.spriteSourceSize.h,
					canvasWidth: texture.sourceSize.w,
					canvasHeight: texture.sourceSize.h
				}
			})
		}
	},
	uikit: {
		name: "UIKit",
		format: 'xml',
		detect: doc => doc.querySelector('plist') && doc.querySelector('real'),
		function: xmlDocument => {
			const textures = xmlDocument.querySelectorAll('plist > dict > dict > dict')
		
			return [...textures].map(texture => {
				
				const dict = xmlDictToObject(texture)		
				if (dict.w === undefined) return null

				return {
					name: texture.previousElementSibling.textContent,
					rotated: false,
					sourceX: dict.x,
					sourceY: dict.y,
					sourceWidth: dict.w,
					sourceHeight: dict.h,
					destinationX: dict.oX,
					destinationY: dict.oY,
					destinationWidth: dict.w,
					destinationHeight: dict.h,
					canvasWidth: dict.oW,
					canvasHeight: dict.oH
				}
			}).filter(texture => texture)
		},
	},
}
