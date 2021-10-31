dayjs.extend(window.dayjs_plugin_utc)
let currentCount = 0,
	diffAvg = 0,
	diffReal = 0,
	initTimer = () => Math.round((63 - (new Date() % 60000 / 1000) - (Math.random() * 4) + 2) * 10),
	timer,
	diffArray = [],
	cors,
	parser = new DOMParser()

const corsDetect = () => new Promise(callback => {
		$.get("https://tscache.com/donation_total.json")
			.done(function() {
				callback("")
			})
			.fail(function() {
				$.get("https://cf-cors.hans5958.workers.dev/?url=https://tscache.com/donation_total.json")
					.done(function() {
						callback("https://cf-cors.hans5958.workers.dev/?url=")
					})
					.fail(function() {
						callback(false)
					})
			})
	})

const getData = async (url, success, fail) => {
	const response = await fetch(cors + url).catch(fail)
	return response
}

const updateMargin = () => {
	document.querySelector("#main p").textContent = currentCount
	document.querySelector("#diff p").textContent = diffAvg
	document.querySelector("#diffReal p").textContent = diffReal
}

const updateDiff = (number, array) => {
	if (!isNaN(number)) {
		array.push(number)
		if (array.length > 11) {
			array.shift()
		}
		return Math.round(sumArray(array) * 10 / array.length)
	}
}

const updateStats = array => {
	document.querySelector("#recentDonations").textContent = ""
	let recentDonations = array.recent
	for (let i in recentDonations) {
		if (i == 5) {
			break
		}
		let item = recentDonations[i]
		let name = item.name
		let amount = Number(item.pounds.replace(/,/g, ''))
		let time = dayjs(item.created_at * 1000)

		let tr = document.createElement("tr")
		let td1 = document.createElement("td")
		let td2 = document.createElement("td")
		let td3 = document.createElement("td")
		td1.innerHTML = name
		td2.innerHTML = '$' + amount
		td3.innerHTML = dayjs(time).format("D/M/YYYY, H:mm:ss")
		// td3.innerHTML = element.querySelector('.feed-datetime').textContent
		tr.appendChild(td1)
		tr.appendChild(td2)
		tr.appendChild(td3)
		let table = document.querySelector("#recentDonations")
		table.append(tr)

	}
}

const sumArray = a => {
	return a.reduce((y, z) => y + z)
}

// const reset = () => {
// 	$("p").html("0")
// 	$("p.diff").html("0")
// 	$("p.margin").html("0")
// 	currentCount = 0
// 	diffAvg = 0
// 	diffArray = []
// 	f = false
// 	$(".1").css("opacity", "1")
// 	$(".margin").css("opacity", "1")
// }

const afterGet = (response) => {
	let countUpdate = response.total.count 
	if (currentCount) {
		diffAvg = updateDiff(countUpdate - currentCount, diffArray)
		diffReal = countUpdate - currentCount
		console.log(diffReal)
	}
	currentCount = countUpdate
	updateMargin()
	updateStats(response.lb)
}

const reload = async () => {
	let requestLb = await (await getData('https://tscache.com/lb_recent.json')).json()
	let requestTotal = await (await getData('https://tscache.com/donation_total.json')).json()
	afterGet({lb: requestLb, total: requestTotal})
	// $("#counter").delay(500).fadeIn(500)
}

$(async () => {
	let time = dayjs.utc("2022-01-01 00:00")
	let $clock = $('#countdown')
	$clock.countdown(time.toDate(), function (event) {
		$(this).html(event.strftime('%D:%H:%M:%S'))
	})
	cors = await corsDetect()
	// await $("#counter").fadeOut(250)
	// await reset()
	setInterval(async () => {
		timer--
		$("#update").html("Update: " + timer/10 + "s")
		if (!timer) {
			timer = initTimer()
			reload()
		}
	}, 100)
})