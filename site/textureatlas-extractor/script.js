const mainForm = document.querySelector('#form-main')
const mainCanvas = document.querySelector('#canvas-main')

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

mainForm.addEventListener('submit', async event => {
	event.preventDefault()

	timer.start()
	document.querySelector('#status').classList.remove('d-none')
	
	const textureImageFile = mainForm.querySelector('#inputImage').files?.[0]
	const textureSheetFile = mainForm.querySelector('#inputXml').files?.[0]

	let indexReady = 0

	let textureImage = new Image()
	let textureSheet = null
	let textureSheetFormat = ""
	let chosenParser = null

	const zip = new JSZip()

	updateStatus(`Loading resources... (${indexReady}/2)`)
	await Promise.all([
		new Promise(res => {
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
		}),
		new Promise(res => {
			const textureSheetReader = new FileReader()
			textureSheetReader.onload = () => {
				if (textureSheetFile.type === "text/xml" || textureSheetFile.name.endsWith('.plist')) {
					textureSheetFormat = "xml"
					const xmlParser = new DOMParser()
					textureSheet = xmlParser.parseFromString(textureSheetReader.result, 'text/xml')

				} else if (textureSheetFile.type === "application/json" || textureSheetFile.name.endsWith('.tpsheet') || textureSheetFile.name.endsWith('.tpset') || textureSheetFile.name.endsWith('.paper2dsprites')) {
					textureSheetFormat = "json"
					textureSheet = JSON.parse(textureSheetReader.result.replace(/,\s*}/g, '}'))
				}
				indexReady++
				updateStatus(`Loading resources... (${indexReady}/2)`)
				res()
			}
			console.log(textureSheetFile)
			textureSheetReader.readAsText(textureSheetFile)
		
		})
	])

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
	mainCanvasContext.drawImage(textureImage, 0, 0)

	const textures = parser[chosenParser].function(textureSheet)
	updateStatus("Chosen strategy: " + parser[chosenParser].name)
	const texturesLength = textures.length
	let textureDone = 0;

	console.log(JSON.stringify(textures))

	await Promise.all(textures.map(async texture => {
		const canvasTemp = document.createElement('canvas')
		canvasTemp.width = texture.canvasWidth || texture.destinationWidth || texture.sourceWidth
		canvasTemp.height = texture.canvasHeight || texture.destinationHeight || texture.sourceHeight
		const canvasTempContext = canvasTemp.getContext('2d')
		// TODO: How does rotation work? This still results in a shift.
		if (texture.rotated) {
			canvasTempContext.translate(Math.ceil(canvasTemp.width / 2), Math.ceil(canvasTemp.height / 2))
			canvasTempContext.rotate(-Math.PI / 2)
			canvasTempContext.translate(-Math.ceil(canvasTemp.width / 2), -Math.ceil(canvasTemp.height) / 2)	
			canvasTempContext.drawImage(
				textureImage,
				texture.sourceX,
				texture.sourceY,
				texture.sourceWidth,
				texture.sourceHeight,
				texture.destinationY || 0,
				texture.destinationX || 0,
				texture.destinationWidth || texture.sourceWidth,
				texture.destinationHeight || texture.sourceHeight,
			)
		} else {
			canvasTempContext.drawImage(
				textureImage,
				texture.sourceX,
				texture.sourceY,
				texture.sourceWidth,
				texture.sourceHeight,
				texture.destinationX || 0,
				texture.destinationY || 0,
				texture.destinationWidth || texture.sourceWidth,
				texture.destinationHeight || texture.sourceHeight,
			)
		}
		
		const blob = await new Promise(res => canvasTemp.toBlob(res));
		zip.file(texture.name + '.png', blob)
		// mainCanvasContext.fillStyle = '#28a74540'
		// mainCanvasContext.fillRect(
		// 	texture.sourceX,
		// 	texture.sourceY,
		// 	texture.sourceWidth,
		// 	texture.sourceHeight
		// )
		textureDone++
		updateStatus(`Exported texture "${texture.name}". (${textureDone}/${texturesLength})`)
	}))



	const content = await zip.generateAsync({ type: "blob" })
	saveAs(content, textureImageFile.name.split('.png')[0] + ".zip")
	updateStatus(`Extracted ${textureDone} textures in ${timer.stop() / 1000} seconds!`)

})

const parser = {
	starling: {
		name: "Starling",
		function: xmlDocument => {
			const textures = xmlDocument.querySelectorAll('SubTexture')
		
			return [...textures].map(texture => ({
				name: texture.attributes.name.value,
				rotated: false,
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
				return {
					name: texture.attributes.n.value,
					rotated,
					sourceX: +texture.attributes.x.value,
					sourceY: +texture.attributes.y.value,
					sourceWidth: +texture.attributes.w.value,
					sourceHeight: +texture.attributes.h.value,
					destinationX: +texture.attributes.oX?.value, 
					destinationY: +texture.attributes.oY?.value, 
					destinationWidth: +texture.attributes.w.value,
					destinationHeight: +texture.attributes.h.value,
					canvasWidth: +texture.attributes.oW?.value,
					canvasHeight: +texture.attributes.oH?.value
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
			// console.log(textures)
		
			return [...textures].map(texture => {
				
				const dict = xmlDictToObject(texture)

				const rotated = dict.rotated
				// console.log(dict.frame.replaceAll('{', '[').replaceAll('}', ']'))
				const frame = JSON.parse(dict.frame.replaceAll('{', '[').replaceAll('}', ']'))
				const sourceSize = JSON.parse(dict.sourceSize.replaceAll('{', '[').replaceAll('}', ']'))
				const sourceColorRect = JSON.parse(dict.sourceColorRect.replaceAll('{', '[').replaceAll('}', ']'))

				// console.log(dict)
				
				return {
					name: texture.previousElementSibling.textContent,
					sourceX: frame[0][0],
					sourceY: frame[0][1],
					sourceWidth: spriteSize[0],
					sourceHeight: spriteSize[1],
					destinationX: sourceColorRect[0][0],
					destinationY: sourceColorRect[0][1],
					destinationWidth: sourceColorRect[1][0],
					destinationHeight: sourceColorRect[1][1],
					canvasWidth: sourceSize[0],
					canvasHeight: sourceSize[1]
				}
			})
		},
	},
	cocos2d2: {
		name: "cocos2d 2",
		function: xmlDocument => {
			const textures = xmlDocument.querySelectorAll('plist > dict > dict > dict')
			// console.log(textures)
		
			return [...textures].map(texture => {
				
				const dict = xmlDictToObject(texture)

				console.log(dict)

				const rotated = dict.textureRotated
				// console.log(dict.frame.replaceAll('{', '[').replaceAll('}', ']'))
				const spriteSourceSize = JSON.parse(dict.spriteSourceSize.replaceAll('{', '[').replaceAll('}', ']'))
				const textureRect = JSON.parse(dict.textureRect.replaceAll('{', '[').replaceAll('}', ']'))
				const spriteOffset = JSON.parse(dict.spriteOffset.replaceAll('{', '[').replaceAll('}', ']'))

				const sourceWidth = rotated ? textureRect[1][1] : textureRect[1][0]
				const sourceHeight = rotated ? textureRect[1][0] : textureRect[1][1]
				const canvasWidth = rotated ? spriteSourceSize[1] : spriteSourceSize[0]
				const canvasHeight = rotated ? spriteSourceSize[0] : spriteSourceSize[1]

				// console.log(dict)

				var destinationX = sourceWidth < canvasWidth ? (Math.min(canvasWidth - sourceWidth) / 2) : 0;
				var destinationY = sourceHeight < canvasHeight ? (Math.min(canvasHeight - sourceHeight) / 2) : 0;
				
				return {
					name: texture.previousElementSibling.textContent,
					sourceX: textureRect[0][0],
					sourceY: textureRect[0][1],
					sourceWidth: textureRect[1][0],
					sourceHeight: textureRect[1][1],
					destinationX: destinationX + Number(spriteOffset[0]),
					destinationY: destinationY + Number(spriteOffset[1]),
					destinationWidth: sourceWidth,
					destinationHeight: sourceHeight,
					canvasWidth: canvasWidth,
					canvasHeight: canvasHeight
				}
			})
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
				return {
					name: texture.filename,
					rotated,
					sourceX: texture.frame.x,
					sourceY: texture.frame.y,
					sourceWidth: texture.frame.w,
					sourceHeight: texture.frame.h,
					destinationX: texture.spriteSourceSize.x,
					destinationY: texture.spriteSourceSize.y,
					destinationWidth: texture.spriteSourceSize.w,
					destinationHeight: texture.spriteSourceSize.h,
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
				return {
					name: name,
					rotated,
					sourceX: texture.frame.x,
					sourceY: texture.frame.y,
					sourceWidth: texture.frame.w,
					sourceHeight: texture.frame.h,
					destinationX: texture.spriteSourceSize.x,
					destinationY: texture.spriteSourceSize.y,
					destinationWidth: texture.spriteSourceSize.w,
					destinationHeight: texture.spriteSourceSize.h,
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
				return {
					name: texture.filename,
					rotated,
					sourceX: rotated ? texture.frame.y : texture.frame.x,
					sourceY: rotated ? texture.frame.x : texture.frame.y,
					sourceWidth: rotated ? texture.frame.h : texture.frame.w,
					sourceHeight: rotated ? texture.frame.w : texture.frame.h,
					destinationX: rotated ? texture.spriteSourceSize.y : texture.spriteSourceSize.x,
					destinationY: rotated ? texture.spriteSourceSize.x : texture.spriteSourceSize.y,
					destinationWidth: rotated ? texture.spriteSourceSize.h : texture.spriteSourceSize.w,
					destinationHeight: rotated ? texture.spriteSourceSize.w : texture.spriteSourceSize.h,
					canvasWidth: rotated ? texture.sourceSize.h : texture.sourceSize.w,
					canvasHeight: rotated ? texture.sourceSize.w : texture.sourceSize.h
				}
			})
		}
	},
	uikit: {
		name: "UIKit",
		function: xmlDocument => {
			const textures = xmlDocument.querySelectorAll('plist > dict > dict > dict')
			// console.log(textures)
		
			return [...textures].map(texture => {
				
				const dict = xmlDictToObject(texture)

				// console.log(dict)
				
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
			})
		},
	},

}