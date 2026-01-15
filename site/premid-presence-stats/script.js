let data = {
		presence: {},
		category: {},
		author: {},
		lang: {},
		partner: []
	},
	tables = {},
	tableData = {},
	tableSettings = {
		// "paging": false,
		// "ordering": false,
		// "info": false,
		// "searching": false
		"columnDefs": [{
			"targets": 0,
			"className": 'details-control',
			"orderable": false
		}],
		"order": [
			[1, 'asc']
		]
	},
	miniTableSettings = {
		paging: false,
		ordering: false,
		info: false,
		searching: false
	},
	charts = {},
	chartData = {},
	step = 0,
	totalSteps = 3,
	imgurAllow = false,
	totalUsers = 0

const langNames = new Intl.DisplayNames(['en'], { type: 'language' });

/**
 * Simple $.getJSON wrapper.
 * @param {string} url 
 * @param {function} done 
 * @param {function} fail 
 * @param {function} replied 
 */
const getData = (url, done = () => {}, fail = () => {}, replied = () => {}) => {
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

/**
 * Initialize a chart/Chart.js instance.
 * @param {string} name The name of the chart.
 * @param {string} selector CSS selector of the canvas.
 * @param {string} label The label name.
 */
const initChart = (name, selector, label) => {
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
			plugins: {
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
		}
	})
}

/**
 * Runs a function that loops for every presence
 * @param {function} callback Put the function here, of course.
 */
const forEveryPresence = callback => {
	Object.keys(data.presence).forEach(name => {
		callback(data.presence[name], name)
	})
}

// https://stackoverflow.com/a/41085566

document.addEventListener("DOMContentLoaded", () => {
	const toc = document.querySelector("#toc div div div")
	const headings = [].slice.call(document.querySelectorAll('h2:not(.toc-ignore), h3:not(.toc-ignore), h4:not(.toc-ignore), h5:not(.toc-ignore), h6:not(.toc-ignore)'))
	headings.forEach((heading, index) => {
		let ref = "toc-" + (index + 1)
		if (heading.hasAttribute("id"))
			ref = heading.getAttribute("id")
		else
			heading.setAttribute("id", ref)

		const link = document.createElement("a")
		link.setAttribute("href", `#${ref}`)
		link.textContent = heading.textContent

		const div = document.createElement("div")
		div.setAttribute("class", `toc-${heading.tagName.toLowerCase()}`)
		div.appendChild(link)
		toc.children[(index >= Math.round(headings.length / 2)) ? 1 : 0].appendChild(div)
	})
})

// document.addEventListener("DOMContentLoaded", event => {
// 	$(".nav-tabs a").click(() => {
// 		$(this).tab('show');
// 	});

// })


// https://gist.github.com/0x263b/2bdd90886c2036a1ad5bcf06d6e6fb37

/**
 * Generates a color hash from a specified string.
 * @param {string} str String that will be hashed
 */
const getColorHash = str => {
	if (!str) return "#" + ((1 << 24) * Math.random() | 0).toString(16).padStart(6, "0")
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

/**
 * General color hashing for Chart.js.
 * @param {*} ctx 
 */
const generalColorHashing = ctx => getColorHash(ctx.chart.data.labels[ctx.dataIndex])

const updateProgressBar = (details, increment = true) => {
	if (increment) step++
	document.querySelector("#title .status").textContent = `${details}`
	document.querySelector("#title .progress-bar").style.width = `${(step / totalSteps) * 100}%`
}

/**
 * Start processing the data.
 */
const processData = () => {

	forEveryPresence((presence, name) => {
		if (presence.name === undefined) {
			if (presence.name === undefined) console.log(`${name} has no metadata`)
			delete data.presence[name]
		} else {
			if (presence.users === undefined) {
				presence.users = 0
			}
			data.presence[name].additional = {}
			data.presence[name].additional.userPercentage = presence.users/totalUsers * 100
			data.presence[name].additional.hot = (data.presence[name].additional.userPercentage > 5) ? true : false
			data.presence[name].additional.partner = (data.partner.indexOf(name) + 1) ? true : false	
		}
	})

	if (imgurAllow) forEveryPresence((presence, name) => {
		if (presence.metadata.logo.startsWith("https://proxy.duckduckgo.com/iu/?u=")) data.presence[name].metadata.logo = presence.metadata.logo.substring(35)
		if (presence.metadata.thumbnail.startsWith("https://proxy.duckduckgo.com/iu/?u=")) data.presence[name].metadata.thumbnail = presence.metadata.thumbnail.substring(35)
	})

	/*
	================================================================
	Statistics for usage
	================================================================
	*/

	document.querySelector("#usage-1-1 p").textContent = totalUsers
	document.querySelector("#usage-1-2 p").textContent = Math.round(totalUsers * 0.05)


	/*
	================================================================
	Statistics for presences
	================================================================
	*/

	tableData.presence = new List(["Presence", "Category", "Author", "Users", "Search Tags"], Object.values(data.presence).map(presence => ([presence.name, presence.metadata.category, presence.metadata.author?.name, presence.users, presence.metadata.tags?.join(" ")])))
	tableData.presence.data.forEach(row => {
		if (data.presence[row[0]].metadata.altnames) row[4] += ` ${data.presence[row[0]].metadata.altnames.join(" ")}`
	})
	tables.presence = $("table#presence").DataTable(tableSettings).column(5).visible(false).rows.add(tableData.presence.data.map(data => ['<span class="iconify" data-icon="ic:baseline-add-circle-outline"></span>', ...data])).order([[4, "des"]]).draw()

	$('table#presence tbody').on('click', 'td.details-control', (event) => {

		const tr = $(event.target).closest('tr')
		const row = tables.presence.row(tr)
		const format = row => {

			const presenceName = row[1]
			const presenceNameClass = presenceName.toLowerCase().replace(" ", "-")

			let presenceInfo = []
			presenceInfo.push(`<p><strong>Service</strong>: ${presenceName}</p>`)
			presenceInfo.push(`<p><strong>Author</strong>: <a href="https://premid.app/users/${data.presence[presenceName].metadata.author.id}">${data.presence[presenceName].metadata.author.name}</a></p>`)
			if (data.presence[presenceName].metadata.contributors) {
				presenceInfo.push(`<p><strong>Contributors</strong>: ${data.presence[presenceName].metadata.contributors.map(contributor => `<a href="https://premid.app/users/${contributor.id}">${contributor.name}</a>`).join(", ")}</p>`)
			}
			presenceInfo.push(`<p><strong>Version</strong>: ${data.presence[presenceName].metadata.version}</p>`)
			presenceInfo.push(`<p><strong>Users</strong>: ${data.presence[presenceName].users} (${Math.round(data.presence[presenceName].additional.userPercentage * 100)/100}%${data.presence[presenceName].additional.hot ? ", 🔥" : ""})</p>`)
			presenceInfo.push(`<p><strong>Category</strong>: ${data.presence[presenceName].metadata.category}`)
			presenceInfo.push(`<p><strong>Tags</strong>: ${data.presence[presenceName].metadata.tags.join(", ")}`)
			let urlVal = data.presence[presenceName].metadata.url
			if (typeof urlVal === "string") {
				presenceInfo.push(`<p><strong>URL</strong>: <a href="https:/${urlVal}">${urlVal}</a></p>`)
			} else {
				presenceInfo.push(`<p><strong>URL</strong>: ${urlVal.map(url => `<a href="https:/${url}">${url}</a>`).join(", ")}</p>`)
			}
			presenceInfo.push(`<p style="display:inline-block"><strong>Color</strong>: ${data.presence[presenceName].metadata.color}</p>`)
			presenceInfo.push(`<div class="color-preview" style="background:${data.presence[presenceName].metadata.color};"></div>`)
			presenceInfo.push(`<p><strong>Alternative Name</strong>: ${data.presence[presenceName].metadata.altnames ? data.presence[presenceName].metadata.altnames.join(", ") : "None"}</p>`)
			presenceInfo.push(`<p><strong>Using regex?</strong>: ${data.presence[presenceName].metadata.regExp ? `Yes (<code>${data.presence[presenceName].metadata.regExp}</code>)` : "No"}</p>`)
			presenceInfo.push(`<p><strong>Using iFrame?</strong>: ${data.presence[presenceName].metadata.iframe ? "Yes" : "No"}</p>`)
			presenceInfo.push(`<p><strong>Using settings?</strong>: ${data.presence[presenceName].metadata.settings ? "Yes" : "No"}</p>`)
			presenceInfo.push(`<p><strong>Partner?</strong>: ${data.presence[presenceName].additional.partner ? "Yes" : "No"}</p>`)

			let langTabs = []
			let langCards = []
			Object.keys(data.presence[presenceName].metadata.description).forEach((lang, index) => {
				if (index !== 0) {
					langTabs.push(`<li class="nav-item"><a href="#card-${lang}" class="nav-link" id="tab-${lang}" data-toggle="tab" role="tab" aria-controls="card-${lang}" aria-selected="true">${lang}</a></li>`)
					langCards.push(`<div class="tab-pane" id="card-${lang}" role="tabpanel" aria-labelledby="tab-${lang}">${data.presence[presenceName].metadata.description[lang]}</div>`)
				} else {
					langTabs.push(`<li class="nav-item"><a href="#card-${lang}" class="nav-link active" id="tab-${lang}" data-toggle="tab" role="tab" aria-controls="card-${lang}" aria-selected="true">${lang}</a></li>`)
					langCards.push(`<div class="tab-pane show active" id="card-${lang}" role="tabpanel" aria-labelledby="tab-${lang}">${data.presence[presenceName].metadata.description[lang]}</div>`)
				}
			})

			return `
				<div class="child-info">
					<div class="row">
						<div class="col-md-6">
							${presenceInfo.join("")}
							<p><strong>Description:</strong></p>
							<div class="card">
								<div class="card-header">
									<ul class="nav nav-tabs card-header-tabs" id="card-tab" role="tablist">
										${langTabs.join("")}
									</ul>
								</div>
								<div class="card-body">
									<div class="tab-content" id="card-content">
										${langCards.join("")}
									</div>
								</div>
							</div>
						</div>
						<div class="col-md-6">
							<a href="https://premid.app/library/${presenceName}" target="_blank" class="btn btn-primary" role="button">PreMiD Store</a>
							<a href="https://github.com/Activities/tree/main/websites/${presenceName.slice(0,1).toUpperCase()}/${presenceName}" target="_blank" class="btn btn-secondary" role="button">Source Code (GitHub)</a>
							<br />
							<div class="card text-center" style="margin-top:1rem">
								<div class="card-header">
									<ul class="nav nav-tabs card-header-tabs" id="card-tab" role="tablist">
										<li class="nav-item">
											<a href="#card-logo-${presenceNameClass}" class="nav-link active" id="tab-logo-${presenceNameClass}" data-toggle="tab" role="tab" aria-controls="card-logo-${presenceNameClass}" aria-selected="true">Logo</a>
										</li>
										<li class="nav-item">
											<a href="#card-thumbnail-${presenceNameClass}" class="nav-link" id="tab-thumbnail-${presenceNameClass}" data-toggle="tab" role="tab" aria-controls="card-thumbnail-${presenceNameClass}" aria-selected="false">Thumbnail</a>
										</li>
									</ul>
								</div>
								<div class="card-body" style="background:gray">
									<div class="tab-content" id="card-content">
										<div class="tab-pane show active" id="card-logo-${presenceNameClass}" role="tabpanel" aria-labelledby="tab-logo-${presenceNameClass}">
											<img src="${data.presence[presenceName].metadata.logo}" alt="${data.presence[presenceName].metadata.logo}" style="max-height: 256px; width:100%; object-fit: contain;">
										</div>
										<div class="tab-pane" id="card-thumbnail-${presenceNameClass}" role="tabpanel" aria-labelledby="tab-thumbnail-${presenceNameClass}">
											<img src="${data.presence[presenceName].metadata.thumbnail}" alt="${data.presence[presenceName].metadata.thumbnail}" style="max-height: 256px; width:100%; object-fit: contain;">
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>`
		}

		if (row.child.isShown()) {
			row.child.hide()
			tr.removeClass('shown')
			event.target.innerHTML = '<span class="iconify" data-icon="ic:baseline-add-circle-outline"></span>'
		} else {
			row.child(format(row.data())).show()
			tr.addClass('shown')
			event.target.innerHTML = '<span class="iconify" data-icon="ic:baseline-remove-circle"></span>'
		}

	})

	const presenceCount = Object.keys(data.presence).length
	document.querySelector("#presence-1-1 p").textContent = presenceCount
	let presenceUsers = 0
	let presenceActive = 0
	Object.values(data.presence).forEach(value => {
		presenceUsers += Number(value.users)
		presenceActive += Number(value.activeNow)
	})
	document.querySelector("#presence-1-2 p").textContent = presenceUsers
	document.querySelector("#presence-1-3 p").textContent = Math.round(presenceUsers / presenceCount)
	document.querySelector("#presence-1-2b p").textContent = presenceActive
	document.querySelector("#presence-1-3b p").textContent = Math.round(presenceActive / presenceCount)

	const presenceTop = Object.values(data.presence).map(v => [v.name, v.users]).sort((a, b) => b[1] - a[1])
	$("#presence-2 div div table").DataTable(miniTableSettings).rows.add(presenceTop.slice(0, 10)).draw()

	const presenceTopActive = Object.values(data.presence).map(v => [v.name, v.activeNow]).sort((a, b) => b[1] - a[1])
	$("#presence-2b div div table").DataTable(miniTableSettings).rows.add(presenceTopActive.slice(0, 10)).draw()

	initChart("presence", "#presence-4 canvas", "Users")
	chartData.presence.datasets[0].backgroundColor = ctx => data.presence[ctx.chart.data.labels[ctx.dataIndex]]?.metadata.color || getColorHash(ctx.chart.data.labels[ctx.dataIndex])
	
	selectChartElement = document.querySelector('#presence-4 select')
	
	for (let i = 1; i < Math.ceil(presenceCount / 100); i++) {
		let optionElement = document.createElement('option')
		optionElement.value = i * 100
		optionElement.textContent = `${(i - 1) * 100 + 1}-${i * 100}`
		selectChartElement.insertBefore(optionElement, selectChartElement.querySelector('[value="active:100"]'))
		optionElement = document.createElement('option')
		optionElement.value = 'active:' + (i * 100)
		optionElement.textContent = `Active: ${(i - 1) * 100 + 1}-${i * 100}`
		selectChartElement.appendChild(optionElement)
	}
	
	let chosenTop = presenceTop
	let chosenPre = 6
	
	let updatePresenceChart = (array) => {
		chartData.presence.labels = chosenTop.slice(...array).map(v => v[0])
		chartData.presence.datasets[0].data = chosenTop.slice(...array).map(v => v[1])
		charts.presence.update()
	}

	updatePresenceChart([chosenPre, chosenPre + 100])
	document.querySelector("#presence-4 div select").value = "nopre"

	document.querySelector("#presence-4 div select").onchange = (event) => {
		let chartType = event.target.value
		if (chartType.startsWith('active:')) {
			chosenTop = presenceTopActive
			chosenPre = 1
		} else {
			chosenTop = presenceTop
			chosenPre = 6
		}
		chartType = chartType.split(':').slice(-1)[0]
		if (chartType === 'nopre') updatePresenceChart([chosenPre, chosenPre + 100])
		else if (chartType === 'all') updatePresenceChart([0, undefined])
		else if (chartType === 'allnopre') updatePresenceChart([chosenPre, undefined])
		else updatePresenceChart([chartType - 100, chartType - 0])
	}

	/*
	================================================================
	Statistics for categories
	================================================================
	*/

	forEveryPresence(presence => {
		if (data.category[presence.metadata.category] === undefined) {
			data.category[presence.metadata.category] = {
				category: presence.metadata.category,
				presences: [],
				users: 0,
				activeNow: 0,
				average: 0,
				activeNowAverage: 0,
			}
		}
		data.category[presence.metadata.category].presences.push(presence.name)
		data.category[presence.metadata.category].users += presence.users
		data.category[presence.metadata.category].activeNow += presence.activeNow
	})
	Object.keys(data.category).forEach(key => {
		data.category[key].average = Math.round(data.category[key].users / data.category[key].presences.length)
		data.category[key].activeNowAverage = Math.round(data.category[key].activeNow / data.category[key].presences.length)
	})

	tableData.category = new List(["Category", "Presences", "Users", "Average", "Active Users", "Average"], Object.values(data.category).map(value => [value.category, value.presences.length, value.users, value.average, value.activeNow, value.activeNowAverage]))
	tables.category = $("table#category").DataTable(tableSettings).rows.add(tableData.category.data.map(data => ['<span class="iconify" data-icon="ic:baseline-add-circle-outline"></span>', ...data])).order([
		[2, "des"]
	]).draw()

	$('table#category tbody').on('click', 'td.details-control', (event) => {
		const tr = $(event.target).closest('tr')
		const row = tables.category.row(tr)
		const format = row => {

			const categoryName = row[1]

			const categoryInfo = []
			categoryInfo.push(`<p><strong>Category</strong>: ${categoryName}</p>`)
			categoryInfo.push(`<p><strong>Presence count</strong>: ${data.category[categoryName].presences.length}</p>`)
			categoryInfo.push(`<p><strong>User count</strong>: ${data.category[categoryName].users}</p>`)
			categoryInfo.push(`<p><strong>User to presence average</strong>: ${data.category[categoryName].average}</p>`)
			categoryInfo.push(`<a href="https://premid.app/store?category=${categoryName}" target="_blank" class="btn btn-primary" role="button" style="margin-top:1rem">PreMiD Store</a>`)

			const categoryPresences = data.category[categoryName].presences.map(presenceName => `<a href="https://premid.app/library/${presenceName}">${presenceName}</a>`).sort()

			return `
				<div class="child-info">
					<div class="row">
						<div class="col-md-6">
							${categoryInfo.join("")}
						</div>
						<div class="col-md-6">
							<p><strong>Presences</strong>:</p>
							${categoryPresences.join(", ")}
						</div>
					</div>
				</div>`

		}

		if (row.child.isShown()) {
			row.child.hide();
			tr.removeClass('shown')
			event.target.innerHTML = '<span class="iconify" data-icon="ic:baseline-add-circle-outline"></span>'
		} else {
			row.child(format(row.data())).show()
			tr.addClass('shown')
			event.target.innerHTML = '<span class="iconify" data-icon="ic:baseline-remove-circle"></span>'
		}
	})

	let categoryCount = Object.values(data.category).length
	document.querySelector("#category-1-1 p").textContent = Object.values(data.category).length
	if (categoryCount > 6) {
		holdup = document.createElement("p")
		holdup.innerHTML = "Hold up. This value should be 6 at all times. Something's wrong here."
		document.querySelector("#category-1-1").appendChild(holdup)
	}
	let categoryPresenceCount = 0, categoryUserCount = 0, categoryActiveCount = 0
	Object.values(data.category).forEach(value => {
		categoryPresenceCount += Number(value.presences.length)
		categoryUserCount += Number(value.users)
		categoryActiveCount += Number(value.activeNow)
	})
	document.querySelector("#category-1-2 p").textContent = Math.round(categoryPresenceCount / categoryCount)
	document.querySelector("#category-1-3 p").textContent = Math.round(categoryUserCount / categoryCount)
	document.querySelector("#category-1-3b p").textContent = Math.round(categoryActiveCount / categoryCount)

	const category2Data = Object.values(data.category).map(v => [v.category, v.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#category-2 div div table").DataTable(miniTableSettings).rows.add(category2Data).draw()
	initChart("category2", "#category-2 canvas", "Presences")
	chartData.category2.labels = category2Data.map(v => v[0])
	chartData.category2.datasets[0].data = category2Data.map(v => v[1])
	chartData.category2.datasets[0].backgroundColor = generalColorHashing
	charts.category2.update()

	const category3Data = Object.values(data.category).map(v => [v.category, v.users]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#category-3 div div table").DataTable(miniTableSettings).rows.add(category3Data).draw()
	initChart("category3", "#category-3 canvas", "Users")
	chartData.category3.labels = category3Data.map(v => v[0])
	chartData.category3.datasets[0].data = category3Data.map(v => v[1])
	chartData.category3.datasets[0].backgroundColor = generalColorHashing
	charts.category3.update()

	const category4Data = Object.values(data.category).map(v => [v.category, v.average]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#category-4 div div table").DataTable(miniTableSettings).rows.add(category4Data).draw()
	initChart("category4", "#category-4 canvas", "Average")
	chartData.category4.labels = category4Data.map(v => v[0])
	chartData.category4.datasets[0].data = category4Data.map(v => v[1])
	chartData.category4.datasets[0].backgroundColor = generalColorHashing
	charts.category4.update()

	const category3bData = Object.values(data.category).map(v => [v.category, v.activeNow]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#category-3b div div table").DataTable(miniTableSettings).rows.add(category3bData).draw()
	initChart("category3b", "#category-3b canvas", "Users")
	chartData.category3b.labels = category3bData.map(v => v[0])
	chartData.category3b.datasets[0].data = category3bData.map(v => v[1])
	chartData.category3b.datasets[0].backgroundColor = generalColorHashing
	charts.category3b.update()

	const category4bData = Object.values(data.category).map(v => [v.category, v.activeNowAverage]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#category-4b div div table").DataTable(miniTableSettings).rows.add(category4bData).draw()
	initChart("category4b", "#category-4b canvas", "Average")
	chartData.category4b.labels = category4bData.map(v => v[0])
	chartData.category4b.datasets[0].data = category4bData.map(v => v[1])
	chartData.category4b.datasets[0].backgroundColor = generalColorHashing
	charts.category4b.update()

	/*
	================================================================
	Statistics for presence developers
	================================================================
	*/

	forEveryPresence(presence => {
		if (!presence.metadata.author) return
		if (data.author[presence.metadata.author.id] === undefined) {
			data.author[presence.metadata.author.id] = {
				author: presence.metadata.author.name,
				id: presence.metadata.author.id,
				presences: [],
				users: 0,
				average: 0,
				activeNow: 0,
				activeNowAverage: 0
			}
		}
		data.author[presence.metadata.author.id].presences.push(presence.name)
		data.author[presence.metadata.author.id].users += presence.users
		data.author[presence.metadata.author.id].activeNow += presence.activeNow
	})
	Object.keys(data.author).forEach(key => {
		data.author[key].average = Math.round(data.author[key].users / data.author[key].presences.length)
		data.author[key].activeNowAverage = Math.round(data.author[key].activeNow / data.author[key].presences.length)
	})

	tableData.author = new List(["Author", "ID", "Presences", "Installs", "Average", "Active Users", "Average"], Object.values(data.author).map(value => [value.author, value.id, value.presences.length, value.users, value.average, value.activeNow, value.activeNowAverage]))
	tables.author = $("table#author").DataTable(tableSettings).rows.add(tableData.author.data.map(data => ['<span class="iconify" data-icon="ic:baseline-add-circle-outline"></span>', ...data])).order([[3, "des"]]).draw()

	$('table#author tbody').on('click', 'td.details-control', (event) => {
		const tr = $(event.target).closest('tr')
		const row = tables.author.row(tr)
		const format = row => {
			const authorID = row[2]

			const authorInfo = []
			authorInfo.push(`<p><strong>Author</strong>: ${data.author[authorID].author} (<code>${authorID}</code>)</p>`)
			authorInfo.push(`<p><strong>Presence count</strong>: ${data.author[authorID].presences.length}</p>`)
			authorInfo.push(`<p><strong>User count</strong>: ${data.author[authorID].users}</p>`)
			authorInfo.push(`<p><strong>User to presence average</strong>: ${data.author[authorID].average}</p>`)
			authorInfo.push(`<a href="https://premid.app/users/${authorID}" target="_blank" class="btn btn-primary" role="button" style="margin-top:1rem">PreMiD Store</a>`)

			const authorPresences = data.author[authorID].presences.map(presenceName => `<a href="https://premid.app/library/${presenceName}">${presenceName}</a>`).sort()

			return `
				<div class="child-info">
					<div class="row">
						<div class="col-md-6">
							${authorInfo.join("")}
						</div>
						<div class="col-md-6">
							<p><strong>Presences</strong>:</p>
							${authorPresences.join(", ")}
						</div>
					</div>
				</div>`
		}

		if (row.child.isShown()) {
			row.child.hide();
			tr.removeClass('shown')
			event.target.innerHTML = '<span class="iconify" data-icon="ic:baseline-add-circle-outline"></span>'
		} else {
			row.child(format(row.data())).show()
			tr.addClass('shown')
			event.target.innerHTML = '<span class="iconify" data-icon="ic:baseline-remove-circle"></span>'
		}
	})

	let authorCount = Object.values(data.author).length
	document.querySelector("#author-1-1 p").textContent = Object.values(data.author).length
	let authorPresenceCount = 0, authorUserCount = 0, authorActiveCount = 0
	Object.values(data.author).forEach(value => {
		authorPresenceCount += Number(value.presences.length)
		authorUserCount += Number(value.users)
		authorActiveCount += Number(value.activeNow)
	})
	document.querySelector("#author-1-2 p").textContent = Math.round(authorPresenceCount / authorCount)
	document.querySelector("#author-1-3 p").textContent = Math.round(authorUserCount / authorCount)
	document.querySelector("#author-1-3b p").textContent = Math.round(authorActiveCount / authorCount)

	const author2Data = Object.values(data.author).map(v => [v.author, v.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#author-2 div div table").DataTable(miniTableSettings).rows.add(author2Data).draw()
	initChart("author2", "#author-2 canvas", "Presences")
	chartData.author2.labels = author2Data.map(v => v[0])
	chartData.author2.datasets[0].data = author2Data.map(v => v[1])
	chartData.author2.datasets[0].backgroundColor = generalColorHashing
	charts.author2.update()
	
	const author3Data = Object.values(data.author).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#author-3 div div table").DataTable(miniTableSettings).rows.add(author3Data).draw()
	initChart("author3", "#author-3 canvas", "Users")
	chartData.author3.labels = author3Data.map(v => v[0])
	chartData.author3.datasets[0].data = author3Data.map(v => v[1])
	chartData.author3.datasets[0].backgroundColor = generalColorHashing
	charts.author3.update()

	const author4Data = Object.values(data.author).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#author-4 div div table").DataTable(miniTableSettings).rows.add(author4Data).draw()
	initChart("author4", "#author-4 canvas", "Average")
	chartData.author4.labels = author4Data.map(v => v[0])
	chartData.author4.datasets[0].data = author4Data.map(v => v[1])
	chartData.author4.datasets[0].backgroundColor = generalColorHashing
	charts.author4.update()

	const author3bData = Object.values(data.author).map(v => [v.author, v.activeNow]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#author-3b div div table").DataTable(miniTableSettings).rows.add(author3bData).draw()
	initChart("author3b", "#author-3b canvas", "Users")
	chartData.author3b.labels = author3bData.map(v => v[0])
	chartData.author3b.datasets[0].data = author3bData.map(v => v[1])
	chartData.author3b.datasets[0].backgroundColor = generalColorHashing
	charts.author3b.update()

	const author4bData = Object.values(data.author).map(v => [v.author, v.activeNowAverage]).sort((a, b) => b[1] - a[1]).slice(0, 10)
	$("#author-4b div div table").DataTable(miniTableSettings).rows.add(author4bData).draw()
	initChart("author4b", "#author-4b canvas", "Average")
	chartData.author4b.labels = author4bData.map(v => v[0])
	chartData.author4b.datasets[0].data = author4bData.map(v => v[1])
	chartData.author4b.datasets[0].backgroundColor = generalColorHashing
	charts.author4b.update()

	initChart("author5", "#author-5 canvas", "")
	chartData.author5.datasets[0].backgroundColor = generalColorHashing
	chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(2)
	chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.users).sort((a, b) => b - a).slice(2)
	chartData.author5.datasets[0].label = "Users"
	charts.author5.update()
	document.querySelector("#author-5 div select").value = "usernotop"

	document.querySelector("#author-5 div select").onchange = () => {
		switch (document.querySelector("#author-5 div select").value) {
			case 'presence':
				chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.presences.length]).sort((a, b) => b[1] - a[1]).map(v => v[0])
				chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.presences.length).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Presences"
				break
			case 'presencenotop':
				chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.presences.length]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(1)
				chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.presences.length).sort((a, b) => b - a).slice(1)
				chartData.author5.datasets[0].label = "Presences"
				break
			case 'user':
				chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0])
				chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.users).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Users"
				break
			case 'usernotop':
				chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(3)
				chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.users).sort((a, b) => b - a).slice(3)
				chartData.author5.datasets[0].label = "Users"
				break
			case 'average':
				chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0])
				chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.average).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Average"
				break
			case 'averagenotop':
				chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(1)
				chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.average).sort((a, b) => b - a).slice(1)
				chartData.author5.datasets[0].label = "Average"
				break
		}
		charts.author5.update()
	}

	/*
	================================================================
	Statistics for feature implementation
	================================================================
	*/

	let implementations = 9
	let implementation = Array(implementations + 1).fill(0)

	forEveryPresence(presence => {
		if (presence.metadata.iframe) implementation[1]++
		if (presence.metadata.contributors) implementation[2]++
		if (presence.metadata.regExp) implementation[4]++
		if (typeof presence.metadata.description === "object" && Object.keys(presence.metadata.description).length !== 1) implementation[5]++
		if (presence.additional.partner) implementation[6]++
		if (presence.additional.hot) implementation[7]++
		if (presence.metadata.altnames) implementation[8]++
		if (presence.metadata.settings) {
			implementation[3]++
			if (presence.metadata.settings.filter(setting => setting.multiLanguage).length !== 0) implementation[9]++
		}
	})

	for (var i = 1; i < implementations + 1; i++) {
		document.querySelector(`#implementation-${i} p`).textContent = implementation[i]
		document.querySelectorAll(`#implementation-${i} p`)[1].textContent = `${Math.round((implementation[i] / presenceCount) * 100)}% (${implementation[i]}/${presenceCount})`
	}

	/*
	================================================================
	Statistics for description languages
	================================================================
	*/

	forEveryPresence(presence => {
		if (typeof presence.metadata.description === "object") {
			Object.keys(presence.metadata.description).forEach(langTagRaw => {
				let langTag
				if (langTagRaw.split("_").length === 2) langTag = `${langTagRaw.split("_")[0]}_${langTagRaw.split("_")[1].toUpperCase()}`
				else langTag = langTagRaw
				if (data.lang[langTag] === undefined) {
					data.lang[langTag] = {
						language: langNames.of(langTag),
						tag: langTag,
						presences: []
					}
				}
				data.lang[langTag].presences.push(presence.name)
			})
		}
	})

	document.querySelector("#lang-1-1 p").textContent = implementation[5]
	document.querySelector("#lang-1-2 p").textContent = Object.keys(data.lang).length

	$("#lang-2 div div table").DataTable(miniTableSettings).rows.add(Object.values(data.lang).map(v => [`${v.language} (${v.tag})`, v.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()
	initChart("lang2", "#lang-2 canvas", "Presences")
	chartData.lang2.labels = Object.values(data.lang).map(v => [`${v.language} (${v.tag})`, v.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10).map(v => v[0])
	chartData.lang2.datasets[0].data = Object.values(data.lang).map(v => v.presences.length).sort((a, b) => b - a).slice(0, 10)
	chartData.lang2.datasets[0].backgroundColor = generalColorHashing
	charts.lang2.update()

	tableData.lang = new List(["Language", "Tag", "Presences"], Object.values(data.lang).map(value => [value.language, value.tag, value.presences.length]))
	tables.lang = $("table#lang").DataTable(tableSettings).rows.add(tableData.lang.data.map(data => ['<span class="iconify" data-icon="ic:baseline-add-circle-outline"></span>', ...data])).order([[3, "des"]]).draw()

	document.querySelector("#lang-3 select").onchange = () => {
		switch (document.querySelector("#lang-3 select").value) {
			case 'all':
				chartData.lang3.labels = Object.values(data.lang).map(v => [`${v.language} (${v.tag})`, v.presences.length]).sort((a, b) => b[1] - a[1]).map(v => v[0])
				chartData.lang3.datasets[0].data = Object.values(data.lang).map(v => v.presences.length).sort((a, b) => b - a)
				break
			case 'no1':
				chartData.lang3.labels = Object.values(data.lang).map(v => [`${v.language} (${v.tag})`, v.presences.length]).sort((a, b) => b[1] - a[1]).slice(1).map(v => v[0])
				chartData.lang3.datasets[0].data = Object.values(data.lang).map(v => v.presences.length).sort((a, b) => b - a).slice(1)
				break
			// case 'no2':
				// 	chartData.lang3.labels = Object.values(data.lang).map(v => [`${v.language} (${v.tag})`, v.presences.length]).sort((a, b) => b[1] - a[1]).slice(2).map(v => v[0])
				// 	chartData.lang3.datasets[0].data = Object.values(data.lang).map(v => v.presences.length).sort((a, b) => b - a).slice(2)
				// 	break
		}
		charts.lang3.update()
	}

	initChart("lang3", "#lang-3 canvas", "Presences")
	chartData.lang3.labels = Object.values(data.lang).map(v => [`${v.language} (${v.tag})`, v.presences.length]).sort((a, b) => b[1] - a[1]).map(v => v[0])
	chartData.lang3.datasets[0].data = Object.values(data.lang).map(v => v.presences.length).sort((a, b) => b - a)
	chartData.lang3.datasets[0].backgroundColor = generalColorHashing
	charts.lang3.update()

	$('table#lang tbody').on('click', 'td.details-control', (event) => {
		const tr = $(event.target).closest('tr')
		const row = tables.lang.row(tr)
		const format = row => {
			const langTag = row[2]

			const langInfo = []
			langInfo.push(`<p><strong>Language</strong>: ${data.lang[langTag].language} (${langTag})</p>`)
			langInfo.push(`<p><strong>Presence count</strong>: ${data.lang[langTag].presences.length}`)

			const langPresences = []
			data.lang[langTag].presences.forEach(presenceName => {
				langPresences.push(`<a href="https://premid.app/library/${presenceName}">${presenceName}</a>`)
			})

			return `
				<div class="child-info">
					<div class="row">
						<div class="col-12">
							${langInfo.join("")}
						</div>
					</div>
					<div class="row">
						<div class="col-12">
							<p><strong>Presences</strong>:</p>
							${langPresences.join(", ")}
						</div>
					</div>
				</div>`
		}

		if (row.child.isShown()) {
			row.child.hide();
			tr.removeClass('shown')
			event.target.innerHTML = '<span class="iconify" data-icon="ic:baseline-add-circle-outline"></span>'
		} else {
			row.child(format(row.data())).show()
			tr.addClass('shown')
			event.target.innerHTML = '<span class="iconify" data-icon="ic:baseline-remove-circle"></span>'
		}
	})
}

document.addEventListener("DOMContentLoaded", async () => {
	updateProgressBar(`Fetching data...`, false)
	/**
	 * Callback for all ``getData()``.
	 */
	const getDataCallback = () => {
		updateProgressBar(`Fetching data... (${step + 1}/${totalSteps})`)
	}

	const corsUrl = await getCorsUrl()

	$.fn.dataTable.ext.errMode = 'none';

	await Promise.all([
		(async () => {
			const response = await fetch('https://i.imgur.com/removed.png')
			imgurAllow = response.ok
			getDataCallback()
		})(),
		(async () => {
			const response = await fetch(corsUrl + 'https://premid.app/api/public/stats')
			const data = await response.json()
			totalUsers = data.users
			getDataCallback()
		})(),
		// (async () => {
		// 	const response = await fetch(corsUrl + '/mini-htmls/premid-presence-stats/static-data.json')
		// 	data.presence = await response.json()
		// 	getDataCallback()
		// 	getDataCallback()
		// })(),
		// (async () => {
		// 	const gqlResponse = await fetch('https://api.premid.app/v3', {
		// 		method: 'POST',
		// 		headers: {
		// 			'Content-Type': 'application/json',
		// 		},
		// 		body: JSON.stringify({query: `{presences{metadata{author{id,name},contributors{id,name},altnames,service,description,url,version,tags,iframe,regExp,iframeRegExp,button,warning,settings{multiLanguage}}}}`})
		// 	})

		// 	const gqlData = (await gqlResponse.json()).data

		// 	gqlData.presences.forEach(presence => {
		// 		data.presence[presence.metadata.service] ??= {}
		// 		presenceData = data.presence[presence.metadata.service]
		// 		presenceData.metadata ??= {}
		// 		const previousUsers = presenceData?.users ?? 0
		// 		Object.assign(presenceData['metadata'], presence.metadata)
		// 		presenceData.name ??= presence.metadata.service
		// 		presenceData.users ||= previousUsers || presence.metadata?.users
		// 	})

		// 	getDataCallback()
		// })(),
		(async () => {
			let page = 0
			
			while (true) {
				page += 1

				const searchResponse = await fetch(`${corsUrl}https://premid.app/api/activities?search&category&orderBy=name&order=desc&page=${page}&limit=50`)
			
				const searchData = await searchResponse.json()
				
				if (page === 1) {
					totalSteps += searchData.pagination.totalPages - 1
				}
				searchData.data.forEach(presence => {
					data.presence[presence.service] ??= {}
					const presenceData = data.presence[presence.service]
					presenceData.name ??= presence.service
					presenceData.users ||= Math.max(presenceData.users || 0, presence.installed)
					presenceData.activeNow ||= presence.activeNow
					presenceData.metadata ??= {}
					// presenceData.metadata.description = presence.descriptions.reduce((obj, el) => {
					// 	obj[el.languageCode] = el.description
					// 	return obj
					// }, {})
					presenceData.metadata.logo = presence.logo
					presenceData.metadata.thumbnail = presence.thumbnail
					presenceData.metadata.color = presence.color
					presenceData.metadata.category = presence.category
					presenceData.metadata.url = presence.url
				})
				getDataCallback()

				if (!searchData.pagination.hasNext) break
			}
		})()
	])

	document.querySelector("#title .status").textContent = `All data fetched! Fetched on ${(new Date()).toString()}`
	document.querySelector("#main-stats").removeAttribute("hidden")
	document.querySelector("#main-tables").removeAttribute("hidden")
	document.querySelector("#toc").removeAttribute("hidden")

	if (document.readyState === "complete" || document.readyState === "interactive") processData()
	else document.addEventListener("DOMContentLoaded", () => processData())

})