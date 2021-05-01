import { createPopper } from 'https://cdn.skypack.dev/@popperjs/core'

let tempHidden = false

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
	const squareElement = target
	const gridElement = target.parentElement
	if (!gridElement.dataset.tooltipFields) {
		tempHidden = true
		hideTooltip()
		return
	}
	if (tempHidden) {
		tempHidden = false
		showTooltip()
	}
	console.log(target)
	virtualElement.getBoundingClientRect = generateGetBoundingClientRect(x, y)
	const fields = gridElement.dataset.tooltipFields.split(",")
	const fieldDisplay = {}
	fields.forEach((v, i) => {
		fieldDisplay[v] = gridElement.dataset.tooltipFieldDisplay.split(",")[i]
	})
	tooltipElement.innerHTML = ""
	tooltipElement.insertAdjacentHTML(
		"beforeend", 
		fields.map(field => `<span class="font-weight-bold">${fieldDisplay[field]}</span>: ${squareElement.dataset[field]}`).join("<br />")
	)
	instance.update()
}

const showTooltip = event => {
	tooltip.removeAttribute("hidden");
	instance.setOptions({
		modifiers: [{ name: 'eventListeners', enabled: true }],
	});
	if (!tempHidden) document.addEventListener('mousemove', updateTooltip)
}

const hideTooltip = event => {
	tooltip.hidden = true;
	instance.setOptions({
		modifiers: [{ name: 'eventListeners', enabled: false }],
	})
	if (!tempHidden) document.removeEventListener('mousemove', updateTooltip);
}

document.querySelectorAll(".viz-grid").forEach(element => {
	element.addEventListener("mouseenter", showTooltip)
	element.addEventListener("mouseleave", hideTooltip)
})
