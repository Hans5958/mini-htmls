/**
 * Static data entry point for the PreMiD presence stats page.
 *
 * Loads a dump and the locale map with `fetch()`, then hands the data to the
 * shared renderer. Works as a plain ES module (no bundler required).
 *
 * A `<select id="dataset-select">` in the header lets the user switch between
 * available data dumps without reloading the page. Each dump is fetched once
 * and cached for subsequent switches.
 */

import { renderStatistics, renderToc, teardown } from "../shared.js"

const LOCALE_FILE = "./locale.json"
const DATASETS = {
	"static-data.json": {
		file: "./static-data.json",
		label: "static-data.json"
	},
	"static-data-2026.json": {
		file: "./static-data-2026.json",
		label: "static-data-2026.json"
	}
}
const TOTAL_STEPS = 3

let step = 0
const cache = new Map()

const setProgress = (details, increment = true) => {
	if (increment) step++
	const status = document.querySelector("#title .status")
	const bar = document.querySelector("#title .progress-bar")
	if (status) status.textContent = details
	if (bar) bar.style.width = `${(step / TOTAL_STEPS) * 100}%`
}

const fetchJson = async url => {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
	return response.json()
}

const loadLocale = async () => {
	if (cache.has(LOCALE_FILE)) return cache.get(LOCALE_FILE)
	const locale = await fetchJson(LOCALE_FILE)
	cache.set(LOCALE_FILE, locale)
	return locale
}

const loadDataset = async name => {
	const { file } = DATASETS[name]
	if (cache.has(file)) return cache.get(file)
	const rawPresence = await fetchJson(file)
	cache.set(file, rawPresence)
	return rawPresence
}

const initDatasetSelect = () => {
	const select = document.querySelector("#dataset-select")
	if (!select) return

	Object.keys(DATASETS).forEach(name => {
		const option = document.createElement("option")
		option.value = name
		option.textContent = DATASETS[name].label
		select.appendChild(option)
	})

	select.value = Object.keys(DATASETS)[0]
	select.onchange = () => renderDataset(select.value)
}

const renderDataset = async name => {
	try {
		setProgress(`Preparing... (1/2)`)
		const locale = await loadLocale()
		setProgress(`Preparing... (2/2)`)

		setProgress(`Loading ${DATASETS[name].label}...`)
		const rawPresence = await loadDataset(name)

		setProgress(`All data loaded! Loaded on ${new Date()}`)

		document.querySelector("#main-stats").removeAttribute("hidden")
		document.querySelector("#main-tables").removeAttribute("hidden")
		document.querySelector("#toc").removeAttribute("hidden")

		teardown()
		renderStatistics({ rawPresence, locale })
	} catch (error) {
		console.error(error)
		const status = document.querySelector("#title .status")
		if (status) status.textContent = `Failed to load stats: ${error.message}`
	}
}

const boot = async () => {
	if (window.jQuery && window.jQuery.fn && window.jQuery.fn.dataTable) {
		window.jQuery.fn.dataTable.ext.errMode = "none"
	}

	renderToc()
	initDatasetSelect()

	await renderDataset(Object.keys(DATASETS)[0])
}

document.addEventListener("DOMContentLoaded", () => {
	boot().catch(error => {
		console.error(error)
		const status = document.querySelector("#title .status")
		if (status) status.textContent = `Failed to load stats: ${error.message}`
	})
})