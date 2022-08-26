let varsToCheck = [], varsChecked = 0, timer = 0, statusProgressBar = "fetch", isCors = true

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

class Counter {
	constructor({
		name,
		elementID,
		url,
		doneCallback = () => { }, 
		failCallback = () => { }, 
		repliedCallback = () => { }, 
		applyCallback = () => { }, 
		resetCallback = () => { },
		values
	}) {
		this.name = name
		this.elementID = elementID
		this.url = url
		this.doneCallback = doneCallback
		this.failCallback = failCallback
		this.repliedCallback = repliedCallback
		this.values = values || {}
		this.applyCallback = applyCallback
		this.resetCallback = resetCallback
		this.section = document.querySelector(`#${this.elementID}.section`)
		this.attach()
	}

	apply() {
		this.applyCallback()
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
		this.resetCallback()
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
						var newValues = this.doneCallback(data, urlToFetch[0])
						Object.keys(newValues).forEach(key => {
							if (this.values[key] === undefined || this.values[key] < newValues[key]) {
								this.values[key] = newValues[key]
							}
						})
					},
					this.failCallback,
					() => {
						this.repliedCallback()
						callback()
					}
				)	
			} else {
				this.failCallback()
				this.repliedCallback()
				callback()
			}
		})
	}

	attach() {
		varsToCheck = varsToCheck.filter(e => e !== this.name).concat(this.name)
		this.section.style.display = ""
	}

	detach() {
		varsToCheck = varsToCheck.filter(e => e !== this.name)
		if (Object.keys(this.values).length === 0) {
			this.section.style.display = "none"
			this.apply()
		}
	}

	static applyAll() {
		varsToCheck.forEach(value => {
			window[value].apply()
		})
	}

	static resetAll() {
		varsToCheck.forEach(value => {
			window[value].reset()
		})
	}

	static async fetchAll() {
		return new Promise(async callback => {
			varsToCheck.forEach(async value => {
				document.querySelector("#status .progress-bar").style.transition = "width .25s ease"
				await window[value].fetch()
				varsChecked++
				document.querySelector("#status p").textContent = `Fetching data... (${varsChecked}/${varsToCheck.length})`
				document.querySelector("#status .progress-bar").style.width = `${(varsChecked / varsToCheck.length) * 100}%`
				if (varsChecked === varsToCheck.length) {
					varsChecked = 0
					document.querySelector("#status p").textContent = "All data fetched!"
					setTimeout(() => {
						document.querySelector("#status .progress-bar").style.transition = "unset"
						statusProgressBar = "timer"
					}, 1000)
					callback()
				}
			})
		})
	}

}

var worldometers = new Counter({
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
	doneCallback: (data, urlToFetch) => {
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
	applyCallback: () => {
		getData("https://disease.sh/v3/covid-19/all", "json", (data) => {
			worldometers.values.lastUpdated = new Date(data.updated)
			worldometers.applyCallback = () => { }
			worldometers.apply()
		})
	}
})


var JohnsHopkins = new Counter({
	name: "JohnsHopkins", 
	elementID: "johnshopkins",
	url: {
		cors: [
			["https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&outFields=%22Last_Update,Confirmed,Deaths,Recovered%22&returnGeometry=false", "json"]
		]
	},
	doneCallback: (data, urlToFetch) => {
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
})

var Indonesia = new Counter({
	name: "Indonesia", 
	elementID: "indonesia",
	url: {
		noCors: [
			["https://data.covid19.go.id/public/api/update.json", "json"]
		]
	},
	doneCallback: (data) => {
		return {
			"currentConfirmed": data.update.total.jumlah_positif,
			"currentDeaths": data.update.total.jumlah_meninggal,
			"currentRecovered": data.update.total.jumlah_sembuh,
			"lastUpdated": new Date(data.update.penambahan.created)
		}
	},
})

var IHME = new Counter({
	name: "IHME", 
	elementID: "ihme",
	url: {
		noCors: [
			["https://healthmap.org/covid-19/latestCounts.json", "json"]
		]
	},
	doneCallback: (data) => {
		if (IHME.values === {} ? false : IHME.values.currentConfirmed === parseInt(data[0].caseCount.split(",").join(""))) {
			return IHME.values
		} else {
			return {
				"currentConfirmed": parseInt(data[0].caseCount.split(",").join("")),
				"currentDeaths": 0,
				"currentRecovered": 0,
				"lastUpdated": new Date()
			}
		}
	},
	applyCallback: () => {
		getData("https://api.github.com/repos/beoutbreakprepared/nCoV2019/commits", "json", (data) => {
			IHME.values.lastUpdated = new Date(data[0].commit.committer.date)
			IHME.applyCallback = () => { }
			IHME.apply()
		})
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

	getData("https://en.wikipedia.org/w/api.php", "html", () => {
	}, () => {
		isCors = false
		Indonesia.detach()
	}, () => {
		// Counter.resetAll()
		execute()
		setInterval(
			() => {
				timer++
				if (statusProgressBar === "timer") {
					document.querySelector("#status p").textContent = `Waiting... (${((1000 - timer) / 100).toFixed(2)}s)`
					document.querySelector("#status .progress-bar").style.width = `${(timer / 1000) * 100}%`
				}
				if (timer === 1000) {
					statusProgressBar = "fetch"
					document.querySelector("#status p").textContent = `Fetching data... (0/${varsToCheck.length})`
					document.querySelector("#status .progress-bar").style.width = "0"
					timer = 0
					execute()
				}
			}, 10
		)
		odometerStyle = document.querySelector("#odometer-style").textContent
		document.querySelector("#odometer-style").textContent = ""
		setTimeout(() => {
			document.querySelector("#odometer-style").textContent = odometerStyle
		}, 10000)
	})
})

const execute = async () => {
	await Counter.fetchAll()
	Counter.applyAll()
}