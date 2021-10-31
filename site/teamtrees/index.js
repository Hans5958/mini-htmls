dayjs.extend(window.dayjs_plugin_utc)
var currentCount = 0,
	diffAvg = 0,
	diffReal = 0,
	initTimer = 10 * 10,
	timer,
	diffArray = [],
	cors,
	parser = new DOMParser()

const corsDetect = () => new Promise(callback => {
		$.get("https://teamtrees.org/")
			.done(function() {
				callback("")
			})
			.fail(function() {
				$.get("https://cf-cors.hans5958.workers.dev/?url=https://teamtrees.org/")
					.done(function() {
						callback("https://cf-cors.hans5958.workers.dev/?url=")
					})
					.fail(function() {
						callback(false)
					})
			})
	})

const getData = async (replied, success, fail) => {
	const response = await fetch(cors + "https://teamtrees.org").catch(fail)
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
		if (array.length > 61) {
			array.shift()
		}
		return Math.round(sumArray(array) * 60 / array.length)
	}
}

const updateStats = parsed => {
	$("#recentDonations")[0].innerHTML = ""
	var recentDonations = [...parsed.querySelector("#recent-donations").children]
	for (let i in recentDonations) {

		if (i == 5) {
			break
		}
		var element = recentDonations[i]
		var tr = document.createElement("tr")
		var td1 = document.createElement("td")
		var td2 = document.createElement("td")
		var td3 = document.createElement("td")

		td1.innerHTML = element.querySelector('p.font-black').textContent
		td2.innerHTML = "$" + element.querySelector('div.flex > div.badge').textContent.replace(/ trees?/, '')
		td3.innerHTML = dayjs(element.querySelector('p.feed-datetime').textContent).format("D/M/YYYY, H:mm:ss")
		// td3.innerHTML = element.querySelector('.feed-datetime').textContent

		tr.appendChild(td1)
		tr.appendChild(td2)
		tr.appendChild(td3)
		$("#recentDonations")[0].append(tr)
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

const afterGet = (response, firstRun = false) => {
	var parsed = parser.parseFromString(response, "text/html")
	var countUpdate = parsed.querySelector("#totalTrees").dataset.count 
	if (currentCount) {
		diffAvg = updateDiff(countUpdate - currentCount, diffArray)
		diffReal = countUpdate - currentCount
	}
	currentCount = countUpdate
	updateMargin()
	updateStats(parsed)
}

const reload = async () => {
	// await $("#counter").fadeOut(250)
	// await reset()
	let html = await (await getData()).text()
	await afterGet(html)

}

$(async () => {
	// var time = dayjs.utc("2020-01-01 00:00")
	// var $clock = $('#countdown')
	// $clock.countdown(time.toDate(), function (event) {
	// 	$(this).html(event.strftime('%D:%H:%M:%S'))
	// })
	cors = await corsDetect()
	setInterval(async () => {
		timer--
		$("#update").html("Update: " + timer/10 + "s")
		if (!timer) {
			timer = initTimer
			reload()
		}
	}, 100)
})