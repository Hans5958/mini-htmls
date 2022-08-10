
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

fetch(window.dict).then(response => response.json())
	.then(json => {
		dict = json
		inputField.disabled = false
		dictCallback()
	})

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

const updateOutput = formattedTNKB => {
	if (!firstTimeHelpHidden) {
		document.getElementById("help").style.display = "none"
	}
	document.querySelectorAll("#output p").forEach(e => e.textContent = "")
	document.querySelector("#output").style.display = "none"
	const [kodeWilayah, nomorPolisi, kodeAkhir] = formattedTNKB
	const [wilayah1, wilayah2] = analyzeTNKB(kodeWilayah, nomorPolisi, kodeAkhir)
	setOutput("#tingkat1", wilayah1)
	setOutput("#tingkat2", wilayah2)
	document.querySelector("#output").style.display = ""
}

var analyzeTNKB = (kodeWilayah, nomorPolisi, kodeAkhir) => {
	let wilayah1 = null, wilayah2 = null
	const dictTingkat1 = dict[kodeWilayah]?.tingkat1
	if (dictTingkat1) {

		if (typeof dictTingkat1 === "string" || Array.isArray(dictTingkat1)) {
			wilayah1 = dictTingkat1
		} else if (typeof dictTingkat1 === "object" && dictTingkat1.from && dictTingkat1.values) {
			wilayah1 ||= dictTingkat1?.default
			switch (dictTingkat1.from){
				case "kodeAkhir-start":
					wilayah1 ||= [...Object.entries(dictTingkat1.values)].find(([kode, daerah]) => kodeAkhir?.startsWith(kode))?.[1]
					break;
				case "kodeAkhir-end":
					wilayah1 ||= [...Object.entries(dictTingkat1.values)].find(([kode, daerah]) => kodeAkhir?.endsWith(kode))?.[1]
					break;
			}
		}

		const dictTingkat2 = dict[kodeWilayah].tingkat2
		if (typeof kodeAkhir === "string") {
			wilayah2 ||= dictTingkat2?.default
			switch (dictTingkat2.from){
				case "kodeAkhir-start":
					wilayah2 ||= [...Object.entries(dictTingkat2.values)].find(([kode, daerah]) => kodeAkhir?.startsWith(kode))?.[1]
					break;
				case "kodeAkhir-end":
					wilayah2 ||= [...Object.entries(dictTingkat2.values)].find(([kode, daerah]) => kodeAkhir?.endsWith(kode))?.[1]
					break;
			}
			// if (dict[kodeWilayah].tingkat2.from === "kodeAkhir-start") wilayah2 = dict[kodeWilayah].tingkat2.values[kodeAkhir[0]]
			// else if (dict[kodeWilayah].tingkat2.from === "kodeAkhir-end") wilayah2 = dict[kodeWilayah].tingkat2.values[kodeAkhir[kodeAkhir.length - 1]]
			// else if (dict[kodeWilayah].tingkat2.from === "single") wilayah2 = dict[kodeWilayah].tingkat2.values
			// else if (dict[kodeWilayah].tingkat2.from === "function") wilayah2 = dict[kodeWilayah].tingkat2.values()
			// else if (dict[kodeWilayah].tingkat2.from === null) wilayah2 = null
		}

	}
		
	return [wilayah1, wilayah2]
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