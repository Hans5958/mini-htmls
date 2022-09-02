dayjs.extend(window.dayjs_plugin_utc)
let currentCount = 0,
	diffAvg = 0,
	diffReal = 0,
	timerSet = () => Math.round((63 - (new Date() % 60000 / 1000) - (Math.random() * 4) + 2) * 1000),
	timer,
	diffArray = [],
	cors,
	parser = new DOMParser()

const getData = async (url) => await fetch(cors + url)

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
	let requestLb
	let requestTotal
	await Promise.all([
		(async () => {
			requestLb = await (await getData('https://tscache.com/lb_recent.json')).json()
		})(),
		(async () => {
			requestTotal = await (await getData('https://tscache.com/donation_total.json')).json()
		})()
	])
	afterGet({lb: requestLb, total: requestTotal})
	// $("#counter").delay(500).fadeIn(500)
}

$(async () => {
	// let time = dayjs.utc("2022-01-01 00:00")
	// let $clock = $('#countdown')
	// $clock.countdown(time.toDate(), function (event) {
	// 	$(this).html(event.strftime('%D:%H:%M:%S'))
	// })
	cors = await window.getCorsUrl()
	reload()
	let targetTime = Date.now() + timerSet()
	setInterval(() => {
		let timer = (targetTime - Date.now())/1000
		document.querySelector("#update").textContent = "Update: " + timer.toFixed(1) + "s"
		if (timer <= 0) {
			targetTime += timerSet()
			reload()
		}
	}, 10)
})