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

mainForm.addEventListener('submit', event => {
	event.preventDefault()

	timer.start()
	document.querySelector('#status').classList.remove('d-none')
	
	const imageFile = mainForm.querySelector('#inputImage').files?.[0]
	const xmlFile = mainForm.querySelector('#inputXml').files?.[0]

	let indexReady = 0

	let imageImage = new Image()
	let xmlDocument = null

	const zip = new JSZip()

	const convert = async () => {
		indexReady++
		if (indexReady < 2) return

		mainCanvas.width = imageImage.width
		mainCanvas.height = imageImage.height
		const mainCanvasContext = mainCanvas.getContext('2d')
		mainCanvasContext.drawImage(imageImage, 0, 0)

		await Promise.all([...xmlDocument.querySelectorAll('SubTexture')].map(async texture => {
			const canvasTemp = document.createElement('canvas')
			canvasTemp.width = texture.attributes.frameWidth?.value ?? texture.attributes.width.value
			canvasTemp.height = texture.attributes.frameHeight?.value ?? texture.attributes.height.value
			canvasTemp.getContext('2d').drawImage(
				imageImage,
				texture.attributes.x.value,
				texture.attributes.y.value,
				texture.attributes.width.value,
				texture.attributes.height.value,
				-texture.attributes.frameX?.value ?? 0, 
				-texture.attributes.frameY?.value ?? 0,
				texture.attributes.width.value,
				texture.attributes.height.value,
			)
			updateStatus("Exporting " + texture.attributes.name.value + "...")
			const blob = await new Promise(res => canvasTemp.toBlob(res));
			zip.file(texture.attributes.name.value + '.png', blob)
		}))

		
		const content = await zip.generateAsync({ type: "blob" })
      	saveAs(content, imageFile.name.split('.png')[0] + ".zip")
		updateStatus("Extraction done in " + timer.stop() / 1000 + " seconds!")

	}

	const imageFileReader = new FileReader()
	imageFileReader.onload = () => {
		imageImage.onload = () => {
			convert()
		}
		imageImage.src = imageFileReader.result
	}
	imageFileReader.readAsDataURL(imageFile)

	const xmlFileReader = new FileReader()
	xmlFileReader.onload = () => {
		const xmlParser = new DOMParser()
		xmlDocument = xmlParser.parseFromString(xmlFileReader.result, 'text/xml')
		convert()
	}
	xmlFileReader.readAsText(xmlFile)

})
