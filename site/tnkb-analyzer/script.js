
/*
	
Initialization

*/

let firstTimeHelpHidden = false

const inputField = document.getElementById("input")
const outputField = document.getElementById("output")

inputField.oninput = (e) => {
	inputField.value = inputField.value.toUpperCase()
	updateOutput(formatTNKB(inputField.value))
}

const formatTNKB = TNKB => {
	const regexResult = /([A-Za-z]{1,2}) ?([0-9]{1,5})? ?([A-Za-z0-9]{1,3})?/.exec(TNKB)
	if (regexResult) return regexResult.splice(1, 3)
	else return null
}

let placeholderText = inputField.placeholder

/* 

Show time! 

*/

let dict

$.getJSON(window.dict , json => {
	dict = json
	inputField.disabled = false
	dictCallback()
})

const updateOutput = formattedTNKB => {
	if (!firstTimeHelpHidden) {
		document.getElementById("help").style.display = "none"
	}
	document.querySelectorAll("#output p").forEach(e => e.textContent = "")
	document.querySelector("#output").style.display = "none"
	const [kodeWilayah, nomorPolisi, kodeAkhir] = formattedTNKB
	const [wilayah1, wilayah2] = analyzeTNKB(kodeWilayah, nomorPolisi, kodeAkhir)
	const setOutput = (element, value) => {
		if (typeof value === "string") {
			document.querySelector(`${element} .result`).innerHTML = value
			document.querySelector(`${element} .details`).innerHTML = ""
		} else if (typeof value === "object" && value !== null){
			document.querySelector(`${element} .result`).innerHTML = value[0]
			document.querySelector(`${element} .details`).innerHTML = value[1]
		} else { 
			document.querySelector(`${element} .result`).innerHTML = ""
			document.querySelector(`${element} .details`).innerHTML = ""
		}
	}
	setOutput("#tingkat1", wilayah1)
	setOutput("#tingkat2", wilayah2)
	document.querySelector("#output").style.display = ""
}

var analyzeTNKB = (kodeWilayah, nomorPolisi, kodeAkhir) => {
	if (dict[kodeWilayah].tingkat1) {
		const wilayah1 = dict[kodeWilayah].tingkat1
		let wilayah2
		if (typeof kodeAkhir === "string") {
			if (dict[kodeWilayah].tingkat2.from === "start") wilayah2 = dict[kodeWilayah].tingkat2.values[kodeAkhir[0]]
			else if (dict[kodeWilayah].tingkat2.from === "end") wilayah2 = dict[kodeWilayah].tingkat2.values[kodeAkhir[kodeAkhir.length - 1]]
			else if (dict[kodeWilayah].tingkat2.from === "single") wilayah2 = dict[kodeWilayah].tingkat2.values
			else if (dict[kodeWilayah].tingkat2.from === "function") wilayah2 = dict[kodeWilayah].tingkat2.values()
			else if (dict[kodeWilayah].tingkat2.from === null) wilayah2 = null
		} else {
			wilayah2 = null
		}
		return [wilayah1, wilayah2]
	} else {
		return false
	}
}

var dictCallback = () => {
	let TNKB,
		helpText
		updateInfo = () => {
		while (!TNKB) {
			let randomLetter = () => ('ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('')[(Math.floor(Math.random()*26))]
			const kodeWilayah = Object.keys(dict)[Math.floor(Math.random()*Object.keys(dict).length)]
			const nomorPolisi = Math.round(((Math.random()*0.8999)+0.1)*10000)
			const kodeAkhir = randomLetter() + randomLetter()
			if (analyzeTNKB(kodeWilayah, nomorPolisi, kodeAkhir)[2] !== null) TNKB = `${kodeWilayah} ${nomorPolisi} ${kodeAkhir}` 
		}
		inputField.placeholder = placeholderText + TNKB
		TNKB = false
	}
	updateInfo()
	setInterval(updateInfo, 3000)
}