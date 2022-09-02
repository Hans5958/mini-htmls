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