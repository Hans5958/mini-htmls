dayjs.extend(window.dayjs_plugin_utc)
let currentCount = 0,
	delayCount = 0,
	diffAvg = 0,
	diffReal = 0,
	diffdelay = 0,
	initTimer = () => Math.round((63 - (new Date() % 60000 / 1000) - (Math.random() * 4) + 2) * 10),
	timer,
	diffArray = [],
	cors,
	parser = new DOMParser(),
	queueInfo = [],
	queueAmount = {},
	queueCallback = {}

const digestMessage = async message => {
	const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
	const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
	return hashHex;
}

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
	document.querySelector("#main p").textContent = currentCount + delayCount
	document.querySelector("#diff p").textContent = diffdelay
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

const updateStats = async array => {
	// document.querySelector("#recentDonations").textContent = ""
	let recentDonations = array.recent
	for (let i in recentDonations) {
		let item = recentDonations[i]
		let name = item.name
		let amount = Number(item.pounds.replace(/,/g, ''))
		let time = dayjs(item.created_at * 1000)
		let hash = await digestMessage(JSON.stringify(item)).then(hex => hex)

		await addRecent(
			name,
			amount,
			time,
			hash
		)
		// if (i > 5) {
		// 	continue
		// }
		// let tr = document.createElement("tr")
		// let td1 = document.createElement("td")
		// let td2 = document.createElement("td")
		// let td3 = document.createElement("td")
		// td1.innerHTML = item.name
		// td2.innerHTML = '$' + item.pounds
		// td3.innerHTML = dayjs(item.created_at * 1000).format("D/M/YYYY, H:mm:ss")
		// // td3.innerHTML = element.querySelector('.feed-datetime').textContent
		// tr.appendChild(td1)
		// tr.appendChild(td2)
		// tr.appendChild(td3)
		// $("#recentDonations")[0].append(tr)
	}
}

const addRecent = async (name, amount, time, hash) => {

	let delayTime = dayjs().subtract('2', 'minutes')
	if (delayTime > time) return 

	// console.log(dayjs(time).format("D/M/YYYY, H:mm:ss"))
	// console.log(delayCount)
	// updateMargin()

	// console.log(delayCount)
	console.log(queueInfo.includes(hash))
	if (queueInfo.includes(hash)) return

	delayCount -= amount
	queueInfo.unshift(hash)
	// console.log('Queue:', name, amount, time + 0)
	// console.log(delayCount)

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
	let timeKey = Math.floor(time / 1000)
	if (!queueAmount[timeKey]) queueAmount[timeKey] = 0
	queueAmount[timeKey] += amount
	let timeToLaunch = time - delayTime

	clearInterval(queueCallback[hash])
	queueCallback[hash] = setTimeout(() => {
		let currentTime = dayjs().subtract('2', 'minutes')
		// console.log(name, amount, time + 0)
		while (table.children.length > 4) table.removeChild(table.lastChild)
		table.prepend(tr)
		// console.log(Math.floor(currentTime / 1000))
		if (queueAmount[Math.floor(currentTime / 1000)]) {
			delayCount += queueAmount[Math.floor(currentTime / 1000)]
			// console.log(delayCount)
			delete queueAmount[Math.floor(currentTime / 1000)]
		}
		diffdelay += amount
		// updateMargin()
		setTimeout(() => {
			queueInfo.shift()
			diffdelay -= amount
			// updateMargin()
		}, 60000)
	}, timeToLaunch)
}

const sumArray = a => {
	return a.reduce((y, z) => y + z)
}

// const reset = () => {
// 	$("p").html("0")
// 	$("p.diff").html("0")
// 	$("p.margin").html("0")
// 	currentCount = 0
// 	delayCount = 0
// 	diffAvg = 0
// 	diffArray = []
// 	f = false
// 	$(".1").css("opacity", "1")
// 	$(".margin").css("opacity", "1")
// }

const afterGet = async (response) => {
	let countUpdate = Number(response.total.count) 
	if (currentCount) {
		diffAvg = updateDiff(countUpdate - currentCount, diffArray)
		diffReal = countUpdate - currentCount
		// console.log(diffReal)
	}
	currentCount = countUpdate
	// updateMargin()
	await updateStats(response.lb)
}

const reload = async () => {
	let requestLb = await (await getData('https://tscache.com/lb_recent.json')).json()
	let requestTotal = await (await getData('https://tscache.com/donation_total.json')).json()
	console.log(delayCount)
	await afterGet({lb: requestLb, total: requestTotal})
	// $("#counter").delay(500).fadeIn(500)
}

$(async () => {
	let time = dayjs.utc("2022-01-01 00:00")
	let $clock = $('#countdown')
	$clock.countdown(time.toDate(), function (event) {
		$(this).html(event.strftime('%D:%H:%M:%S'))
	})
	cors = await corsDetect()
	// await reset()
	setInterval(async () => {
		timer--
		$("#update").html("Update: " + timer/10 + "s")
		if (Math.round(timer) === timer) {
			updateMargin()
			document.querySelector("#delay-time").textContent = dayjs().subtract('2', 'minutes').format('H:mm:ss')	
		}
		if (!timer) {
			timer = initTimer()
			reload()
		}
	}, 100)
	// await $("#counter").fadeOut(250)
})