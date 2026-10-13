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

const updateStats = recentDonations => {
	document.querySelector("#recentDonations").textContent = ""
	for (const i in recentDonations) {
		if (i == 5) {
			break
		}

		const item = recentDonations[i]
		const name = item.name
		const amount = item.amount
		const date = dayjs(item.date)

		const tr = document.createElement("tr")
		const nameTd = document.createElement("td")
		const amountTd = document.createElement("td")
		const dateTd = document.createElement("td")
		const table = document.querySelector("#recentDonations")

		nameTd.innerHTML = name
		amountTd.innerHTML = '$' + amount
		dateTd.innerHTML = dayjs(date).format("D/M/YYYY, H:mm:ss")

		tr.appendChild(nameTd)
		tr.appendChild(amountTd)
		tr.appendChild(dateTd)
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
	let lbRequest, totalRequest

	await Promise.all([
		(async () => {
			lbRequest = await fetch(cors + "https://api.tiltify.com/", {
				"headers": {
					"Content-Type": "application/json",
					"Accept": "application/graphql-response+json,application/json;q=0.9",
				},
				"body": JSON.stringify({
					"operationName": "get_latest_fact_donations_",
					"variables": {
						"id": "0478358a-c4ff-4ab0-9cc7-5f0b328df9dc",
						"limit": 5
					},
					"extensions": {
						"clientLibrary": {
							"name": "@apollo/client",
							"version": "4.2.12"
						}
					},
					"query": "query get_latest_fact_donations_($id: ID!, $limit: Int) { fact(id: $id) { id donations(first: $limit) { pageInfo { startCursor endCursor hasNextPage hasPreviousPage } edges { cursor node { id donorName donorComment completedAt amount { value currency } fact { id link ownership { id name } } } } } }}"
				}),
				"method": "POST",
				"mode": "cors"
			})
		})(),
		(async () => {
			totalRequest = await fetch("https://api.tiltify.com/", {
				"credentials": "omit",
				"headers": {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:159.0) Gecko/20100101 Firefox/159.0",
					"Accept": "application/graphql-response+json,application/json;q=0.9",
					"Accept-Language": "en-US,en;q=0.9",
					"content-type": "application/json",
					"Sec-Fetch-Storage-Access": "none",
					"Sec-Fetch-Dest": "empty",
					"Sec-Fetch-Mode": "cors",
					"Sec-Fetch-Site": "cross-site",
					"Priority": "u=4"
				},
				"body": JSON.stringify({
					"operationName": "FactById",
					"variables": {
						"id": "0478358a-c4ff-4ab0-9cc7-5f0b328df9dc"
					},
					"extensions": {
						"clientLibrary": {
							"name": "@apollo/client",
							"version": "4.2.12"
						}
					},
					"query": "query FactById($id: ID!) { fact(id: $id) { id name link totalAmountRaised { value currency } usageType currency status supportedFacts { id name usageType } schedules { id name description } banner { src alt width height } video } }"
				}),
				"method": "POST",
				"mode": "cors"
			});
		})(),
	])

	const lbData = await lbRequest.json()
	updateStats(lbData.data.fact.donations.edges.map(edge => ({
		name: edge.node.donorName,
		amount: Number(edge.node.amount.value),
		date: edge.node.completedAt,
	})))

	const totalData = await totalRequest.json()
	let countUpdate = Number(totalData.data.fact.totalAmountRaised.value)
	if (currentCount) {
		diffAvg = updateDiff(countUpdate - currentCount, diffArray)
		diffReal = countUpdate - currentCount
		console.log(diffReal)
	}
	currentCount = countUpdate
	updateMargin()

}

(async () => {
	cors = await window.getCorsUrl()
	const executeTick = timer => {
		document.querySelector("#update").textContent = "Update: " + timer.toFixed(1) + "s"
	}
	window.setIntervalFancy(executeTick, reload, timerSet, true)
})()