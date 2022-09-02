let countersToCheck = [], 
	countersChecked = 0, 
	statusProgressBar = "fetch", 
	isCors = true
const timerSet = 10000

var parseToHTML = (raw) => (new DOMParser()).parseFromString(raw, 'text/html')

const getData = (url, type, done = () => {}, fail = () => {}, replied = () => {}) => {
	fetch(url)
		.then(async response => {
			if (type === "json") {
				done(await response.json())
			} else if (type === "html") {
				done(parseToHTML(await response.text()))
			}
			replied()
		})
		.catch(response => {
			fail(response)
			replied(response)
		})
}

const counters = []
const addCounter = counter => {
	const index = counters
	counters.push(new Counter(counter, index))
}

class Counter {
	constructor({
		name,
		elementID,
		url,
		callback,
		values
	},
	index) {
		this.index = index
		this.name = name
		this.elementID = elementID
		this.url = url
		this.callback = {
			done: () => {}, 
			fail: () => {}, 
			replied: () => {}, 
			apply: () => {}, 
			reset: () => {},
		}
		if (callback) this.callback = {
			...this.callback,
			...callback
		}
		this.values = values || {}
		this.section = document.querySelector(`#${this.elementID}.section`)
		if (this.section) this.attached = true
	}

	apply() {
		this.callback.apply()
		const section = this.section
		const { currentConfirmed, currentDeaths, currentRecovered } = this.values
		section.querySelector(`.counter-main`).textContent = currentConfirmed
		section.querySelector(`.progress-active`).style.width = `${((currentConfirmed - currentDeaths - currentRecovered) / currentConfirmed) * 100}%`
		section.querySelector(`.progress-deaths`).style.width = `${(currentDeaths / currentConfirmed) * 100}%`
		section.querySelector(`.progress-recovered`).style.width = `${(currentRecovered / currentConfirmed) * 100}%`
		section.querySelector(`.counter-active`).textContent = currentConfirmed - currentDeaths - currentRecovered
		section.querySelector(`.counter-deaths`).textContent = currentDeaths
		section.querySelector(`.counter-recovered`).textContent = currentRecovered
		section.querySelector(`.lastupdated`).textContent = `Last updated: ${dayjs(this.values.lastUpdated).fromNow()}`
	}

	reset() {
		this.callback.reset()
		this.values = {}
	}

	async fetch() {
		return new Promise(async callback => {
			let urlToFetch
			if (isCors) {
				if (this.url.noCors) {
					urlToFetch = this.url.noCors[~~(this.url.noCors.length * Math.random())]
				} else if (this.url.cors) {
					urlToFetch = this.url.cors[~~(this.url.cors.length * Math.random())]
				}
			} else {
				if (this.url.cors) {
					urlToFetch = this.url.cors[~~(this.url.cors.length * Math.random())]
				}
			}
			if (urlToFetch) {
				getData(
					...urlToFetch,
					async (data) => {
						let newValues = data
						newValues = this.callback.done(data, urlToFetch[0])
						this.values = newValues
					},
					this.callback.fail,
					() => {
						this.callback.replied()
						callback()
					}
				)	
			} else {
				this.callback.fail()
				this.callback.replied()
				callback()
			}
		})
	}

	attach() {
		this.attached = true
		this.section = document.querySelector(`#${this.elementID}.section`)
		this.section.style.display = ""
	}

	detach() {
		this.attached = false
		if (Object.keys(this.values).length === 0) {
			if (this.section) this.section.style.display = "none"
			this.apply()
		}
	}

	static applyAll() {
		const attachedCounters = counters.filter(counter => counter.attached)
		for (const i in attachedCounters) {
			const counter = attachedCounters[i]
			counter.apply()
		}
	}

	static resetAll() {
		const attachedCounters = counters.filter(counter => counter.attached)
		for (const i in attachedCounters) {
			const counter = attachedCounters[i]
			counter.reset()
		}
	}
	
	static async fetchAll() {
		const attachedCounters = counters.filter(counter => counter.attached)
		document.querySelector("#status p").textContent = `Fetching data... (0/${attachedCounters.length})`
		document.querySelector("#status .progress-bar").style.transition = "width .25s ease"
		await Promise.all(
			attachedCounters.map(async counter => {
				await counter.fetch()
				countersChecked++
				document.querySelector("#status p").textContent = `Fetching data... (${countersChecked}/${attachedCounters.length})`
				document.querySelector("#status .progress-bar").style.width = `${(countersChecked / attachedCounters.length) * 100}%`
			})
		)
		countersChecked = 0
		document.querySelector("#status p").textContent = "All data fetched!"
		setTimeout(() => {
			document.querySelector("#status .progress-bar").style.transition = "unset"
			statusProgressBar = "timer"
		}, 1000)
	}

}

addCounter({
	name: "worldometers", 
	elementID: "worldometers", 
	url: {
		noCors: [
			["https://www.worldometers.info/coronavirus/", "html"]
		],
		cors: [
			["https://disease.sh/v3/covid-19/all", "json"]
		]
	},
	callback: {
		done: (data, urlToFetch) => {
			if (urlToFetch === "https://www.worldometers.info/coronavirus/") {
				var returnedObj = {
					"currentConfirmed": parseInt(data.querySelector(".content-inner > div:nth-child(7) > div:nth-child(2) > span").textContent.split(",").join("")),
					"currentDeaths": parseInt(data.querySelector(".content-inner > div:nth-child(9) > div:nth-child(2) > span").textContent.split(",").join("")),
					"currentRecovered": parseInt(data.querySelector(".content-inner > div:nth-child(10) > div:nth-child(2) > span").textContent.split(",").join("")),
					"lastUpdated": new Date()
				}
				if (worldometers.values === {} ? false : worldometers.values.currentConfirmed === returnedObj.currentConfirmed) {
					return worldometers.values
				} else {
					return returnedObj
				}	
			} else if (urlToFetch === "https://disease.sh/v3/covid-19/all") {
				return {
					"currentConfirmed": data.cases,
					"currentDeaths": data.deaths,
					"currentRecovered": data.recovered,
					"lastUpdated": new Date()
				}
			}
		},
		apply: () => {
			getData("https://disease.sh/v3/covid-19/all", "json", (data) => {
				this.values.lastUpdated = new Date(data.updated)
				this.callback.apply = () => { }
				this.apply()
			})
		}
	}
})


addCounter({
	name: "JohnsHopkins", 
	elementID: "johnshopkins",
	url: {
		cors: [
			["https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&outFields=%22Last_Update,Confirmed,Deaths,Recovered%22&returnGeometry=false", "json"]
		]
	},
	callback: {
		done: (data, urlToFetch) => {
			resultObj = {
				"currentConfirmed": 0,
				"currentDeaths": 0,
				"currentRecovered": 0,
				"lastUpdated": 0
			}
			data.features.forEach(value => {
				resultObj.currentConfirmed += value.attributes.Confirmed
				resultObj.currentDeaths += value.attributes.Deaths
				resultObj.currentRecovered += value.attributes.Recovered
				if (resultObj.lastUpdated < value.attributes.Last_Update) {
					resultObj.lastUpdated = value.attributes.Last_Update
				}
			})
	
			resultObj.lastUpdated = new Date(resultObj.lastUpdated)
			return resultObj
		}
	}
})

addCounter({
	name: "Indonesia", 
	elementID: "indonesia",
	url: {
		noCors: [
			["https://data.covid19.go.id/public/api/update.json", "json"]
		]
	},
	callback: {
		done: data => {
			return {
				"currentConfirmed": data.update.total.jumlah_positif,
				"currentDeaths": data.update.total.jumlah_meninggal,
				"currentRecovered": data.update.total.jumlah_sembuh,
				"lastUpdated": new Date(data.update.penambahan.created)
			}
		}
	}
})

addCounter({
	name: "IHME", 
	elementID: "ihme",
	url: {
		noCors: [
			["https://healthmap.org/covid-19/latestCounts.json", "json"]
		]
	},
	callback: {
		done: (data) => {
			if (this.values === {} ? false : this.values.currentConfirmed === parseInt(data[0].caseCount.split(",").join(""))) {
				return this.values
			} else {
				return {
					"currentConfirmed": parseInt(data[0].caseCount.split(",").join("")),
					"currentDeaths": 0,
					"currentRecovered": 0,
					"lastUpdated": new Date()
				}
			}
		},
		apply: () => {
			getData("https://api.github.com/repos/beoutbreakprepared/nCoV2019/commits", "json", (data) => {
				this.values.lastUpdated = new Date(data[0].commit.committer.date)
				this.callback.apply = () => { }
				this.apply()
			})
		}
	},
	values: {
		"currentConfirmed": 71503614,
		"currentDeaths": 0,
		"currentRecovered": 0,
		"lastUpdated": new Date("2021-03-31T18:44:40.000Z")
	}
})

dayjs.extend(dayjs_plugin_relativeTime)
dayjs.extend(dayjs_plugin_customParseFormat)

$(document).ready(async () => {
	document.querySelector("#status p").textContent = "Testing for cross-origin request ability... (If this text won't disappear, please refresh.)"

	isCors = await window.checkCors()

	if (!isCors) {
		counters.forEach(counter => {
			if (!counter.url.cors && !counter.values.currentConfirmed) counter.detach()
		})
	}

	// Counter.resetAll()
	execute()
	let targetTime = Date.now() + timerSet
	setInterval(() => {
		let timer = (targetTime - Date.now())/1000
		if (statusProgressBar === "timer") {
			document.querySelector("#status p").textContent = `Waiting... (${timer.toFixed(2)}s)`
			document.querySelector("#status .progress-bar").style.width = `${100 - (timer / 10) * 100}%`
		}
		if (timer <= 0) {
			statusProgressBar = "fetch"
			document.querySelector("#status .progress-bar").style.width = "0"
			targetTime += timerSet
			execute()
		}
	}, 10)
})

const execute = async () => {
	await Counter.fetchAll()
	Counter.applyAll()
}