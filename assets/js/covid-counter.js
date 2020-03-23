let varsToCheck = [], varsChecked = 0, timer = 0, statusProgressBar = "fetch"

var parseToHTML = (raw) => (new DOMParser()).parseFromString(raw, 'text/html')

const getData = (url, type, done = () => {}, fail = () => {}, replied = () => {}) => {
	if (type === "json") {
		$.getJSON(url)
			.done(response => done(response))
			.fail(response => fail(response))
			.always(() => replied())
	} else if (type === "html") {
		$.get(url)
			.done(response => done(parseToHTML(response)))
			.fail(response => fail(parseToHTML(response)))
			.always(() => replied())
	}
}

class Counter {
	constructor(name, elementID, {url, doneCallback = () => {}, failCallback = () => {}, repliedCallback = () => {}, applyCallback = () => {}, resetCallback = () => {}}) {
		this.name = name
		this.elementID = elementID
		this.url = url
		this.doneCallback = doneCallback
		this.failCallback = failCallback
		this.repliedCallback = repliedCallback
		this.values = {}
		this.applyCallback = applyCallback
		this.resetCallback = resetCallback
		this.attach()
	}

	apply() {
		this.applyCallback()
		document.querySelector(`#${this.elementID}.section .counter-main`).textContent = this.values.currentConfirmed
		document.querySelector(`#${this.elementID}.section .progress-active`).style.width = `${((this.values.currentConfirmed - this.values.currentDeaths - this.values.currentRecovered)/this.values.currentConfirmed)*100}%`
		document.querySelector(`#${this.elementID}.section .progress-deaths`).style.width = `${(this.values.currentDeaths/this.values.currentConfirmed)*100}%`
		document.querySelector(`#${this.elementID}.section .progress-recovered`).style.width = `${(this.values.currentRecovered/this.values.currentConfirmed)*100}%`
		document.querySelector(`#${this.elementID}.section .counter-active`).textContent = this.values.currentConfirmed - this.values.currentDeaths - this.values.currentRecovered
		document.querySelector(`#${this.elementID}.section .counter-deaths`).textContent = this.values.currentDeaths
		document.querySelector(`#${this.elementID}.section .counter-recovered`).textContent = this.values.currentRecovered
		document.querySelector(`#${this.elementID}.section .lastupdated`).textContent = `Last updated: ${dayjs(this.values.lastUpdated).fromNow()}`
		// document.querySelector(`#${this.elementID}.section .lastupdated`).textContent = `Last updated: ${dayjs(this.values.lastUpdated).format("HH:mm:ss DD/MM/YY")}` 
	}

	reset() {
		this.resetCallback()
		this.values = {}
	}

	async fetch() {
		return new Promise (async callback => {
			if (Array.isArray(this.url)) {
				var urlToFetch = this.url[~~(this.url.length * Math.random())]
			} else {
				var urlToFetch = this.url
			}
			if (!Array.isArray(urlToFetch)) {
				urlToFetch = [urlToFetch, "json"]
			}
			getData(
				urlToFetch[0], 
				urlToFetch[1],
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
		})
	}

	attach() {
		varsToCheck = varsToCheck.filter(e => e !== this.name).concat(this.name)
	}

	detach() {
		varsToCheck = varsToCheck.filter(e => e !== this.name)
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
				document.querySelector("#status .progress-bar").style.width = `${(varsChecked/varsToCheck.length)*100}%`
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

// var TheVirusTracker = new Counter("TheVirusTracker", "thevirustracker", {
// 	url: "https://thevirustracker.com/free-api?global=stats",
// 	doneCallback: (data) => {
// 		if (TheVirusTracker.values === {} ? false : TheVirusTracker.values.currentConfirmed === data.results[0].total_cases) {
// 			return TheVirusTracker.values
// 		} else {
// 			return {
// 				"currentConfirmed": data.results[0].total_cases,
// 				"currentDeaths": data.results[0].total_deaths,
// 				"currentRecovered": data.results[0].total_recovered,
// 				"lastUpdated": new Date()
// 			}
// 		}
// 	}
// })

// var worldometers = new Counter("worldometers", "worldometers", {
// 	url: [
// 		"https://corona.lmao.ninja/all", 								// https://github.com/NovelCOVID/API
// 		"https://coronavirus-19-api.herokuapp.com/all",			 		// https://github.com/javieraviles/covidAPI
// 		"https://covid19-server.chrismichael.now.sh/api/v1/AllReports"	// https://github.com/ChrisMichaelPerezSantiago/covid19
// 	],
// 	doneCallback: (data, urlToFetch) => {
// 		switch(urlToFetch) {
// 			case "https://covid19-server.chrismichael.now.sh/api/v1/AllReports":
// 				return {currentConfirmed: data.reports[0].cases}
// 			default:
// 				return {currentConfirmed: data.cases}
// 		}
// 	}
// })

var worldometers = new Counter("worldometers", "worldometers", {
	url: [["https://www.worldometers.info/coronavirus/", "html"]],
	doneCallback: (data, urlToFetch) => {
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
	},
	applyCallback: () => {
		getData("https://corona.lmao.ninja/all", "json", (data) => {
			worldometers.values.lastUpdated = new Date(data.updated)
			worldometers.applyCallback = () => {}
			worldometers.apply()
		})
	}
})


// var JohnsHopkins = new Counter("JohnsHopkins", "johnshopkins", {
// 	url: [
// 		"https://coronavirus-tracker-api.herokuapp.com/v2/latest",					// https://github.com/ExpDev07/coronavirus-tracker-api
// 		"https://covid2019-api.herokuapp.com/v2/total",								// https://github.com/nat236919/Covid2019API (kinda needs CORS)
// 		"https://covid19.mathdro.id/api",											// https://github.com/mathdroid/covid-19-api
// 		"https://wuhan-coronavirus-api.laeyoung.endpoint.ainize.ai/jhu-edu/brief",	// https://github.com/Laeyoung/COVID-19-API
// 		"https://covid19-api.yggdrasil.id/"											// https://github.com/ChrisMichaelPerezSantiago/covid19
// 	],
// 	// https://the2019ncov.com/ - https://api.the2019ncov.com/api/cases
// 	doneCallback: (data, urlToFetch) => {
// 		resultObj = {}
// 		switch(urlToFetch) {
// 			case "https://coronavirus-tracker-api.herokuapp.com/v2/latest":
// 				resultObj.currentConfirmed = data.latest.confirmed
// 				break
// 			case "https://covid2019-api.herokuapp.com/v2/total":
// 				resultObj.currentConfirmed = data.data.confirmed
// 				break
// 			case "https://covid19.mathdro.id/api":
// 				resultObj.currentConfirmed = data.confirmed.value
// 				break
// 			case "https://wuhan-coronavirus-api.laeyoung.endpoint.ainize.ai/jhu-edu/brief":
// 				resultObj.currentConfirmed = data.confirmed
// 				break
// 			case "https://covid19-api.yggdrasil.id/":
// 				resultObj.currentConfirmed = data.confirmed
// 				break
// 			}
// 		return resultObj
// 	}
// })

var JohnsHopkins = new Counter("JohnsHopkins", "johnshopkins", {
	url: "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&outFields=%22Last_Update,Confirmed,Deaths,Recovered%22&returnGeometry=false",
	// https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&outFields=*&outStatistics=[{%22statisticType%22:%22sum%22,%22onStatisticField%22:%22Confirmed%22,%22outStatisticFieldName%22:%22confirmed%22},{%22statisticType%22:%22sum%22,%22onStatisticField%22:%22Deaths%22,%22outStatisticFieldName%22:%22deaths%22},{%22statisticType%22:%22sum%22,%22onStatisticField%22:%22Recovered%22,%22outStatisticFieldName%22:%22recovered%22}]
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


var WHO = new Counter("WHO", "who", {
	url: "https://services.arcgis.com/5T5nSi527N4F7luB/arcgis/rest/services/Cases_by_country_pt_V3/FeatureServer/0/query?f=json&where=1=1&outFields=*&outStatistics=[{%22statisticType%22:%22sum%22,%22onStatisticField%22:%22cum_conf%22,%22outStatisticFieldName%22:%22confirmed%22},{%22statisticType%22:%22sum%22,%22onStatisticField%22:%22cum_death%22,%22outStatisticFieldName%22:%22deaths%22}]",
	doneCallback: (data) => {
		if (WHO.values === {} ? false : WHO.values.currentConfirmed === data.features[0].attributes.confirmed) {
			return WHO.values
		} else {
			return {
				"currentConfirmed": data.features[0].attributes.confirmed,
				"currentDeaths": data.features[0].attributes.deaths,
				"currentRecovered": 0,
				"lastUpdated": new Date()
			}
		}
	},
	applyCallback: () => {
		getData("https://services.arcgis.com/5T5nSi527N4F7luB/arcgis/rest/services/nCoV_dashboard_time_stamp/FeatureServer/0/query?f=json&where=1%3D1&returnGeometry=false&outFields=*&resultOffset=0&resultRecordCount=1", "json", (data) => {
			WHO.values.lastUpdated = dayjs(`${data.features[0].attributes.Last_Updated_at__}+01:00`,  "DD/MM/YYYY HH:mmZ").$d
			WHO.applyCallback = () => {}
			WHO.apply()
		})
	}
})

var Wikipedia = new Counter("Wikipedia", "wikipedia", {
	url: "https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Template:2019%E2%80%9320_coronavirus_pandemic_data&rvprop=content|timestamp&formatversion=2&rvslots=*&format=json",
	doneCallback: (data) => {
		var numberData = [...data.query.pages[0].revisions[0].slots.main.content.matchAll(/! class="covid-total-row" style="padding-left:3px;" scope="row" \| '''(.+)'''/g)]
		return {
			"currentConfirmed": parseInt(numberData[0][1].split(",").join("")),
			"currentDeaths": parseInt(numberData[1][1].split(",").join("")),
			"currentRecovered": parseInt(numberData[2][1].split(",").join("")),
			"lastUpdated": new Date(data.query.pages[0].revisions[0].timestamp)
		}
	}
	// Google: https://google.org/crisisresponse/covid19-map
	// Bing: https://www.bing.com/covid/data (requires CORS)
})


var Indonesia = new Counter("Indonesia", "indonesia", {
	url: "https://services5.arcgis.com/VS6HdKS0VfIhv8Ct/arcgis/rest/services/Statistik_Perkembangan_COVID19_Indonesia/FeatureServer/0/query?f=json&where=(Jumlah_Kasus_Kumulatif%20%3C%3E%20null)&outFields=%22Jumlah_Kasus_Kumulatif,Jumlah_Pasien_Meninggal,Jumlah_Pasien_Sembuh,Tanggal%22&returnGeometry=false&orderByFields=Jumlah_Kasus_Kumulatif",
	doneCallback: (data) => {
		return {
			"currentConfirmed": data.features[data.features.length-1].attributes.Jumlah_Kasus_Kumulatif,
			"currentDeaths": data.features[data.features.length-1].attributes.Jumlah_Pasien_Meninggal,
			"currentRecovered": data.features[data.features.length-1].attributes.Jumlah_Pasien_Sembuh,
			"lastUpdated": new Date(data.features[data.features.length-1].attributes.Tanggal)
		}
	},
	applyCallback: () => {
		getData("https://services5.arcgis.com/VS6HdKS0VfIhv8Ct/arcgis/rest/services/Statistik_Perkembangan_COVID19_Indonesia/FeatureServer/0?f=json", "json", (data) => {
			Indonesia.values.lastUpdated = new Date(data.editingInfo.lastEditDate)
			Indonesia.applyCallback = () => {}
			Indonesia.apply()
		})
	}
})




dayjs.extend(dayjs_plugin_relativeTime)
dayjs.extend(dayjs_plugin_customParseFormat)
dayjs.extend(dayjs_plugin_utc)

$(document).ready(async () => {
	document.querySelector("#status p").textContent = "Testing for cross-origin request ability... (If this text won't disappear, please refresh.)"
	// var isCORS = await (async () => {
	// 	new Promise(callback => {
	// 		getData("https://en.wikipedia.org/w/api.php", "html", () => {
	// 			callback(true)
	// 		}, () => {
	// 			callback(false)
	// 		})
	// 	})
	// })(bool => {return bool})
	// console.log(isCORS)

	getData("https://en.wikipedia.org/w/api.php", "html", () => {
	}, () => {
		Wikipedia.detach()
		document.querySelector("#wikipedia").style.display = "none"
		worldometers.url = "https://corona.lmao.ninja/all"
		worldometers.doneCallback = (data, urlToFetch) => {
			return {
				"currentConfirmed": data.cases,
				"currentDeaths": data.deaths,
				"currentRecovered": data.recovered,
				"lastUpdated": new Date(data.updated)
			} 
		}
	}, () => {
		Counter.resetAll()
		execute()
		setInterval(
			() => {
				timer++
				if (statusProgressBar === "timer") {
					document.querySelector("#status p").textContent = `Waiting... (${((1000-timer)/100).toFixed(2)}s)`
					document.querySelector("#status .progress-bar").style.width = `${(timer/1000)*100}%`
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
	})
})

const execute = async () => {
	await Counter.fetchAll()
	Counter.applyAll()
}