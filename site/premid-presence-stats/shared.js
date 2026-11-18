/**
 * Rendering layer for the PreMiD presence statistics page.
 *
 * Reusable by any entry point that can provide a presence dump. It expects:
 * - jQuery + Bootstrap 4 from the site layout (jQuery plugins, tabs, collapse)
 * - DataTables 3 with the Bootstrap 4 renderer (ESM). The page must declare
 *   an import map for the bare `datatables.net` specifier used below.
 * - Chart.js 3 (ESM)
 */

import Chart from "https://esm.run/chart.js@3/auto"
import "datatables.net"
import "https://cdn.jsdelivr.net/npm/datatables.net-bs4@3.1.4/js/dataTables.bootstrap4.mjs"

import {
	List,
	forEveryPresence,
	generalColorHashing,
	preparePresenceData,
	buildCategoryStats,
	buildAuthorStats,
	buildLanguageStats,
	buildImplementationStats
} from "./core.js"

const $ = window.jQuery

const ADD_ICON = '<span class="iconify" data-icon="ic:baseline-add-circle-outline"></span>'
const REMOVE_ICON = '<span class="iconify" data-icon="ic:baseline-remove-circle"></span>'

const tableSettings = {
	columnDefs: [{
		targets: 0,
		className: 'details-control',
		orderable: false
	}],
	order: [[1, 'asc']]
}

const miniTableSettings = {
	paging: false,
	ordering: false,
	info: false,
	searching: false
}

const charts = {}
const chartData = {}
const tables = {}

/**
 * Initialize a Chart.js instance.
 */
const initChart = (name, selector, label) => {
	chartData[name] = {
		labels: [],
		datasets: [{
			type: 'bar',
			label,
			backgroundColor: "blue",
			data: [],
			borderColor: 'white',
			borderWidth: 0
		}]
	}
	const ctx = document.querySelector(selector).getContext('2d')
	charts[name] = new Chart(ctx, {
		type: 'bar',
		data: chartData[name],
		options: {
			responsive: true,
			plugins: {
				title: { display: false },
				legend: { display: false },
				tooltip: { mode: 'index', intersect: true }
			}
		}
	})
}

/**
 * Create a DataTable, fill it and apply ordering/visibility in one place.
 * The API calls are intentionally not chained: DataTables 3 returns typed
 * instances, so `rows.add()` is not a table instance.
 *
 * On re-render the same selector is reused: the existing instance is cleared
 * instead of destroyed, because `destroy()` removes the table markup from the
 * DOM and would leave nothing to re-initialise.
 */
const createTable = (selector, rows, { order, hiddenColumns = [], settings = tableSettings } = {}) => {
	let table = tables[selector]
	if (table) {
		table.clear()
	} else {
		table = $(selector).DataTable(settings)
	}
	hiddenColumns.forEach(columnIndex => table.column(columnIndex).visible(false))
	table.rows.add(rows)
	if (order) table.order(order)
	table.draw()
	tables[selector] = table
	return table
}

const createMiniTable = (selector, rows) => createTable(selector, rows, { settings: miniTableSettings })

const rowWithControl = row => [ADD_ICON, ...row]

/**
 * Bind the expand/collapse handler used by the main tables.
 */
const bindDetails = (selector, table, format) => {
	// Re-rendering rebinds the same selector, so drop stale handlers first.
	$(selector).off('click', 'td.details-control')
	$(selector).on('click', 'td.details-control', event => {
		const tr = $(event.target).closest('tr')
		const row = table.row(tr)

		if (row.child.isShown()) {
			row.child.hide()
			tr.removeClass('shown')
			event.target.innerHTML = ADD_ICON
		} else {
			row.child(format(row.data())).show()
			tr.addClass('shown')
			event.target.innerHTML = REMOVE_ICON
		}
	})
}

/**
 * Build the table of contents from the page headings.
 */
export const renderToc = () => {
	const toc = document.querySelector("#toc div div div")
	if (!toc) return

	const headings = [].slice.call(document.querySelectorAll('h2:not(.toc-ignore), h3:not(.toc-ignore), h4:not(.toc-ignore), h5:not(.toc-ignore), h6:not(.toc-ignore)'))
	headings.forEach((heading, index) => {
		let ref = "toc-" + (index + 1)
		if (heading.hasAttribute("id")) ref = heading.getAttribute("id")
		else heading.setAttribute("id", ref)

		const link = document.createElement("a")
		link.setAttribute("href", `#${ref}`)
		link.textContent = heading.textContent

		const div = document.createElement("div")
		div.setAttribute("class", `toc-${heading.tagName.toLowerCase()}`)
		div.appendChild(link)
		toc.children[(index >= Math.round(headings.length / 2)) ? 1 : 0].appendChild(div)
	})
}

/*
================================================================
Statistics for usage
================================================================
*/

const renderUsage = ({ totalUsers }) => {
	document.querySelector("#usage-1-1 p").textContent = totalUsers
	document.querySelector("#usage-1-2 p").textContent = Math.round(totalUsers * 0.05)
}

/*
================================================================
Statistics for presences
================================================================
*/

const formatPresenceDetails = (row, presence) => {
	const presenceName = row[1]
	const presenceNameClass = presenceName.toLowerCase().replace(" ", "-")
	const entry = presence[presenceName]

	const presenceInfo = []
	presenceInfo.push(`<p><strong>Service</strong>: ${presenceName}</p>`)
	presenceInfo.push(`<p><strong>Author</strong>: <a href="https://premid.app/users/${entry.metadata.author.id}">${entry.metadata.author.name}</a></p>`)
	if (entry.metadata.contributors) {
		presenceInfo.push(`<p><strong>Contributors</strong>: ${entry.metadata.contributors.map(contributor => `<a href="https://premid.app/users/${contributor.id}">${contributor.name}</a>`).join(", ")}</p>`)
	}
	presenceInfo.push(`<p><strong>Version</strong>: ${entry.metadata.version}</p>`)
	presenceInfo.push(`<p><strong>Users</strong>: ${entry.users} (${Math.round(entry.additional.userPercentage * 100) / 100}%${entry.additional.hot ? ", 🔥" : ""})</p>`)
	presenceInfo.push(`<p><strong>Category</strong>: ${entry.metadata.category}</p>`)
	presenceInfo.push(`<p><strong>Tags</strong>: ${entry.metadata.tags.join(", ")}</p>`)

	const urlVal = entry.metadata.url
	if (typeof urlVal === "string") {
		presenceInfo.push(`<p><strong>URL</strong>: <a href="https://${urlVal}">${urlVal}</a></p>`)
	} else {
		presenceInfo.push(`<p><strong>URL</strong>: ${urlVal.map(url => `<a href="https://${url}">${url}</a>`).join(", ")}</p>`)
	}

	presenceInfo.push(`<p style="display:inline-block"><strong>Color</strong>: ${entry.metadata.color}</p>`)
	presenceInfo.push(`<div class="color-preview" style="background:${entry.metadata.color};"></div>`)
	presenceInfo.push(`<p><strong>Alternative Name</strong>: ${entry.metadata.altnames ? entry.metadata.altnames.join(", ") : "None"}</p>`)
	presenceInfo.push(`<p><strong>Using regex?</strong>: ${entry.metadata.regExp ? `Yes (<code>${entry.metadata.regExp}</code>)` : "No"}</p>`)
	presenceInfo.push(`<p><strong>Using iFrame?</strong>: ${entry.metadata.iframe ? "Yes" : "No"}</p>`)
	presenceInfo.push(`<p><strong>Using settings?</strong>: ${entry.metadata.settings ? "Yes" : "No"}</p>`)
	presenceInfo.push(`<p><strong>Partner?</strong>: ${entry.additional.partner ? "Yes" : "No"}</p>`)

	const langTabs = []
	const langCards = []
	Object.keys(entry.metadata.description).forEach((lang, index) => {
		if (index !== 0) {
			langTabs.push(`<li class="nav-item"><a href="#card-${lang}" class="nav-link" id="tab-${lang}" data-toggle="tab" role="tab" aria-controls="card-${lang}" aria-selected="true">${lang}</a></li>`)
			langCards.push(`<div class="tab-pane" id="card-${lang}" role="tabpanel" aria-labelledby="tab-${lang}">${entry.metadata.description[lang]}</div>`)
		} else {
			langTabs.push(`<li class="nav-item"><a href="#card-${lang}" class="nav-link active" id="tab-${lang}" data-toggle="tab" role="tab" aria-controls="card-${lang}" aria-selected="true">${lang}</a></li>`)
			langCards.push(`<div class="tab-pane show active" id="card-${lang}" role="tabpanel" aria-labelledby="tab-${lang}">${entry.metadata.description[lang]}</div>`)
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
					<a href="https://github.com/PreMiD/Presences/tree/master/websites/${presenceName.slice(0, 1).toUpperCase()}/${presenceName}" target="_blank" class="btn btn-secondary" role="button">Source Code (GitHub)</a>
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
									<img src="${entry.metadata.logo}" alt="${entry.metadata.logo}" style="max-height: 256px; width:100%; object-fit: contain;">
								</div>
								<div class="tab-pane" id="card-thumbnail-${presenceNameClass}" role="tabpanel" aria-labelledby="tab-thumbnail-${presenceNameClass}">
									<img src="${entry.metadata.thumbnail}" alt="${entry.metadata.thumbnail}" style="max-height: 256px; width:100%; object-fit: contain;">
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>`
}

const renderPresences = ({ presence, presenceCount }) => {
	// The dump key is not always the presence name (e.g. "zoom" vs "Zoom"),
	// so look entries up by name explicitly.
	const byName = Object.fromEntries(Object.values(presence).map(entry => [entry.name, entry]))

	const tableData = new List(
		["Presence", "Category", "Author", "Users", "Search Tags"],
		Object.values(presence).map(entry => [entry.name, entry.metadata.category, entry.metadata.author.name, entry.users, entry.metadata.tags.join(" ")])
	)

	tableData.data.forEach(row => {
		const altnames = byName[row[0]].metadata.altnames
		if (altnames) row[4] += ` ${altnames.join(" ")}`
	})

	tables.presence = createTable("table#presence", tableData.data.map(rowWithControl), {
		hiddenColumns: [5],
		order: [[4, "des"]]
	})

	bindDetails('table#presence tbody', tables.presence, row => formatPresenceDetails(row, byName))

	document.querySelector("#presence-1-1 p").textContent = presenceCount
	const presence12 = Object.values(presence).reduce((total, entry) => total + Number(entry.users), 0)
	document.querySelector("#presence-1-2 p").textContent = presence12
	document.querySelector("#presence-1-3 p").textContent = Math.round(presence12 / presenceCount)

	const presenceTop = Object.values(presence)
		.map(entry => ({ name: entry.name, users: entry.users, entry }))
		.sort((a, b) => b.users - a.users)

	createMiniTable("#presence-2 div div table", presenceTop.slice(0, 10).map(entry => [entry.name, entry.users]))
	createMiniTable("#presence-3 div div table", presenceTop.slice(6, 16).map(entry => [entry.name, entry.users]))

	initChart("presence", "#presence-4 canvas", "Users")
	chartData.presence.datasets[0].backgroundColor = ctx => {
		const entry = presenceTop[ctx.dataIndex]
		if (!entry) {
			console.error('presence color: datum missing', ctx.dataIndex, presenceTop.length)
			return '#888'
		}
		return entry.entry.metadata.color
	}

	const updatePresenceChart = range => {
		chartData.presence.labels = presenceTop.slice(...range).map(entry => entry.name)
		chartData.presence.datasets[0].data = presenceTop.slice(...range).map(entry => entry.users)
		charts.presence.update()
	}

	const selectChartElement = document.querySelector('#presence-4 select')
	for (let i = 1; i < Math.ceil(presenceCount / 100); i++) {
		const optionElement = document.createElement('option')
		optionElement.value = i * 100
		optionElement.textContent = `${(i - 1) * 100 + 1}-${i * 100}`
		selectChartElement.appendChild(optionElement)
	}

	updatePresenceChart([6, 106])
	selectChartElement.value = "106no6"
	selectChartElement.onchange = () => {
		const chartType = selectChartElement.value
		if (chartType === '106') updatePresenceChart([0, 106])
		else if (chartType === '106no6') updatePresenceChart([6, 106])
		else if (chartType === 'all') updatePresenceChart([0, undefined])
		else if (chartType === 'allno6') updatePresenceChart([6, undefined])
		else updatePresenceChart([chartType - 100, chartType - 0])
	}
}

/*
================================================================
Statistics for categories
================================================================
*/

const formatCategoryDetails = (row, category) => {
	const categoryName = row[1]
	const entry = category[categoryName]

	const categoryInfo = []
	categoryInfo.push(`<p><strong>Category</strong>: ${categoryName}</p>`)
	categoryInfo.push(`<p><strong>Presence count</strong>: ${entry.presences.length}</p>`)
	categoryInfo.push(`<p><strong>User count</strong>: ${entry.users}</p>`)
	categoryInfo.push(`<p><strong>User to presence average</strong>: ${entry.average}</p>`)
	categoryInfo.push(`<a href="https://premid.app/store?category=${categoryName}" target="_blank" class="btn btn-primary" role="button" style="margin-top:1rem">PreMiD Store</a>`)

	const categoryPresences = entry.presences
		.map(presenceName => `<a href="https://premid.app/store/presences/${presenceName}">${presenceName}</a>`)
		.sort()

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

const renderCategories = ({ category }) => {
	const tableData = new List(
		["Category", "Presences", "Users", "Average"],
		Object.values(category).map(entry => [entry.category, entry.presences.length, entry.users, entry.average])
	)

	tables.category = createTable("table#category", tableData.data.map(rowWithControl), {
		order: [[2, "des"]]
	})

	bindDetails('table#category tbody', tables.category, row => formatCategoryDetails(row, category))

	const categoryCount = Object.values(category).length
	document.querySelector("#category-1-1 p").textContent = categoryCount
	if (categoryCount > 6) {
		const holdup = document.createElement("p")
		holdup.innerHTML = "Hold up. This value should be 6 at all times. Something's wrong here."
		document.querySelector("#category-1-1").appendChild(holdup)
	}

	const category12 = Object.values(category).reduce((total, entry) => total + Number(entry.presences.length), 0)
	const category13 = Object.values(category).reduce((total, entry) => total + Number(entry.users), 0)
	document.querySelector("#category-1-2 p").textContent = Math.round(category12 / categoryCount)
	document.querySelector("#category-1-3 p").textContent = Math.round(category13 / categoryCount)

	createMiniTable("#category-2 div div table", Object.values(category).map(entry => [entry.category, entry.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10))
	createMiniTable("#category-3 div div table", Object.values(category).map(entry => [entry.category, entry.users]).sort((a, b) => b[1] - a[1]).slice(0, 10))
	createMiniTable("#category-4 div div table", Object.values(category).map(entry => [entry.category, entry.average]).sort((a, b) => b[1] - a[1]).slice(0, 10))

	initChart("category2", "#category-2 canvas", "Presences")
	chartData.category2.labels = Object.values(category).map(entry => [entry.category, entry.presences.length]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(0, 10)
	chartData.category2.datasets[0].data = Object.values(category).map(entry => entry.presences.length).sort((a, b) => b - a).slice(0, 10)
	chartData.category2.datasets[0].backgroundColor = generalColorHashing
	charts.category2.update()

	initChart("category3", "#category-3 canvas", "Users")
	chartData.category3.labels = Object.values(category).map(entry => [entry.category, entry.users]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(0, 10)
	chartData.category3.datasets[0].data = Object.values(category).map(entry => entry.users).sort((a, b) => b - a).slice(0, 10)
	chartData.category3.datasets[0].backgroundColor = generalColorHashing
	charts.category3.update()

	initChart("category4", "#category-4 canvas", "Average")
	chartData.category4.labels = Object.values(category).map(entry => [entry.category, entry.average]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(0, 10)
	chartData.category4.datasets[0].data = Object.values(category).map(entry => entry.average).sort((a, b) => b - a).slice(0, 10)
	chartData.category4.datasets[0].backgroundColor = generalColorHashing
	charts.category4.update()
}

/*
================================================================
Statistics for presence developers
================================================================
*/

const formatAuthorDetails = (row, author) => {
	const authorID = row[2]
	const entry = author[authorID]

	const authorInfo = []
	authorInfo.push(`<p><strong>Author</strong>: ${entry.author} (<code>${authorID}</code>)</p>`)
	authorInfo.push(`<p><strong>Presence count</strong>: ${entry.presences.length}</p>`)
	authorInfo.push(`<p><strong>User count</strong>: ${entry.users}</p>`)
	authorInfo.push(`<p><strong>User to presence average</strong>: ${entry.average}</p>`)
	authorInfo.push(`<a href="https://premid.app/users/${authorID}" target="_blank" class="btn btn-primary" role="button" style="margin-top:1rem">PreMiD Store</a>`)

	const authorPresences = entry.presences
		.map(presenceName => `<a href="https://premid.app/store/presences/${presenceName}">${presenceName}</a>`)
		.sort()

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

const renderAuthors = ({ author }) => {
	const tableData = new List(
		["Author", "ID", "Presences", "Users"],
		Object.values(author).map(entry => [entry.author, entry.id, entry.presences.length, entry.users, entry.average])
	)

	tables.author = createTable("table#author", tableData.data.map(rowWithControl), {
		order: [[3, "des"]]
	})

	bindDetails('table#author tbody', tables.author, row => formatAuthorDetails(row, author))

	const authorCount = Object.values(author).length
	document.querySelector("#author-1-1 p").textContent = authorCount
	const author12 = Object.values(author).reduce((total, entry) => total + Number(entry.presences.length), 0)
	const author13 = Object.values(author).reduce((total, entry) => total + Number(entry.users), 0)
	document.querySelector("#author-1-2 p").textContent = Math.round(author12 / authorCount)
	document.querySelector("#author-1-3 p").textContent = Math.round(author13 / authorCount)

	createMiniTable("#author-2 div div table", Object.values(author).map(entry => [entry.author, entry.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10))
	createMiniTable("#author-3 div div table", Object.values(author).map(entry => [entry.author, entry.users]).sort((a, b) => b[1] - a[1]).slice(0, 10))
	createMiniTable("#author-4 div div table", Object.values(author).map(entry => [entry.author, entry.average]).sort((a, b) => b[1] - a[1]).slice(0, 10))

	initChart("author2", "#author-2 canvas", "Presences")
	chartData.author2.labels = Object.values(author).map(entry => [entry.author, entry.presences.length]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(0, 10)
	chartData.author2.datasets[0].data = Object.values(author).map(entry => entry.presences.length).sort((a, b) => b - a).slice(0, 10)
	chartData.author2.datasets[0].backgroundColor = generalColorHashing
	charts.author2.update()

	initChart("author3", "#author-3 canvas", "Users")
	chartData.author3.labels = Object.values(author).map(entry => [entry.author, entry.users]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(0, 10)
	chartData.author3.datasets[0].data = Object.values(author).map(entry => entry.users).sort((a, b) => b - a).slice(0, 10)
	chartData.author3.datasets[0].backgroundColor = generalColorHashing
	charts.author3.update()

	initChart("author4", "#author-4 canvas", "Average")
	chartData.author4.labels = Object.values(author).map(entry => [entry.author, entry.average]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(0, 10)
	chartData.author4.datasets[0].data = Object.values(author).map(entry => entry.average).sort((a, b) => b - a).slice(0, 10)
	chartData.author4.datasets[0].backgroundColor = generalColorHashing
	charts.author4.update()

	initChart("author5", "#author-5 canvas", "")
	chartData.author5.datasets[0].backgroundColor = generalColorHashing
	chartData.author5.labels = Object.values(author).map(entry => [entry.author, entry.users]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(2)
	chartData.author5.datasets[0].data = Object.values(author).map(entry => entry.users).sort((a, b) => b - a).slice(2)
	chartData.author5.datasets[0].label = "Users"
	charts.author5.update()

	const authorSelect = document.querySelector("#author-5 div select")
	authorSelect.value = "usernotop"
	authorSelect.onchange = () => {
		switch (authorSelect.value) {
			case 'presence':
				chartData.author5.labels = Object.values(author).map(entry => [entry.author, entry.presences.length]).sort((a, b) => b[1] - a[1]).map(entry => entry[0])
				chartData.author5.datasets[0].data = Object.values(author).map(entry => entry.presences.length).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Presences"
				break
			case 'presencenotop':
				chartData.author5.labels = Object.values(author).map(entry => [entry.author, entry.presences.length]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(1)
				chartData.author5.datasets[0].data = Object.values(author).map(entry => entry.presences.length).sort((a, b) => b - a).slice(1)
				chartData.author5.datasets[0].label = "Presences"
				break
			case 'user':
				chartData.author5.labels = Object.values(author).map(entry => [entry.author, entry.users]).sort((a, b) => b[1] - a[1]).map(entry => entry[0])
				chartData.author5.datasets[0].data = Object.values(author).map(entry => entry.users).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Users"
				break
			case 'usernotop':
				chartData.author5.labels = Object.values(author).map(entry => [entry.author, entry.users]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(3)
				chartData.author5.datasets[0].data = Object.values(author).map(entry => entry.users).sort((a, b) => b - a).slice(3)
				chartData.author5.datasets[0].label = "Users"
				break
			case 'average':
				chartData.author5.labels = Object.values(author).map(entry => [entry.author, entry.average]).sort((a, b) => b[1] - a[1]).map(entry => entry[0])
				chartData.author5.datasets[0].data = Object.values(author).map(entry => entry.average).sort((a, b) => b - a)
				chartData.author5.datasets[0].label = "Average"
				break
			case 'averagenotop':
				chartData.author5.labels = Object.values(author).map(entry => [entry.author, entry.average]).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(1)
				chartData.author5.datasets[0].data = Object.values(author).map(entry => entry.average).sort((a, b) => b - a).slice(1)
				chartData.author5.datasets[0].label = "Average"
				break
		}
		charts.author5.update()
	}
}

/*
================================================================
Statistics for feature implementation
================================================================
*/

const renderImplementations = ({ implementation, presenceCount }) => {
	for (let i = 1; i < implementation.length; i++) {
		document.querySelector(`#implementation-${i} p`).textContent = implementation[i]
		document.querySelectorAll(`#implementation-${i} p`)[1].textContent = `${Math.round((implementation[i] / presenceCount) * 100)}% (${implementation[i]}/${presenceCount})`
	}
}

/*
================================================================
Statistics for description languages
================================================================
*/

const formatLanguageDetails = (row, lang) => {
	const langTag = row[2]
	const entry = lang[langTag]

	const langInfo = []
	langInfo.push(`<p><strong>Language</strong>: ${entry.language} (${langTag})</p>`)
	langInfo.push(`<p><strong>Presence count</strong>: ${entry.presences.length}</p>`)

	const langPresences = entry.presences
		.map(presenceName => `<a href="https://premid.app/store/presences/${presenceName}">${presenceName}</a>`)

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

const renderLanguages = ({ lang, implementation, presenceCount }) => {
	document.querySelector("#lang-1-1 p").textContent = implementation[5]
	document.querySelector("#lang-1-2 p").textContent = Object.keys(lang).length

	createMiniTable("#lang-2 div div table", Object.values(lang).map(entry => [`${entry.language} (${entry.tag})`, entry.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10))
	initChart("lang2", "#lang-2 canvas", "Presences")
	chartData.lang2.labels = Object.values(lang).map(entry => [`${entry.language} (${entry.tag})`, entry.presences.length]).sort((a, b) => b[1] - a[1]).slice(0, 10).map(entry => entry[0])
	chartData.lang2.datasets[0].data = Object.values(lang).map(entry => entry.presences.length).sort((a, b) => b - a).slice(0, 10)
	chartData.lang2.datasets[0].backgroundColor = generalColorHashing
	charts.lang2.update()

	const tableData = new List(
		["Language", "Tag", "Presences"],
		Object.values(lang).map(entry => [entry.language, entry.tag, entry.presences.length])
	)

	tables.lang = createTable("table#lang", tableData.data.map(rowWithControl), {
		order: [[3, "des"]]
	})

	bindDetails('table#lang tbody', tables.lang, row => formatLanguageDetails(row, lang))

	const langSelect = document.querySelector("#lang-3 select")
	langSelect.onchange = () => {
		switch (langSelect.value) {
			case 'all':
				chartData.lang3.labels = Object.values(lang).map(entry => [`${entry.language} (${entry.tag})`, entry.presences.length]).sort((a, b) => b[1] - a[1]).map(entry => entry[0])
				chartData.lang3.datasets[0].data = Object.values(lang).map(entry => entry.presences.length).sort((a, b) => b - a)
				break
			case 'no1':
				chartData.lang3.labels = Object.values(lang).map(entry => [`${entry.language} (${entry.tag})`, entry.presences.length]).sort((a, b) => b[1] - a[1]).slice(1).map(entry => entry[0])
				chartData.lang3.datasets[0].data = Object.values(lang).map(entry => entry.presences.length).sort((a, b) => b - a).slice(1)
				break
		}
		charts.lang3.update()
	}

	initChart("lang3", "#lang-3 canvas", "Presences")
	chartData.lang3.labels = Object.values(lang).map(entry => [`${entry.language} (${entry.tag})`, entry.presences.length]).sort((a, b) => b[1] - a[1]).map(entry => entry[0])
	chartData.lang3.datasets[0].data = Object.values(lang).map(entry => entry.presences.length).sort((a, b) => b - a)
	chartData.lang3.datasets[0].backgroundColor = generalColorHashing
	charts.lang3.update()
}

/**
 * Render every statistics section from a raw presence dump.
 *
 * @param {{rawPresence: object, locale?: object, imgurAllow?: boolean}} options
 */
export const renderStatistics = ({ rawPresence, locale = {}, imgurAllow = false }) => {
	const { presence, totalUsers } = preparePresenceData(rawPresence)

	if (imgurAllow) {
		forEveryPresence(presence, entry => {
			if (entry.metadata.logo.startsWith("https://proxy.duckduckgo.com/iu/?u=")) entry.metadata.logo = entry.metadata.logo.substring(35)
			if (entry.metadata.thumbnail.startsWith("https://proxy.duckduckgo.com/iu/?u=")) entry.metadata.thumbnail = entry.metadata.thumbnail.substring(35)
		})
	}

	const presenceCount = Object.keys(presence).length
	const implementation = buildImplementationStats(presence)

	renderUsage({ totalUsers })
	renderPresences({ presence, presenceCount })
	renderCategories({ category: buildCategoryStats(presence) })
	renderAuthors({ author: buildAuthorStats(presence) })
	renderImplementations({ implementation, presenceCount })
	renderLanguages({ lang: buildLanguageStats(presence, locale), implementation, presenceCount })

	return { presence, totalUsers }
}

/**
 * Reset state between re-renders. DataTables instances are cleared (not
 * destroyed) because `destroy()` removes the table markup from the DOM.
 */
export const teardown = () => {
	Object.values(tables).forEach(table => {
		try { table.clear() } catch {}
	})
	Object.values(charts).forEach(chart => {
		try { chart.destroy() } catch {}
	})
	Object.keys(charts).forEach(key => delete charts[key])
	Object.keys(chartData).forEach(key => delete chartData[key])
}
