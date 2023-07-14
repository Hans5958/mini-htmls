/*
Multi-level dropdown on header navigation bar
https://stackoverflow.com/a/45755948
*/

$(() => {
	$('.dropdown-menu a.dropdown-toggle').on('click', e => {
		if (!$(this).next().hasClass('show')) {
			$(this).parents('.dropdown-menu').first().find('.show').removeClass('show')
		}
		$(this).next('.dropdown-menu').toggleClass('show')
		$(this).parents('li.nav-item.dropdown.show').on('hidden.bs.dropdown', e => {
		 	$('.dropdown-menu .show').removeClass('show')
		})
		return false
	})
})

const testCors = 'https://en.wikipedia.org/w/api.php?action=query&format=json'

/**
 * Checks if CORS allowed.
 * @returns Boolean if CORS allowed.
 */
const checkCors = async () => {
	try {
		await fetch(testCors)
		return true
	} catch {}
	return false
}

/**
 * Gets prefix for CORS.
 * @returns A URL prefix. If CORS is allowed, it will return an empty string.
 */
const getCorsUrl = async () => {
	try {
		await fetch(testCors)
		return ""
	} catch {}
	try {
		await fetch("https://cf-cors.hans5958.workers.dev/?url=" + testCors)
		return "https://cf-cors.hans5958.workers.dev/?url="
	} catch {}
	return false
}

window.checkCors = checkCors
window.getCorsUrl = getCorsUrl

/**
 * Updates all textContent that matches a string.
 * @param {String} query Element query to be used as the selector.
 * @param {String} textContent Content to change.
 */
const updateTextContent = (query, textContent) => {
	[...document.querySelectorAll(query)].forEach(el => {
		el.textContent = textContent
	})
}

window.updateTextContent = updateTextContent

/**
 * A custon setInterval function to support update on countdown.
 * @param {Function} callbackTick A function to be executed every tick (from requestAnimationFrame).
 * @param {Function} callbackTimer A function to be executed every delay milliseconds.
 * @param {Number | Function} timeoutGenerator The time, in milliseconds (thousandths of a second), or a function that generates the time, the timer, should delay in between executions of the specified function or code.
 * @param {Boolean} initialTrigger Whether to trigger callbackTimer at the start.
 */
const setIntervalFancy = (callbackTick = null, callbackTimer, timeoutGenerator = 0, initialTrigger = false) => {
	callbackTick ||= () => {}
	if (typeof timeoutGenerator === "number") {
		const intervalTime = timeoutGenerator
		timeoutGenerator = () => intervalTime
	}

	if (initialTrigger) callbackTimer()
	let targetTime = Date.now() + timeoutGenerator()
	const onTick = () => {
		let timer = (targetTime - Date.now())/1000
		callbackTick(timer)
		if (timer <= 0) {
			if (Date.now() - targetTime > timeoutGenerator()) targetTime = Date.now()
			targetTime += timeoutGenerator()
			callbackTimer()
		}
		window.requestAnimationFrame(onTick)
	}
	onTick()
}

window.setIntervalFancy = setIntervalFancy
