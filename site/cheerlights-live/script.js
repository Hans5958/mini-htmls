// This file serves as the script that makes the page interactive.
// (basically making the whole page possible)

// Note that the usage of "date" has the same meaning as the Date object in 
// JavaScript, which also includes the time. If you care only the light,
// the parts regarding dates can be safetly ignored.

/**
 * Formats the date into a nice string.
 * @param day A Day.js object, which includes a date.
 * @returns A nice string displaying the date.
 */
const dayToString1 = day => {
	return day.format('DD/MM/YYYY HH:mm:ss Z')
}

/**
 * The element for the light.
 */
const lightEl = document.querySelector('#light')

/**
 * The current event ID.
 */
let currentId = null

/**
 * The date the current event is receieved.
 */
let receivedDate = null

/**
 * Fetches the current event of the light and updates the page with new information.
 */
const execute = async () => {
	// Resets the animation
	lightEl.style.setProperty('animation', 'none')

	/**
	 * The date on which the data is fetched.
	 */
	const fetchDate = dayjs()

	// Fetches the API related to Cheerlights. The API can be found on their site.
	// The fetch() function returns an asynchronous function (with Promise), 
	// which we need to wait with the `await` keyword.
	const request = await fetch('https://api.thingspeak.com/channels/1417/field/1/last.json')
	
	// Tells that the result is a JSON, in which should be parsed
	// This, too, is asynchronous, which we need to wait with the same way.
	const data = await request.json()

	// Debug information that displays the fetched data.
	// In production, this is optional, but you can enable it to fix bugs.

	// Set the color variable for ease of access
	const color = data.field1

	// Put a pulsing animation
	lightEl.style.setProperty('animation', 'pulse 2s')

	// Set few relevant dates

	/**
	 * The date included on the data.
	 */
	const eventDate = dayjs(data.created_at, 'YYYY-MM-DDTHH:mm:ssWIB')
	
	// Updates the dates on the document
	updateTextContent('.info-event', dayToString1(eventDate))
	if (receivedDate) updateTextContent('.info-received', dayToString1(receivedDate))
	updateTextContent('.info-fetch', dayToString1(fetchDate))

	// Run these next functions only when it is a new event, inferred from the ID.
	// Ideally we don't want to redo something that has been done because it waste
	// resources (in this case, negligble), but this also handles the part related
	// the date on `receivedDate`.  If you care only the light, this can also be 
	// safely ignored.
	if (currentId === data.entry_id) return
	currentId = data.entry_id

	// Set receivedDate and update the date on the document
	receivedDate = dayjs()
	updateTextContent('.info-received', dayToString1(receivedDate))

	// Update the displayed colors
	lightEl.style.setProperty('--cl-main', color)
	updateTextContent('.light-text', color)

	// Sets the secondary color, this mainly to handle an edge case when it is
	// white, otherwise you can see anything. If it is any other color, the
	// secondary color would be the same as the main one.
	if (color === 'white') {
		lightEl.style.setProperty('--cl-secondary', 'black')
	} else {
		lightEl.style.setProperty('--cl-secondary', color)
	}
}

execute()

let statusProgressBar = 'fetch'

/**
 * Handles the timer when it is updating
 */
const executeTimer = async () => {
	// Adjust the progress bar before running the funciton.
	statusProgressBar = "fetch"
	document.querySelector("#status .progress-bar").style.width = "0"
	document.querySelector("#status .progress-bar").style.transition = "width 0.25s ease"
	updateTextContent("#status p", `Fetching data...`)

	// Execute the main function. Note that this function is also asynchronous
	// so, `await` is also used here.
	await execute()

	// Adjust the progress bar to signify the completion.
	document.querySelector("#status .progress-bar").style.width = "100%"
	updateTextContent("#status p", "Data fetched!")

	// Give 1 more second before the display ticks down. 
	// (it still ticks down on the background)
	setTimeout(() => {
		document.querySelector("#status .progress-bar").style.transition = "unset"
		statusProgressBar = "timer"
	}, 1000)
}

/**
 * Handles the countdown of the timer
 * @param {*} timer 
 */
const executeTick = timer => {
	if (statusProgressBar === "timer") {
		updateTextContent("#status p", `Waiting... (${timer.toFixed(2)}s)`)
		document.querySelector("#status .progress-bar").style.width = `${100 - (timer / 10) * 100}%`
	}
}

// This function can be found on site/assets/js/base.js.
window.setIntervalFancy(executeTick, executeTimer, 5000, true)
