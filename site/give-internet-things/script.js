const internetThings = [
	["The Internetometer", "https://internetometer.com/give/39860", "http://internetometer.com/image/39860.png", false, true],
	["Give A Damn", "https://giveadamn.co.uk/give/Hans5958", "https://giveadamn.co.uk/image/Hans5958.jpg", false, false],
	["Give a Huggle", "https://huggle.jdf2.org/hug/Hans5958", "", false, false],
	["Flag Counter", "https://s04.flagcounter.com/count2/6g9y/bg_FFFFFF/txt_000000/border_CCCCCC/columns_6/maxflags_50/viewers_0/labels_0/pageviews_1/flags_0/percent_0/", "https://s04.flagcounter.com/count2/6g9y/bg_FFFFFF/txt_000000/border_CCCCCC/columns_6/maxflags_50/viewers_0/labels_0/pageviews_1/flags_0/percent_0/", "https://s04.flagcounter.com/more/6g9y/", false],
	["countapi.xyz", "https://api.countapi.xyz/hit/Hans5958-hits/give-internet-things", "https://img.shields.io/badge/dynamic/json?color=informational&label=hits&query=%24.value&url=https%3A%2F%2Fapi.countapi.xyz%2Fhit%2FHans5958-hits%2Fgive-internet-things&style=flat-square", false],
]

const putTheThings = () => {
	document.querySelector('#consent').setAttribute('hidden', true)
	document.querySelectorAll('.site-section').forEach(el => {
		el.removeAttribute('hidden')
	})
	internetThings.forEach(thing => {
		let [name, hitUrl, imgUrl, detailsUrl, requireInteraction] = thing
		const siteWrapper = document.createElement("div")

		const iframe = document.createElement("iframe")
		iframe.src = hitUrl
		iframe.classList.add("w-100")

		const link = document.createElement('p')
		link.innerHTML = `<a href="${detailsUrl ? detailsUrl : hitUrl}">${name}</a> (<a href="${imgUrl}">image</a>)`
		link.classList.add('mb-1')
		siteWrapper.appendChild(link)

		const iframeWrapper = document.createElement("div")
		iframeWrapper.appendChild(iframe)
		siteWrapper.appendChild(iframeWrapper)
		iframeWrapper.classList.add('iframe-wrapper')
		if (requireInteraction) {
			siteWrapper.classList.add("col-12")
			document.querySelector("#interact").appendChild(siteWrapper)
		} else {
			siteWrapper.classList.add("col-6")
			siteWrapper.classList.add("col-md-4")
			siteWrapper.classList.add("col-lg-2")
			document.querySelector("#nointeract").appendChild(siteWrapper)
		}
	})
}

const searchParams = new URLSearchParams(document.location.search)
if (searchParams.get('force') === 'true' || searchParams.get('give') === 'true' || searchParams.get('consent') === 'true') {
	putTheThings()
}

document.querySelector('#consent button').addEventListener('click', putTheThings)