import { createPopper } from 'https://cdn.skypack.dev/pin/@popperjs/core@v2.11.0-vNaZ2PjSixWsKsSynVha/mode=imports,min/optimized/@popperjs/core.js'

/**
 * Can be changed to a local copy.
 */
const spriteCollabEndpoint = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master"

let tempHidden = false
let currentTarget

let generateGetBoundingClientRect = (x = 0, y = 0) => () => ({
	width: 0,
	height: 0,
	top: y,
	right: x,
	bottom: y,
	left: x,
})

const virtualElement = {
	getBoundingClientRect: generateGetBoundingClientRect(),
}

const tooltipElement = document.querySelector("#tooltip")

const instance = createPopper(virtualElement, tooltipElement, {
	placement: 'right',
	modifiers: [
		{
			name: 'flip',
			options: {
				fallbackPlacements: ['left', 'top', 'right'],
			},
		},
	],
})

const updateTooltip = ({ clientX: x, clientY: y, target }) => {
	console.log(tempHidden)
	if (target.classList.contains(".viz-square")) {
		if (document.querySelector(".viz-square:hover")) target = document.querySelector(".viz-square:hover")
		else {
			tempHidden = false
			virtualElement.getBoundingClientRect = generateGetBoundingClientRect(x, y)
			instance.update()
		}
	}
	if (currentTarget !== target) {
		currentTarget = target
		const squareElement = target
		const gridElement = target.parentElement
		tooltipElement.innerHTML = tooltipFunctions[gridElement.dataset.tooltipFunction]?.(squareElement.dataset.tooltipId)
	}
	virtualElement.getBoundingClientRect = generateGetBoundingClientRect(x, y)
	instance.update()
}

const showTooltip = event => {
	tooltip.removeAttribute("hidden")
	instance.setOptions({
		modifiers: [{ name: 'eventListeners', enabled: true }],
	});
	document.addEventListener('mousemove', updateTooltip)
}

const hideTooltip = event => {
	tooltip.hidden = true;
	instance.setOptions({
		modifiers: [{ name: 'eventListeners', enabled: false }],
	})
	document.removeEventListener('mousemove', updateTooltip);
}

document.querySelectorAll(".viz-grid").forEach(element => {
	element.addEventListener("mouseenter", showTooltip)
	element.addEventListener("mouseleave", hideTooltip)
})

document.querySelector("#tooltip").addEventListener("mouseenter", updateTooltip)

const tooltipDataGenerator = {
	pokemon(pokemonId) {
		let pokemonData = data.pokemons[pokemonId]
		let formData = pokemonData.forms[Object.keys(pokemonData.forms)[0]]
		let portraitData = formData.portraits
		if (formData.preversed) portraitData = portraitData.concat(formData.preversed)

		let tooltipData = {
			"Name": `${pokemonData.name.split('_').join(' ')} (${pokemonData.id})`,
			"Status": "",
			"Last modified": pokemonData.lastModified,
			"!imgDirPath": formData.botPath,
			"!reversed": !!formData.preversed,
			"!portrait": portraitData,
			"!canvasId": "portrait-" + formData.filename.replace(/portrait-(\d{4}(?:-(\d{4}))*)\.png/, "$1"),
		}
		if (pokemonData.complete === 0) {
			tooltipData["Status"] = "Missing"
		} else if (pokemonData.complete === 1) {
			tooltipData["Status"] = "Incomplete (Exists)"
		} else if (pokemonData.complete === 2) {
			tooltipData["Status"] = "Complete (Fully Featured)"
		}
		return tooltipData
	},
	forms(pokemonId, formId) {
		let formData = data.pokemons[pokemonId].forms[formId]
		let portraitData = formData.portraits
		if (formData.preversed) portraitData = portraitData.concat(formData.preversed)
		let tooltipData = {
			"Name": "",
			"Form": `${formData.name} (${formData.filename.replace(/portrait-(\d{4}(?:-(\d{4}))*)\.png/, "$1")})`,
			...this.pokemon(pokemonId),
			"Last modified": formData.modified,
			// "!imgDirPath": formData.filename.replace(/portrait-(\d{4}(?:-(\d{4}))*)\.png/, "$1").replace(/-/g, "/")
			"!imgDirPath": formData.botPath,
			"!reversed": !!formData.preversed,
			"!portrait": portraitData,
			"!canvasId": "portrait-" + formData.filename.replace(/portrait-(\d{4}(?:-(\d{4}))*)\.png/, "$1"),
		}
		return tooltipData
	},
	portraits(pokemonId, formId, portraitId) {
		let formData = data.pokemons[pokemonId].forms[formId]
		let portraitData = formData.portraits
		if (formData.preversed) portraitData.concat(formData.preversed)
		let tooltipData = {
			"Name": "",
			"Form": "",
			"Portrait": `${data.portraitDict[portraitId]} (${portraitId})`,
			...this.forms(pokemonId, formId),
			"!done": portraitData[portraitId],
		}
		return tooltipData
	}
}

const tooltipFunctions = {
	completionPokemon(tooltipId) {
		let html = ""
		let pokemonId = tooltipId
		let tooltipData = tooltipDataGenerator.pokemon(tooltipId)
		html += Object.entries(tooltipData).filter(([display]) => !display.startsWith("!")).map(([display, value]) => `<p><span class="font-weight-bold">${display}</span>: ${value}</p>`).join("")
		html += `<div class="tooltip-img"><canvas id="${tooltipData["!canvasId"]}" width="200" height="${tooltipData["!reversed"] ? "320" : "160"}"></div>`
		tooltipData["!portrait"].forEach((portrait, index) => {
			if (!portrait) return
			const image = new Image();
			image.src = `${spriteCollabEndpoint}/portrait${tooltipData["!imgDirPath"]}${data.portraitDict[index % 20]}${index > 19 ? "^" : ""}.png`
			image.onload = () => {
				try {
					const ctx = document.querySelector(`#${tooltipData["!canvasId"]}`).getContext("2d")
					ctx.drawImage(image, (index % 5) * 40, Math.floor(index/5) * 40)
				} catch (e) {}
			}
		})
		return html
	},
	completionForms(tooltipId) {
		let html = ""
		let [pokemonId, formId] = tooltipId.split(";")
		let tooltipData = tooltipDataGenerator.forms(...tooltipId.split(";"))
		html += Object.entries(tooltipData).filter(([display]) => !display.startsWith("!")).map(([display, value]) => `<p><span class="font-weight-bold">${display}</span>: ${value}</p>`).join("")
		html += `<div class="tooltip-img"><canvas id="${tooltipData["!canvasId"]}" width="200" height="${tooltipData["!reversed"] ? "320" : "160"}"></div>`
		tooltipData["!portrait"].forEach((portrait, index) => {
			if (!portrait) return
			const image = new Image();
			image.src = `${spriteCollabEndpoint}/portrait${tooltipData["!imgDirPath"]}${data.portraitDict[index % 20]}${index > 19 ? "^" : ""}.png`
			image.onload = () => {
				try {
					const ctx = document.querySelector(`#${tooltipData["!canvasId"]}`).getContext("2d")
					ctx.drawImage(image, (index % 5) * 40, Math.floor(index/5) * 40)
				} catch (e) {}
			}
		})
		return html
	},
	completionPortraits(tooltipId) {
		let html = ""
		let [pokemonId, formId, portraitId] = tooltipId.split(";")
		let tooltipData = tooltipDataGenerator.portraits(...tooltipId.split(";"))
		html += Object.entries(tooltipData).filter(([display]) => !display.startsWith("!")).map(([display, value]) => `<p><span class="font-weight-bold">${display}</span>: ${value}</p>`).join("")
		if (tooltipData["!done"])
			html += `<div class="tooltip-img"><img src="${spriteCollabEndpoint}/portrait${tooltipData["!imgDirPath"]}${data.portraitDict[portraitId % 20]}${portraitId > 19 ? "^" : ""}.png"></img></div>`
		return html
	},
	heatmapPokemon(tooltipId) {
		return this.completionPokemon(tooltipId)
	},
	heatmapForms(tooltipId) {
		return this.completionForms(tooltipId)
	}
}