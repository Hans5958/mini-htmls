var presenceStats = {},
	statsTables = {},
	tableSettings = {
		// "paging": false,
		// "ordering": false,
		// "info": false,
		// "searching": false
	},
	miniTableSettings = {
		"paging": false,
		"ordering": false,
		"info": false,
		"searching": false
	},
	charts = {},
	chartData = {},
	step = 0

const getData = (url, done = () => { }, fail = () => { }, replied = () => { }) => {
	$.getJSON(url)
		.done(response => done(response))
		.fail(response => fail(response))
		.always(() => replied())
}

class List {
	constructor(header, data = []) {
		this.header = header
		this.data = data
	}

	static inArray(list) {
		if (Array.isArray(list.data)) return list.data
		else {
			var arr = []
			Object.keys(list.data).forEach(key => {
				arr.push([])
				Object.values(list.data[key]).forEach(value => {
					arr[arr.length - 1].push(value)
				})
			})
			return arr
		}
	}
}

let initChart = (name, selector, label) => {
	chartData[name] = {
		labels: [],
		datasets: [{
			type: 'bar',
			label: label,
			backgroundColor: "blue",
			data: [],
			borderColor: 'white',
			borderWidth: 0
		}]
	}
	var ctx = document.querySelector(selector).getContext('2d')
	charts[name] = new Chart(ctx, {
		type: 'bar',
		data: chartData[name],
		options: {
			responsive: true,
			title: {
				display: false
			},
			legend: {
				display: false
			},
			tooltips: {
				mode: 'index',
				intersect: true
			}
		}
	})
}

forEveryPresence = callback => {
	Object.keys(presenceStats).forEach(name => {
		callback(presenceStats[name], name)
	})
}

document.addEventListener("DOMContentLoaded", event => {
	var toc = document.querySelector("#toc div div div");
	var headings = [].slice.call(document.querySelectorAll('h2:not(.toc-ignore), h3:not(.toc-ignore), h4:not(.toc-ignore), h5:not(.toc-ignore), h6:not(.toc-ignore)'))
	headings.forEach((heading, index) => {
		var ref = "toc-" + (index + 1)
		if (heading.hasAttribute("id"))
			ref = heading.getAttribute("id")
		else
			heading.setAttribute("id", ref)

		var link = document.createElement("a")
		link.setAttribute("href", `#${ref}`)
		link.textContent = heading.textContent

		var div = document.createElement("div")
		div.setAttribute("class", `toc-${heading.tagName.toLowerCase()}`)
		div.appendChild(link)
		console.log((index >= Math.round(headings.length / 2)) ? 1 : 0)
		toc.children[(index >= Math.round(headings.length / 2)) ? 1 : 0].appendChild(div)
	})
})

// https://gist.github.com/0x263b/2bdd90886c2036a1ad5bcf06d6e6fb37

const getColorHash = str => {
	var hash = 0
	if (str.length === 0) return hash
	for (var i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash)
		hash = hash & hash
	}
	var color = '#'
	for (var i = 0; i < 3; i++) {
		var value = (hash >> (i * 8)) & 255
		color += ('00' + value.toString(16)).substr(-2)
	}
	return color
}

const generalColorHashing = ctx => getColorHash(ctx.chart.data.labels[ctx.dataIndex])

const processData = () => {

	forEveryPresence((presence, name) => {
		if (presence.name === undefined) delete presenceStats[name]
		if (presence.users === undefined) delete presenceStats[name]
	})

	/*
	================================================================
	Table for individual presences.
	================================================================
	*/

	statsTables.presence = new List(["Presence", "Category", "Author", "Users"])
	forEveryPresence(presence => {
		statsTables.presence.data.push([presence.name, presence.metadata.category, presence.metadata.author.name, presence.users])
	})
	$("table#presence").DataTable(tableSettings).rows.add(List.inArray(statsTables.presence)).draw()

	/*
	================================================================
	Table for presence categories.
	================================================================
	*/

	statsTables.category = new List(["Category", "Presences", "Users"], {})
	forEveryPresence(presence => {
		// console.log(statsTables.category.data[presence.metadata.category])
		if (statsTables.category.data[presence.metadata.category] === undefined) {
			statsTables.category.data[presence.metadata.category] = {
				category: presence.metadata.category,
				presences: 0,
				users: 0,
				average: 0
			}
		}
		statsTables.category.data[presence.metadata.category].presences++
		statsTables.category.data[presence.metadata.category].users += presence.users
	})
	Object.keys(statsTables.category.data).forEach(key => {
		statsTables.category.data[key].average = Math.round(statsTables.category.data[key].users / statsTables.category.data[key].presences)
	})
	$("table#category").DataTable(tableSettings).rows.add(List.inArray(statsTables.category)).draw()

	/*
	================================================================
	Table for presence developers.
	================================================================
	*/

	statsTables.author = new List(["Author", "ID", "Presences", "Users"], {})
	forEveryPresence(presence => {
		if (statsTables.author.data[presence.metadata.author.id] === undefined) {
			statsTables.author.data[presence.metadata.author.id] = {
				author: presence.metadata.author.name,
				id: presence.metadata.author.id,
				presences: 0,
				users: 0,
				average: 0
			}
		}
		statsTables.author.data[presence.metadata.author.id].presences++
		statsTables.author.data[presence.metadata.author.id].users += presence.users
	})
	Object.keys(statsTables.author.data).forEach(key => {
		statsTables.author.data[key].average = Math.round(statsTables.author.data[key].users / statsTables.author.data[key].presences)
	})
	$("table#author").DataTable(tableSettings).rows.add(List.inArray(statsTables.author)).draw()

	/*
	================================================================
	Statistics for presences
	================================================================
	*/

	document.querySelector("#presence-1-1 p").textContent = statsTables.presence.data.length
	let presence12 = 0
	statsTables.presence.data.forEach(value => {
		presence12 += Number(value[3])
	})
	document.querySelector("#presence-1-2 p").textContent = presence12

	let presenceTop = [...statsTables.presence.data].sort((a, b) => b[3] - a[3]).map(v => [v[0], v[3]])
	$("#presence-2 div div table").DataTable(miniTableSettings).rows.add(presenceTop.slice(0, 10)).draw()
	$("#presence-3 div div table").DataTable(miniTableSettings).rows.add(presenceTop.slice(5, 15)).draw()

	initChart("presence", "#presence-4 div canvas", "Users")

	chartData.presence.datasets[0].backgroundColor = ctx => presenceStats[ctx.chart.data.labels[ctx.dataIndex]].metadata.color

	let updatePresenceChart = array => {
		chartData.presence.labels = presenceTop.slice(...array).map(v => v[0])
		chartData.presence.datasets[0].data = presenceTop.slice(...array).map(v => v[1])
		charts.presence.update()
	}

	document.querySelector("#presence-4 div select").onchange = () => {
		switch (document.querySelector("#presence-4 div select").value) {
			case '100':
				updatePresenceChart([0, 100])
				break
			case '105':
				updatePresenceChart([0, 105])
				break
			case '105no5':
				updatePresenceChart([5, 105])
				break
			case 'all':
				updatePresenceChart([0, undefined])
				break
			case 'allno5':
				updatePresenceChart([5, undefined])
				break
			case '200':
				updatePresenceChart([100, 200])
				break
			case '300':
				updatePresenceChart([200, 300])
				break
			case '400':
				updatePresenceChart([300, 400])
				break
			case '500':
				updatePresenceChart([400, 500])
				break
		}
	}

	updatePresenceChart([5, 105])
	document.querySelector("#presence-4 div select").value = "105no5"

	/*
	================================================================
	Statistics for categories
	================================================================
	*/

	let category11 = Object.values(statsTables.category.data).length
	document.querySelector("#category-1-1 p").textContent = Object.values(statsTables.category.data).length
	if (category11 > 6) {
		holdup = document.createElement("p")
		holdup.innerHTML = "Hold up. This value should be 6 at all times. Something's wrong here."
		document.querySelector("#category-1-1").appendChild(holdup)
	}
	let category12 = 0, category13 = 0
	Object.values(statsTables.category.data).forEach(value => {
		category12 += Number(value.presences)
		category13 += Number(value.users)
	})
	document.querySelector("#category-1-2 p").textContent = Math.round(category12 / category11)
	document.querySelector("#category-1-3 p").textContent = Math.round(category13 / category11)

	$("#category-2 div div table").DataTable(miniTableSettings).rows.add(Object.values(statsTables.category.data).map(v => [v.category, v.presences]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()
	$("#category-3 div div table").DataTable(miniTableSettings).rows.add(Object.values(statsTables.category.data).map(v => [v.category, v.users]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()
	$("#category-4 div div table").DataTable(miniTableSettings).rows.add(Object.values(statsTables.category.data).map(v => [v.category, v.average]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()

	initChart("category2", "#category-2 div div canvas", "Presences")
	chartData.category2.labels = Object.values(statsTables.category.data).map(v => [v.category, v.presences]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.category2.datasets[0].data = Object.values(statsTables.category.data).map(v => v.presences).sort((a, b) => b - a).slice(0, 10)
	chartData.category2.datasets[0].backgroundColor = generalColorHashing
	charts.category2.update()

	initChart("category3", "#category-3 div div canvas", "Users")
	chartData.category3.labels = Object.values(statsTables.category.data).map(v => [v.category, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.category3.datasets[0].data = Object.values(statsTables.category.data).map(v => v.users).sort((a, b) => b - a).slice(0, 10)
	chartData.category3.datasets[0].backgroundColor = generalColorHashing
	charts.category3.update()

	initChart("category4", "#category-4 div div canvas", "Average")
	chartData.category4.labels = Object.values(statsTables.category.data).map(v => [v.category, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.category4.datasets[0].data = Object.values(statsTables.category.data).map(v => v.average).sort((a, b) => b - a).slice(0, 10)
	chartData.category4.datasets[0].backgroundColor = generalColorHashing
	charts.category4.update()

	/*
	================================================================
	Statistics for presence developers
	================================================================
	*/

	let author11 = Object.values(statsTables.author.data).length
	document.querySelector("#author-1-1 p").textContent = Object.values(statsTables.author.data).length
	let author12 = 0, author13 = 0
	Object.values(statsTables.author.data).forEach(value => {
		author12 += Number(value.presences)
		author13 += Number(value.users)
	})
	document.querySelector("#author-1-2 p").textContent = Math.round(author12 / author11)
	document.querySelector("#author-1-3 p").textContent = Math.round(author13 / author11)

	$("#author-2 div div table").DataTable(miniTableSettings).rows.add(Object.values(statsTables.author.data).map(v => [v.author, v.presences]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()
	$("#author-3 div div table").DataTable(miniTableSettings).rows.add(Object.values(statsTables.author.data).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()
	$("#author-4 div div table").DataTable(miniTableSettings).rows.add(Object.values(statsTables.author.data).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()

	initChart("author2", "#author-2 div div canvas", "Presences")
	chartData.author2.labels = Object.values(statsTables.author.data).map(v => [v.author, v.presences]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.author2.datasets[0].data = Object.values(statsTables.author.data).map(v => v.presences).sort((a, b) => b - a).slice(0, 10)
	chartData.author2.datasets[0].backgroundColor = generalColorHashing
	charts.author2.update()

	initChart("author3", "#author-3 div div canvas", "Users")
	chartData.author3.labels = Object.values(statsTables.author.data).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.author3.datasets[0].data = Object.values(statsTables.author.data).map(v => v.users).sort((a, b) => b - a).slice(0, 10)
	chartData.author3.datasets[0].backgroundColor = generalColorHashing
	charts.author3.update()

	initChart("author4", "#author-4 div div canvas", "Average")
	chartData.author4.labels = Object.values(statsTables.author.data).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.author4.datasets[0].data = Object.values(statsTables.author.data).map(v => v.average).sort((a, b) => b - a).slice(0, 10)
	chartData.author4.datasets[0].backgroundColor = generalColorHashing
	charts.author4.update()

	initChart("author5", "#author-5 div canvas", "")
	chartData.author5.datasets[0].backgroundColor = generalColorHashing

	document.querySelector("#author-5 div select").onchange = () => {
		switch (document.querySelector("#author-5 div select").value) {
			case 'presence':
				chartData.author5.labels = Object.values(statsTables.author.data).map(v => [v.author, v.presences]).sort((a, b) => b[1] - a[1]).map(v => v[0])
				chartData.author5.datasets[0].data = Object.values(statsTables.author.data).map(v => v.presences).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Presences"
				break
			case 'presencenotop':
				chartData.author5.labels = Object.values(statsTables.author.data).map(v => [v.author, v.presences]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(1)
				chartData.author5.datasets[0].data = Object.values(statsTables.author.data).map(v => v.presences).sort((a, b) => b - a).slice(1)
				chartData.author5.datasets[0].label = "Presences"
				break
			case 'user':
				chartData.author5.labels = Object.values(statsTables.author.data).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0])
				chartData.author5.datasets[0].data = Object.values(statsTables.author.data).map(v => v.users).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Users"
				break
			case 'usernotop':
				chartData.author5.labels = Object.values(statsTables.author.data).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(2)
				chartData.author5.datasets[0].data = Object.values(statsTables.author.data).map(v => v.users).sort((a, b) => b - a).slice(2)
				chartData.author5.datasets[0].label = "Users"
				break
			case 'average':
				chartData.author5.labels = Object.values(statsTables.author.data).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0])
				chartData.author5.datasets[0].data = Object.values(statsTables.author.data).map(v => v.average).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Average"
				break
			case 'averagenotop':
				chartData.author5.labels = Object.values(statsTables.author.data).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(2)
				chartData.author5.datasets[0].data = Object.values(statsTables.author.data).map(v => v.average).sort((a, b) => b - a).slice(2)
				chartData.author5.datasets[0].label = "Average"
				break
		}
		charts.author5.update()
	}

	chartData.author5.labels = Object.values(statsTables.author.data).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(2)
	chartData.author5.datasets[0].data = Object.values(statsTables.author.data).map(v => v.users).sort((a, b) => b - a).slice(2)
	chartData.author5.datasets[0].label = "Users"
	charts.author5.update()
	document.querySelector("#author-5 div select").value = "usernotop"
}


const getDataCallback = () => {
	step++
	console.log(step)
	document.querySelector("#title .status").textContent = `Fetching data... (${step}/2)`
	document.querySelector("#title .progress-bar").style.width = `${(step / 2) * 100}%`
	if (step === 2) {
		console.log(document.readyState)
		document.querySelector("#title .status").textContent = `All data fetched! Fetched on ${(new Date()).toString()}`
		document.querySelector("#main").removeAttribute("hidden")
		document.querySelector("#toc").removeAttribute("hidden")
		if (document.readyState === "complete" || document.readyState === "interactive") processData()
		else document.addEventListener("DOMContentLoaded", event => processData())
	}

}

getData("https://api.premid.app/v2/presences", response => {
	response.forEach(value => {
		if (typeof presenceStats[value.name] === "undefined") presenceStats[value.name] = {}
		Object.keys(value).forEach(key => {
			presenceStats[value.name][key] = value[key]
		})
	})
	getDataCallback()
})

getData("https://api.premid.app/v2/presenceUsage", response => {
	Object.keys(response).forEach(name => {
		if (typeof presenceStats[name] === "undefined") presenceStats[name] = {}
		presenceStats[name].users = response[name]
	})
	getDataCallback()
})

// getData("/assets/other/premid-presence-stats/static-data.json", response => {
// 	presenceStats = response
// 	forEveryPresence((presence, name) => {
// 		if (presence.name === undefined) delete presenceStats[name]
// 		if (presence.users === undefined) delete presenceStats[name]
// 	})
// 	document.addEventListener("DOMContentLoaded", event => processData())
// })