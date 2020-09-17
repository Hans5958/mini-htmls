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
	totalSteps = 6,
	locale = {},
	imgurAllow = false,
	totalUsers = 0

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

document.addEventListener("DOMContentLoaded", event => {
	const toc = document.querySelector("#toc div div div");
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
		if (presence.name === undefined || presence.users === undefined) delete data.presence[name]
		else {
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

	tableData.presence = new List(["Presence", "Category", "Author", "Users", "Search Tags"], Object.values(data.presence).map(presence => ([presence.name, presence.metadata.category, presence.metadata.author.name, presence.users, presence.metadata.tags.join(" ")])))
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
			if (typeof data.presence[presenceName].metadata.contributors !== "undefined") {
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
			presenceInfo.push(`<div style="margin-left:4px;width:.9rem;height:.9rem;background:${data.presence[presenceName].metadata.color};border:.1rem solid #bbb;display:inline-block" />`)
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
							<a href="https://premid.app/store/presences/${presenceName}" target="_blank" class="btn btn-primary" role="button">PreMiD Store</a>
							<a href="https://github.com/PreMiD/Presences/tree/master/${presenceName}" target="_blank" class="btn btn-secondary" role="button">Source Code (GitHub)</a>
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
	let presence12 = 0
	Object.values(data.presence).forEach(value => {
		presence12 += Number(value.users)
	})
	document.querySelector("#presence-1-2 p").textContent = presence12
	document.querySelector("#presence-1-3 p").textContent = Math.round(presence12 / presenceCount)

	let presenceTop = Object.values(data.presence).map(v => [v.name, v.users]).sort((a, b) => b[1] - a[1])
	$("#presence-2 div div table").DataTable(miniTableSettings).rows.add(presenceTop.slice(0, 10)).draw()
	$("#presence-3 div div table").DataTable(miniTableSettings).rows.add(presenceTop.slice(6, 16)).draw()

	initChart("presence", "#presence-4 canvas", "Users")
	chartData.presence.datasets[0].backgroundColor = ctx => data.presence[ctx.chart.data.labels[ctx.dataIndex]].metadata.color

	let updatePresenceChart = array => {
		chartData.presence.labels = presenceTop.slice(...array).map(v => v[0])
		chartData.presence.datasets[0].data = presenceTop.slice(...array).map(v => v[1])
		charts.presence.update()
	}

	updatePresenceChart([6, 106])
	document.querySelector("#presence-4 div select").value = "106no6"

	document.querySelector("#presence-4 div select").onchange = () => {
		switch (document.querySelector("#presence-4 div select").value) {
			case '100':
				updatePresenceChart([0, 100])
				break
			case '106':
				updatePresenceChart([0, 106])
				break
			case '106no6':
				updatePresenceChart([6, 106])
				break
			case 'all':
				updatePresenceChart([0, undefined])
				break
			case 'allno6':
				updatePresenceChart([6, undefined])
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
			case '600':
				updatePresenceChart([400, 500])
				break
		}
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
				average: 0,
			}
		}
		data.category[presence.metadata.category].presences.push(presence.name)
		data.category[presence.metadata.category].users += presence.users
	})
	Object.keys(data.category).forEach(key => {
		data.category[key].average = Math.round(data.category[key].users / data.category[key].presences.length)
	})

	tableData.category = new List(["Category", "Presences", "Users", "Average"], Object.values(data.category).map(value => [value.category, value.presences.length, value.users, value.average]))
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

			const categoryPresences = data.category[categoryName].presences.map(presenceName => `<a href="https://premid.app/store/presences/${presenceName}">${presenceName}</a>`).sort()

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

	let category11 = Object.values(data.category).length
	document.querySelector("#category-1-1 p").textContent = Object.values(data.category).length
	if (category11 > 6) {
		holdup = document.createElement("p")
		holdup.innerHTML = "Hold up. This value should be 6 at all times. Something's wrong here."
		document.querySelector("#category-1-1").appendChild(holdup)
	}
	let category12 = 0, category13 = 0
	Object.values(data.category).forEach(value => {
		category12 += Number(value.presences.length)
		category13 += Number(value.users)
	})
	document.querySelector("#category-1-2 p").textContent = Math.round(category12 / category11)
	document.querySelector("#category-1-3 p").textContent = Math.round(category13 / category11)

	$("#category-2 div div table").DataTable(miniTableSettings).rows.add(Object.values(data.category).map(v => [v.category, v.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()
	$("#category-3 div div table").DataTable(miniTableSettings).rows.add(Object.values(data.category).map(v => [v.category, v.users]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()
	$("#category-4 div div table").DataTable(miniTableSettings).rows.add(Object.values(data.category).map(v => [v.category, v.average]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()

	initChart("category2", "#category-2 canvas", "Presences")
	chartData.category2.labels = Object.values(data.category).map(v => [v.category, v.presences.length]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.category2.datasets[0].data = Object.values(data.category).map(v => v.presences.length).sort((a, b) => b - a).slice(0, 10)
	chartData.category2.datasets[0].backgroundColor = generalColorHashing
	charts.category2.update()

	initChart("category3", "#category-3 canvas", "Users")
	chartData.category3.labels = Object.values(data.category).map(v => [v.category, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.category3.datasets[0].data = Object.values(data.category).map(v => v.users).sort((a, b) => b - a).slice(0, 10)
	chartData.category3.datasets[0].backgroundColor = generalColorHashing
	charts.category3.update()

	initChart("category4", "#category-4 canvas", "Average")
	chartData.category4.labels = Object.values(data.category).map(v => [v.category, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.category4.datasets[0].data = Object.values(data.category).map(v => v.average).sort((a, b) => b - a).slice(0, 10)
	chartData.category4.datasets[0].backgroundColor = generalColorHashing
	charts.category4.update()

	/*
	================================================================
	Statistics for presence developers
	================================================================
	*/

	forEveryPresence(presence => {
		if (data.author[presence.metadata.author.id] === undefined) {
			data.author[presence.metadata.author.id] = {
				author: presence.metadata.author.name,
				id: presence.metadata.author.id,
				presences: [],
				users: 0,
				average: 0
			}
		}
		data.author[presence.metadata.author.id].presences.push(presence.name)
		data.author[presence.metadata.author.id].users += presence.users
	})
	Object.keys(data.author).forEach(key => {
		data.author[key].average = Math.round(data.author[key].users / data.author[key].presences.length)
	})

	tableData.author = new List(["Author", "ID", "Presences", "Users"], Object.values(data.author).map(value => [value.author, value.id, value.presences.length, value.users, value.average]))
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

			const authorPresences = data.author[authorID].presences.map(presenceName => `<a href="https://premid.app/store/presences/${presenceName}">${presenceName}</a>`).sort()

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

	let author11 = Object.values(data.author).length
	document.querySelector("#author-1-1 p").textContent = Object.values(data.author).length
	let author12 = 0, author13 = 0
	Object.values(data.author).forEach(value => {
		author12 += Number(value.presences.length)
		author13 += Number(value.users)
	})
	document.querySelector("#author-1-2 p").textContent = Math.round(author12 / author11)
	document.querySelector("#author-1-3 p").textContent = Math.round(author13 / author11)

	$("#author-2 div div table").DataTable(miniTableSettings).rows.add(Object.values(data.author).map(v => [v.author, v.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()
	$("#author-3 div div table").DataTable(miniTableSettings).rows.add(Object.values(data.author).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()
	$("#author-4 div div table").DataTable(miniTableSettings).rows.add(Object.values(data.author).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).slice(0, 10)).draw()

	initChart("author2", "#author-2 canvas", "Presences")
	chartData.author2.labels = Object.values(data.author).map(v => [v.author, v.presences.length]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.author2.datasets[0].data = Object.values(data.author).map(v => v.presences.length).sort((a, b) => b - a).slice(0, 10)
	chartData.author2.datasets[0].backgroundColor = generalColorHashing
	charts.author2.update()

	initChart("author3", "#author-3 canvas", "Users")
	chartData.author3.labels = Object.values(data.author).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.author3.datasets[0].data = Object.values(data.author).map(v => v.users).sort((a, b) => b - a).slice(0, 10)
	chartData.author3.datasets[0].backgroundColor = generalColorHashing
	charts.author3.update()

	initChart("author4", "#author-4 canvas", "Average")
	chartData.author4.labels = Object.values(data.author).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(0, 10)
	chartData.author4.datasets[0].data = Object.values(data.author).map(v => v.average).sort((a, b) => b - a).slice(0, 10)
	chartData.author4.datasets[0].backgroundColor = generalColorHashing
	charts.author4.update()

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
				chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.users]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(2)
				chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.users).sort((a, b) => b - a).slice(2)
				chartData.author5.datasets[0].label = "Users"
				break
			case 'average':
				chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0])
				chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.average).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Average"
				break
			case 'averagenotop':
				chartData.author5.labels = Object.values(data.author).map(v => [v.author, v.average]).sort((a, b) => b[1] - a[1]).map(v => v[0]).slice(2)
				chartData.author5.datasets[0].data = Object.values(data.author).map(v => v.average).sort((a, b) => b - a).slice(2)
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

	let implementation1 = 0,
		implementation2 = 0,
		implementation3 = 0,
		implementation4 = 0,
		implementation5 = 0,
		implementation6 = 0,
		implementation7 = 0,
		implementation8 = 0

	forEveryPresence(presence => {
		if (typeof presence.metadata.iframe !== "undefined") implementation1++
		if (typeof presence.metadata.contributors !== "undefined") implementation2++
		if (typeof presence.metadata.settings !== "undefined") implementation3++
		if (typeof presence.metadata.regExp !== "undefined") implementation4++
		if (Object.keys(presence.metadata.description).length !== 1 && typeof presence.metadata.description === "object") implementation5++
		if (presence.additional.partner) implementation6++
		if (presence.additional.hot) implementation7++
		if (typeof presence.metadata.altnames !== "undefined") implementation8++
	})

	document.querySelector("#implementation-1 p").textContent = implementation1
	document.querySelector("#implementation-2 p").textContent = implementation2
	document.querySelector("#implementation-3 p").textContent = implementation3
	document.querySelector("#implementation-4 p").textContent = implementation4
	document.querySelector("#implementation-5 p").textContent = implementation5
	document.querySelector("#implementation-6 p").textContent = implementation6
	document.querySelector("#implementation-7 p").textContent = implementation7
	document.querySelector("#implementation-8 p").textContent = implementation8
	document.querySelectorAll("#implementation-1 p")[1].textContent = `${Math.round((implementation1 / presenceCount) * 100)}% (${implementation1}/${presenceCount})`
	document.querySelectorAll("#implementation-2 p")[1].textContent = `${Math.round((implementation2 / presenceCount) * 100)}% (${implementation2}/${presenceCount})`
	document.querySelectorAll("#implementation-3 p")[1].textContent = `${Math.round((implementation3 / presenceCount) * 100)}% (${implementation3}/${presenceCount})`
	document.querySelectorAll("#implementation-4 p")[1].textContent = `${Math.round((implementation4 / presenceCount) * 100)}% (${implementation4}/${presenceCount})`
	document.querySelectorAll("#implementation-5 p")[1].textContent = `${Math.round((implementation5 / presenceCount) * 100)}% (${implementation5}/${presenceCount})`
	document.querySelectorAll("#implementation-6 p")[1].textContent = `${Math.round((implementation6 / presenceCount) * 100)}% (${implementation6}/${presenceCount})`
	document.querySelectorAll("#implementation-7 p")[1].textContent = `${Math.round((implementation7 / presenceCount) * 100)}% (${implementation7}/${presenceCount})`
	document.querySelectorAll("#implementation-8 p")[1].textContent = `${Math.round((implementation8 / presenceCount) * 100)}% (${implementation8}/${presenceCount})`

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
						language: locale[langTag],
						tag: langTag,
						presences: []
					}
				}
				data.lang[langTag].presences.push(presence.name)
			})
		}
	})

	document.querySelector("#lang-1-1 p").textContent = implementation5
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
				langPresences.push(`<a href="https://premid.app/store/presences/${presenceName}">${presenceName}</a>`)
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


document.addEventListener("DOMContentLoaded", event => {
	$.fn.dataTable.ext.errMode = 'none';
	(async () => {
		await Promise.all([
			(() => new Promise(callback => {
				$.get("https://i.imgur.com/aaaaaaa.jpg")
					.done(() => imgurAllow = true)
					.fail(() => imgurAllow = false)
					.always(() => {
						updateProgressBar(`Preparing... (${step + 1}/2)`)
						callback()
					})
			}))(),
			(() => new Promise(callback => {
				getData("/assets/other/premid-presence-stats/locale.json", response => {
					locale = response
					updateProgressBar(`Preparing... (${step + 1}/2)`)
					callback()
				})
			}))()
		])
		await (() => new Promise(callback => {
			updateProgressBar(`Fetching data...`, false)
			/**
			 * Callback for all ``getData()``.
			 */
			const getDataCallback = () => {
				updateProgressBar(`Fetching data... (${step - 1}/4)`)
				if (step === totalSteps) {
					document.querySelector("#title .status").textContent = `All data fetched! Fetched on ${(new Date()).toString()}`
					document.querySelector("#main-stats").removeAttribute("hidden")
					document.querySelector("#main-tables").removeAttribute("hidden")
					document.querySelector("#toc").removeAttribute("hidden")
					if (document.readyState === "complete" || document.readyState === "interactive") processData()
					else document.addEventListener("DOMContentLoaded", event => processData())
				}
				callback()
			}

			getData("https://api.premid.app/v2/presences", response => {
				response.forEach(value => {
					if (typeof data.presence[value.name] === "undefined") data.presence[value.name] = {}
					Object.keys(value).forEach(key => {
						data.presence[value.name][key] = value[key]
					})
				})
				getDataCallback()
			})

			getData("https://api.premid.app/v2/presenceUsage", response => {
				Object.keys(response).forEach(name => {
					if (typeof data.presence[name] === "undefined") data.presence[name] = {}
					data.presence[name].users = response[name]
				})
				getDataCallback()
			})

			getData("https://api.premid.app/v2/usage", response => {
				totalUsers = response.users
				getDataCallback()
			})

			getData("https://api.premid.app/v2/partners", response => {
				data.partner = response.map(value => value.storeName)
				getDataCallback()
			})

			// getData("/assets/other/premid-presence-stats/static-data.json", response => {
			// 	data.presence = response
			// 	forEveryPresence((presence, name) => {
			// 		if (presence.name === undefined) delete data.presence[name]
			// 		if (presence.users === undefined) delete data.presence[name]
			// 	})
			// 	step++
			// 	getDataCallback()
			// })
		}))()
	})()
})