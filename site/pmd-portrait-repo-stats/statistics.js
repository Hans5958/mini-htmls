let data = {
	pokemons: [],
	modifiedDates: [],
	modifiedDatesTidy: {},
	progress: {
		pokemon: {
			total: 0,
			0: 0,
			1: 0,
			2: 0
		},
		form: {
			total: 0,
			0: 0,
			1: 0,
			2: 0
		},
		portrait: {
			total: 0,
			0: 0,
			1: 0,
			2: 0
		},
	}
},
	// tables = {},
	// tableData = {},
	// tableSettings = {
	//     // "paging": false,
	//     // "ordering": false,
	//     // "info": false,
	//     // "searching": false
	//     "columnDefs": [{
	//         "targets": 0,
	//         "className": 'details-control',
	//         "orderable": false
	//     }],
	//     "order": [
	//         [1, 'asc']
	//     ]
	// },
	// miniTableSettings = {
	//     paging: false,
	//     ordering: false,
	//     info: false,
	//     searching: false
	// },
	// charts = {},
	// chartData = {},
	step = 0,
	totalSteps

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

// class List {
//     constructor(header, data = []) {
//         this.header = header
//         this.data = data
//     }

//     static inArray(list) {
//         if (Array.isArray(list.data)) return list.data
//         else {
//             var arr = []
//             Object.keys(list.data).forEach(key => {
//                 arr.push([])
//                 Object.values(list.data[key]).forEach(value => {
//                     arr[arr.length - 1].push(value)
//                 })
//             })
//             return arr
//         }
//     }
// }

/**
 * Initialize a chart/Chart.js instance.
 * @param {string} name The name of the chart.
 * @param {string} selector CSS selector of the canvas.
 * @param {string} label The label name.
 */
// const initChart = (name, selector, label) => {
//     chartData[name] = {
//         labels: [],
//         datasets: [{
//             type: 'bar',
//             label: label,
//             backgroundColor: "blue",
//             data: [],
//             borderColor: 'white',
//             borderWidth: 0
//         }]
//     }
//     var ctx = document.querySelector(selector).getContext('2d')
//     charts[name] = new Chart(ctx, {
//         type: 'bar',
//         data: chartData[name],
//         options: {
//             responsive: true,
//             title: {
//                 display: false
//             },
//             legend: {
//                 display: false
//             },
//             tooltips: {
//                 mode: 'index',
//                 intersect: true
//             }
//         }
//     })
// }

// https://stackoverflow.com/a/41085566

document.addEventListener("DOMContentLoaded", () => {
	const toc = document.querySelector("#toc-content")
	const headings = [...document.querySelectorAll('h2:not(.toc-ignore), h3:not(.toc-ignore), h4:not(.toc-ignore), h5:not(.toc-ignore), h6:not(.toc-ignore)')]
	headings.forEach((heading, index) => {
		let ref = "toc-" + (index + 1)
		if (heading.hasAttribute("id"))
			ref = heading.getAttribute("id")
		else
			heading.setAttribute("id", ref)

		const link = document.createElement("a")
		link.setAttribute("href", `#${ref}`)
		link.textContent = heading.textContent.replace(/\s*Toggle\s*$/, "")

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

// // https://gist.github.com/0x263b/2bdd90886c2036a1ad5bcf06d6e6fb37

// /**
//  * Generates a color hash from a specified string.
//  * @param {string} str String that will be hashed
//  */
// const getColorHash = str => {
// 	var hash = 0
// 	if (str.length === 0) return hash
// 	for (var i = 0; i < str.length; i++) {
// 		hash = str.charCodeAt(i) + ((hash << 5) - hash)
// 		hash = hash & hash
// 	}
// 	var color = '#'
// 	for (var i = 0; i < 3; i++) {
// 		var value = (hash >> (i * 8)) & 255
// 		color += ('00' + value.toString(16)).substr(-2)
// 	}
// 	return color
// }

// /**
//  * General color hashing for Chart.js.
//  * @param {*} ctx 
//  */
// const generalColorHashing = ctx => getColorHash(ctx.chart.data.labels[ctx.dataIndex])

/**
 * Updates the progress bar
 * @param {string} details The status/details that will be shown.
 * @param {boolean} increment Whether to increment the step or not
 */
const updateProgressBar = (details, increment = true) => {
	if (increment) step++
	document.querySelector("#intro .status").textContent = `${details}`
	document.querySelector("#intro .progress-bar").style.width = `${(step / totalSteps) * 100}%`
}

/**
 * Creates a square element.
 * @returns A square element
 */
const generateSquareElement = () => {
	let squareElement = document.createElement("div")
	squareElement.classList.add("viz-square")
	return squareElement.cloneNode()
}

/**
 * Start processing the data.
 */
const processData = () => {

	let squareElement

	Object.values(data.pokemons).forEach((pokemon, index) => {

		Object.values(pokemon.forms).forEach(form => {
			data.modifiedDates.push(form.modified)
		})

	})

	data.modifiedDates = data.modifiedDates.sort().sort(() => -1)
	data.modifiedDatesTidy = {}
	let unixFirst = new Date(data.modifiedDates[0]).getTime()
	let unixLast = new Date(data.modifiedDates[data.modifiedDates.length - 1]).getTime()
	let unixDiff = unixLast - unixFirst
	data.modifiedDates.forEach(date => {
		data.modifiedDatesTidy[date] = {
			unix: new Date(date).getTime(),
			heat: (new Date(date).getTime() - unixFirst) / unixDiff
		}
	})

	document.querySelectorAll(".viz-scale[data-scale-type=heatmap] .viz-scale-info").forEach(element => {
		element.querySelector(".viz-scale-left").textContent = data.modifiedDates[0]
		element.querySelector(".viz-scale-right").textContent = data.modifiedDates[data.modifiedDates.length - 1]        
	})

	Object.entries(data.pokemons).forEach(([ indexPokemon, pokemon ]) => {

		const tooltipIdPokemon = indexPokemon

		let dataPokemon = {
			name: `${pokemon.name} (${pokemon.id})`,
			status: "",
			lastModified: ""
		}

		let colorClass

		if (pokemon.complete === 0) { 
			dataPokemon.status = "Missing"
		} else if (pokemon.complete === 1) {
			colorClass = "viz-square-incomplete"
			dataPokemon.status = "Incomplete (Exists)"
		} else if (pokemon.complete === 2) { 
			colorClass = "viz-square-complete"
			dataPokemon.status = "Complete (Fully Featured)"
		}

		data.progress.pokemon[pokemon.complete]++
		data.progress.pokemon.total++

		let pokemonLastModified = {
			unix: 0, heat: 0
		}

		Object.entries(pokemon.forms).forEach(([ index, form ]) => {

			const tooltipIdForm = tooltipIdPokemon + ";" + index

			let formModifiedDate = data.modifiedDatesTidy[form.modified]

			if (pokemonLastModified.unix < formModifiedDate.unix) {
				pokemonLastModified = formModifiedDate
				data.pokemons[indexPokemon].lastModified = form.modified
			}

			data.progress.form[form.complete]++
			data.progress.form.total++    

			let portraits = form.portraits
			if (form.preversed) portraits.concat[form.preversed]

			portraits.forEach((present, index) => {

				const tooltipIdPortrait = tooltipIdForm + ";" + index
				
				data.progress.portrait[form.complete * present]++
				data.progress.portrait.total++

				squareElement = generateSquareElement()
				if (present) squareElement.classList.add(colorClass)
				squareElement.dataset.tooltipId = tooltipIdPortrait
				document.querySelector("#viz-3 .viz-grid").appendChild(squareElement.cloneNode())

			})

			squareElement = generateSquareElement()
			squareElement.classList.add(colorClass)
			squareElement.dataset.tooltipId = tooltipIdForm
			document.querySelector("#viz-2 .viz-grid").appendChild(squareElement.cloneNode())
		
			squareElement = generateSquareElement()
			squareElement.style.backgroundColor = `rgb(${255 * formModifiedDate.heat}, 0, 0)`
			squareElement.dataset.tooltipId = tooltipIdForm
			document.querySelector("#viz-5 .viz-grid").appendChild(squareElement.cloneNode())
	
		})

		squareElement = generateSquareElement()
		squareElement.classList.add(colorClass)
		squareElement.dataset.tooltipId = tooltipIdPokemon
		document.querySelector("#viz-1 .viz-grid").appendChild(squareElement.cloneNode())
	
		squareElement = generateSquareElement()
		squareElement.style.backgroundColor = `rgb(${255 * pokemonLastModified.heat}, 0, 0)`
		squareElement.dataset.tooltipId = tooltipIdPokemon
		document.querySelector("#viz-4 .viz-grid").appendChild(squareElement.cloneNode())

	})

	Object.keys(data.progress).forEach((key, i) => {
		i++
		progress = data.progress[key]
		console.log(`#progress-${i}-1 .count-main`)
		for (let i2 = 0; i2 < 3; i2++) {
			document.querySelector(`#progress-${i}-${i2+1} .count-main`).textContent = progress[2-i2]
			document.querySelector(`#progress-${i}-${i2+1} .count-details`).textContent = `${Math.round((progress[2-i2] / progress.total) * 100)}% (${progress[2-i2]}/${progress.total})`
			document.querySelectorAll(`#progress-${i}-5 .progress-bar`)[i2]["aria-valuenow"] = progress[2-i2]
			document.querySelectorAll(`#progress-${i}-5 .progress-bar`)[i2].style.width = `${(progress[2-i2] / progress.total) * 100}%`
			document.querySelectorAll(`#progress-${i}-5 .progress-bar`)[i2].textContent = `${Math.round((progress[2-i2] / progress.total) * 100)}% (${progress[2-i2]}/${progress.total})`
			document.querySelectorAll(`#progress-${i}-5 .progress-bar`)[i2]["aria-valuemax"] = progress.total
		}
		document.querySelector(`#progress-${i}-4 .count`).textContent = progress.total
	})

}

// $.fn.dataTable.ext.errMode = 'none';
(async () => {
	// await Promise.all([
	//     (() => new Promise(callback => {
	//         getData(jsonData.locale, response => {
	//             locale = response
	//             updateProgressBar(`Preparing... (${step + 1}/2)`)
	//             callback()
	//         })
	//     }))()
	// ])
	await (() => new Promise(callback => {
		updateProgressBar(`Fetching data...`, false)

		step = 0
		totalSteps = 2

		/**
		 * Callback for all ``getData()``.
		 */
		const getDataCallback = () => { 
			updateProgressBar(`Fetching data... (${step + 1}/${totalSteps + 1})`)
			if (step === totalSteps) {
				document.querySelector("#intro .status").textContent = `All data fetched! Fetched on ${(new Date()).toString()}`
				document.querySelector("#main-stats").removeAttribute("hidden")
				// document.querySelector("#main-tables").removeAttribute("hidden")
				document.querySelector("#toc").removeAttribute("hidden")
				if (document.readyState === "complete" || document.readyState === "interactive") processData()
				else document.addEventListener("DOMContentLoaded", () => processData())
			}
			callback()
		}

		getData("https://raw.githubusercontent.com/PMDCollab/SpriteViewer/main/resources/pokemons.json", response => {
			data.pokemons = response
			getDataCallback()
		})

		getData(jsonData.portraitDict, response => {
			data.portraitDict = response
			getDataCallback()
		})

	}))()
})()