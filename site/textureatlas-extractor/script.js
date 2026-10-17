import isMobile from 'https://cdn.jsdelivr.net/npm/ismobilejs@1/+esm'

const mainForm = document.querySelector('#form-main')
const mainCanvas = document.querySelector('#canvas-main')
const mainCanvasDetails = document.querySelector('#status > details:nth-child(3)')
const spriteSlider = document.querySelector('#inputSprite')
const spriteLabel = document.querySelector('#sprite-label')

const isMobileReal = isMobile(window.navigator).any

mainForm.querySelector('#parallel').checked = !isMobileReal
mainCanvasDetails.open = !isMobileReal

let showPreviewSprite = null

spriteSlider.addEventListener('input', () => {
	if (showPreviewSprite) showPreviewSprite(+spriteSlider.value)
})

const timer = {
	time: 0,

	start() {
		return this.time = Date.now()
	},

	stop() {
		return this.time = Date.now() - this.time
	}
}

const updateStatus = (info, log = true) => {
	document.querySelector("#status-text").innerHTML = info
	if (log) console.info(info)
}

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

mainForm.addEventListener('submit', async event => {
	event.preventDefault()
	console.log(event)

	// Reset the preview slider.
	showPreviewSprite = null
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

	console.log(useParallel)

	let indexReady = 0

	let textureImage = new Image()
	let textureSheet = null
	let textureSheetFormat = ""
	let chosenParser = null

	const zip = new JSZip()

	const loadTextureImage = () => new Promise(res => {
		const textureImageReader = new FileReader()
		textureImageReader.onload = () => {
			textureImage.onload = () => {
				indexReady++
				updateStatus(`Loading resources... (${indexReady}/2)`)
				res()
			}
			textureImage.src = textureImageReader.result
		}
		textureImageReader.readAsDataURL(textureImageFile)
	})

	const loadTextureSheet = () => new Promise(res => {
		const textureSheetReader = new FileReader()
		textureSheetReader.onload = () => {
			const textureSheetText = (textureSheetReader.result || '').replace(/^\uFEFF/, '')
			if (textureSheetText.trimStart().startsWith('<')) {
				textureSheetFormat = "xml"
				const xmlParser = new DOMParser()
				textureSheet = xmlParser.parseFromString(textureSheetText.replace(/^\s*(?:<!--[\s\S]*?-->\s*)+/, ''), 'text/xml')
			} else {
				try {
					textureSheet = JSON.parse(textureSheetText.replace(/,\s*}/g, '}'))
					textureSheetFormat = "json"
				} catch { }
			}
			indexReady++
			updateStatus(`Loading resources... (${indexReady}/2)`)
			res()
		}
		console.log(textureSheetFile)
		textureSheetReader.readAsText(textureSheetFile)
	
	})

	updateStatus(`Loading resources... (${indexReady}/2)`)
	
	if (useParallel) {
		await Promise.all([
			loadTextureImage(),
			loadTextureSheet()
		])
	} else {
		await loadTextureImage()
		await loadTextureSheet()
	}


	if (textureSheetFormat === "xml") {
		if (textureSheet.querySelector('SubTexture')?.attributes?.name) 
			chosenParser = 'starling'
		else if (textureSheet.querySelector('sprite')?.attributes?.n) 
			chosenParser = 'ftpXml'
		else if (textureSheet.querySelector('plist') && textureSheet.querySelector('real')) 
			chosenParser = 'uikit'
		else if (textureSheet.querySelector('plist') && [...textureSheet.querySelectorAll('key')].filter(el => el.textContent === 'rotated').length) 
			chosenParser = 'cocos2d'
		else if (textureSheet.querySelector('plist') && [...textureSheet.querySelectorAll('key')].filter(el => el.textContent === 'textureRotated').length) 
			chosenParser = 'cocos2d2'
	} else if (textureSheetFormat === "json") {
		if (textureSheet.frames?.[0]?.filename) 
			chosenParser = "phaserArray"
		else if (textureSheet.frames && Object.values(textureSheet.frames)?.[0]?.frame) 
			chosenParser = "phaserHash"
		else if (textureSheet.frames && Object.values(textureSheet.frames)?.[0]?.w) 
			chosenParser = "egret2d"
		else if (textureSheet.textures?.[0].sprites) 
			chosenParser = "godot"
		else if (textureSheet.textures?.[0].frames) 
			chosenParser = "phaser3"
	}

	if (chosenParser === null) {
		updateStatus("No viable strategy! Please recheck your files.")
		return
	}

	[...document.querySelector('.formats').children].forEach(el => {
		if (el.dataset.name === chosenParser) {
			el.classList.remove('badge-secondary')
			el.classList.add('badge-primary')
		} else {
			el.classList.remove('badge-primary')
			el.classList.add('badge-secondary')
		}
	})

	mainCanvas.width = textureImage.width
	mainCanvas.height = textureImage.height
	const mainCanvasContext = mainCanvas.getContext('2d')

	const textures = parser[chosenParser].function(textureSheet)
	updateStatus("Chosen strategy: " + parser[chosenParser].name)
	const texturesLength = textures.length
	let textureDone = 0;

	const textureFileName = texture => texture.name + '.png'

	showPreviewSprite = index => {
		const texture = textures[index]
		if (!texture) return
		mainCanvasContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height)
		mainCanvasContext.drawImage(textureImage, 0, 0)
		mainCanvasContext.strokeStyle = '#ff0000'
		mainCanvasContext.lineWidth = 8
		mainCanvasContext.strokeRect(texture.sourceX, texture.sourceY, texture.sourceWidth, texture.sourceHeight)
		spriteLabel.textContent = `${textureFileName(texture)} (${index + 1}/${texturesLength})`
	}

	const processTexture = async texture => {
		const destinationX = texture.destinationX || 0
		const destinationY = texture.destinationY || 0
		const destinationWidth = texture.destinationWidth || texture.sourceWidth
		const destinationHeight = texture.destinationHeight || texture.sourceHeight

		// Need to expand the frame in case some atlas generators put it too small
		const placedWidth = texture.rotated ? destinationHeight : destinationWidth
		const placedHeight = texture.rotated ? destinationWidth : destinationHeight
		const offsetX = Math.min(0, destinationX)
		const offsetY = Math.min(0, destinationY)

		const canvasTemp = document.createElement('canvas')
		canvasTemp.width = Math.max(texture.canvasWidth || placedWidth, destinationX + placedWidth) - offsetX
		canvasTemp.height = Math.max(texture.canvasHeight || placedHeight, destinationY + placedHeight) - offsetY
		const canvasTempContext = canvasTemp.getContext('2d')
		const drawX = destinationX - offsetX
		const drawY = destinationY - offsetY
		if (texture.rotated) {
			canvasTempContext.translate(drawX, drawY + destinationWidth)
			canvasTempContext.rotate(-Math.PI / 2)
			canvasTempContext.drawImage(
				textureImage,
				texture.sourceX,
				texture.sourceY,
				texture.sourceWidth,
				texture.sourceHeight,
				0,
				0,
				destinationWidth,
				destinationHeight
			)
		} else {
			canvasTempContext.drawImage(
				textureImage,
				texture.sourceX,
				texture.sourceY,
				texture.sourceWidth,
				texture.sourceHeight,
				drawX,
				drawY,
				destinationWidth,
				destinationHeight
			)
		}
		
		const blob = await new Promise(res => canvasTemp.toBlob(res));
		zip.file(textureFileName(texture), blob)
		textureDone++
		updateStatus(`Exported texture "${texture.name}". (${textureDone}/${texturesLength})`)
		if (mainCanvasDetails.open) showPreviewSprite(textures.indexOf(texture))
	}

	if (useParallel) {
		await Promise.all(textures.map(processTexture))
	} else {
		for (const texture of textures) {
			await processTexture(texture)
		} 
	}

	const content = await zip.generateAsync({ type: "blob" })
	saveAs(content, textureImageFile.name.split('.png')[0] + ".zip")
	updateStatus(`Extracted ${textureDone} textures in ${timer.stop() / 1000} seconds!`)

	spriteSlider.max = texturesLength - 1
	spriteSlider.value = 0
	spriteSlider.disabled = false
	showPreviewSprite(0)

})

const parser = {
	starling: {
		name: "Starling",
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