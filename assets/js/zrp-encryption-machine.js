const uint8ToBuffer = array => array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset)
const bufferToUint8 = array => Array.from(new Uint8Array(array))
const generateUint8 = length => new Uint8Array(length).map(() => Math.floor(Math.random() * 256))

const logElement = document.querySelector("pre#log")

const logging = {
	log(string = "", update = true) {
		if (update === true) {
			if (this.temp.length !== 0) {
				logElement.textContent += this.temp.join("\n") + "\n"
				this.temp.length = 0
			}
			logElement.textContent += string + "\n"
			logElement.scrollTop = logElement.scrollHeight;
		} else {
			this.temp.push(string)
		}
	},
	clear() {
		logElement.textContent = ""
	},
	temp: []
}

const updateDetails = (info, log = true) => {
	document.querySelector("#details").innerHTML = info
	if (log) logging.log(info)
}

let firstMessageTimeout

const timer = {
	time: 0,

	start() {
		return this.time = Date.now()
	},

	stop() {
		return this.time = Date.now() - this.time
	}
}

const concatUint8 = (...arrays) => {
		let totalLength = 0;
		for (const arr of arrays) {
				totalLength += arr.length;
		}
		const result = new Uint8Array(totalLength);
		let offset = 0;
		for (const arr of arrays) {
				result.set(arr, offset);
				offset += arr.length;
		}
		return result;
}

const download = (filename, blob) => {
		
	const blobUrl = URL.createObjectURL(blob)
	const tempLink = document.createElement("a")
	tempLink.href = blobUrl
	tempLink.download = filename
	document.body.appendChild(tempLink)
	// tempLink.dispatchEvent(
	// 	new MouseEvent('click', { 
	// 		bubbles: true, 
	// 		cancelable: true, 
	// 		view: window 
	// 	})
	// )
	tempLink.click()
	document.body.removeChild(tempLink)

}

const triggerFilePicker = () => new Promise((accept, reject) => {
	const tempInput = document.createElement("input")
	tempInput.type = "file"
	tempInput.accept = ".zip,.zrp"
	tempInput.oninput = (event) => {
		if (event.target.files.length === 0) reject()
		else {
			const file = event.target.files[0]
			accept(file)
		}
	}
	tempInput.dispatchEvent(
		new MouseEvent('click', { 
			bubbles: true, 
			cancelable: true, 
			view: window 
		})
	)
})

const stopPropagation = e => {
	e.stopPropagation()
	e.preventDefault()
}

const dropbox = document.querySelector("#dropbox")
dropbox.addEventListener("dragenter", e => {
	stopPropagation(e)
	dropbox.classList.add("dropping-down")
}, false)
dropbox.addEventListener("dragover", e => {
	stopPropagation(e)
	dropbox.classList.add("dropping-down")
}, false)
dropbox.addEventListener("dragleave", e => {
	stopPropagation(e)
	dropbox.classList.remove("dropping-down")
}, false)
dropbox.addEventListener("dragend", e => {
	stopPropagation(e)
	dropbox.classList.remove("dropping-down")
}, false)
dropbox.addEventListener("drop", e => {
	stopPropagation(e)
	dropbox.classList.remove("dropping-down")
	const dt = e.dataTransfer
	const files = dt.files
	handleFile(files[0])
}, false)
dropbox.addEventListener("click", async e => {
	stopPropagation(e)
	triggerFilePicker().then(file => handleFile(file))
}, false)

const handleFile = async (file) => {

	timer.start()
	logging.clear()
	
	const archiveFile = file
	const archiveName = file.name.substr(0, archiveFile.name.length - 4)
	const archiveType = file.name.substr(this.length - 3)
		
	let blob
	
	try {
		
		if (archiveType === "zrp") {
			
			updateDetails("Obtaining key...")
			const key = bufferToUint8(await archiveFile.slice(0, 16).arrayBuffer())
			const iv = key
			logging.log(`key: ${String.fromCharCode.apply(null, key)} (${key.join(", ")})`)
			logging.log(`iv: ${String.fromCharCode.apply(null, iv)} (${iv.join(", ")})`)
			const cbc = new aesjs.ModeOfOperation.cbc(key, iv)

			updateDetails("Decrpyting...")
			const decryptedFile = cbc.decrypt(bufferToUint8(await archiveFile.slice(16).arrayBuffer())).slice(16)
			// DYK that C#'s implementation of AES (AESManaged) prepends a random data with a length of 16 bytes? Yeah, it's weird.
			
			let time = timer.stop()/1000
			updateDetails(`<code>${archiveName}.zrp</code> has been decrypted to the <code>.zip</code> format in ${time} seconds.`, false)
			logging.log(`${archiveName}.zrp has been decrypted to the .zip format in ${time} seconds.`)
			download(`${archiveName}.zip`, new Blob([uint8ToBuffer(decryptedFile)], {type: 'application/zip'}))
			
		} else if (archiveType === "zip") {
		
			updateDetails("Generating key...")
			let key = generateUint8(16)
			const iv = key
			logging.log(typeof key)
			logging.log(`key: ${String.fromCharCode.apply(null, key)} (${key.join(", ")})`)
			logging.log(`iv: ${String.fromCharCode.apply(null, iv)} (${iv.join(", ")})`)
			const cbc = new aesjs.ModeOfOperation.cbc(key, iv)
		
			updateDetails("Adding padding...")
			let padding = new Uint8Array()
			if (await archiveFile.size % 16) {
				const paddingCount = 16 - archiveFile.size % 16
				padding = new Uint8Array(paddingCount)
				padding = padding.map(() => paddingCount)
			}

			updateDetails("Encrypting...")
			const encryptedFile = concatUint8(key, cbc.encrypt(concatUint8(generateUint8(16), bufferToUint8(await archiveFile.arrayBuffer()), padding)))
			// DYK that C#'s implementation of AES (AESManaged) prepends a random data with a length of 16 bytes? Yeah, it's weird.
			
			let time = timer.stop()/1000
			updateDetails(`<code>${archiveName}.zip</code> has been encrypted to the <code>.zrp</code> format in ${time} seconds.`, false)
			logging.log(`${archiveName}.zip has been encrypted to the .zrp format in ${time} seconds.`)
			download(`${archiveName}.zrp`, new Blob([uint8ToBuffer(encryptedFile)], {type: 'application/octet-stream'}))

			
		} else {
		
			throw "NotAnArchive"
		
		}

		} catch (e) {
	
		if (e === "NotAnArchive") updateDetails(`This is neither a <code>.zrp</code> archive nor a <code>.zip</code> archive!`)
		else updateDetails(`Something went wrong: ${e}`)
	
	} finally {
		
		try {clearInterval(firstMessageTimeout)}
		catch (e) {}
		firstMessageTimeout = setTimeout(() => updateDetails("Drop a <code>.zrp</code> archive to decrypt it or a <code>.zip</code> archive to encrypt it.", false), 10000)
		
	}	
	
}