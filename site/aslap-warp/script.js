/*
 * Part of the content is made by The Longplayer Trust, and is licensed under
 * the terms of Creative Commons Attribution-NonCommercial 4.0 International License.
 */

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_arraySupport)

let // frameCount = 0,
	lastCurrentDate = dayjs(),
	segments, currentIncrement,
	datePicker

const settings = {},
	interchangeableConstValues = {
		dateStart: dayjs.utc([2017, 2, 28, 9, 0, 49, 154]),
		dateEnd: dayjs.utc([3017, 2, 28, 9, 0, 49, 154]),
	}

let dateStart = interchangeableConstValues.dateStart
let dateEnd = interchangeableConstValues.dateEnd

const segmentDuration = (dateEnd.valueOf() - dateStart.valueOf()) / 48140288

let recalculate = (currentDate = lastCurrentDate, startDate = dateStart) => {

	// console.log(1)

	let elapsed = currentDate.valueOf() - startDate.valueOf()
	let elapsedPercentage = elapsed / (dateEnd.valueOf() - dateStart.valueOf())
	lastCurrentDate = currentDate

	// console.log(elapsed)

	let incrementsSinceStart = elapsed / segmentDuration
	// console.log(incrementsSinceStart)
	// console.log("incrementsSinceStart: " + incrementsSinceStart)

	// console.log(incrementsSinceStart % 1)

	if (currentIncrement !== incrementsSinceStart) {

		document.querySelector("#stats-increment").textContent = Math.floor(incrementsSinceStart)
		gifPreviewTextEl.textContent = Math.floor(incrementsSinceStart)
	
	}

	let incrementDuration = elapsed % segmentDuration

	document.querySelector("#current-date-1").textContent = currentDate.format('dddd, D MMMM YYYY HH:mm:ss Z')
	document.querySelector("#current-date-2").textContent = currentDate.format()
	document.querySelector("#setting-timestamp-range").value = currentDate.unix()

	document.querySelector("#stats-percentage").textContent = `${(elapsedPercentage * 100).toPrecision(16)}%`
	document.querySelector("#stats-increment-duration").textContent = Math.round(incrementDuration / 1E2) / 10
	document.querySelector("#stats-increment-percentage").textContent = `${((incrementsSinceStart % 1)*100).toPrecision(4)}%`

}

let setupScore = () => {

	scoreInterval = setInterval(() => {
		if (settings.realTime) recalculate(dayjs())
	}, 100)

}

const settingTimestampRange = document.querySelector('#setting-timestamp-range')

const gifPreviewEl = document.querySelector('#gif-preview')
const gifPreviewTextEl = gifPreviewEl.querySelector('span')

const resizeGifPreviewText = () => {

	gifPreviewTextEl.style.fontSize = (gifPreviewEl.clientWidth * 0.1) + 'px'

}

$(document).ready(() => {

	try {
		// This is really weird. Adding the line and an error occured, but removing it and no tooltip to be seen.
		$(document.querySelector('[data-toggle="tooltip"]')).tooltip()
	} catch (e) {}

	dateStart = dateStart
	// segmentIncrements = interchangeableConstValues.segmentIncrements[constType]

	datePicker = datepicker("#datepicker", {
		maxDate: new Date(dateEnd.valueOf()),
		minDate: new Date(dateStart.valueOf()),
		dateSelected: new Date(),
		onHide: instance => {
			document.querySelector("#setting-real-time").checked = false
			settings.realTime = false
			recalculate(dayjs.utc(instance.dateSelected.valueOf() + dayjs().utcOffset()*60*1000).local())
		}
	})
	settingTimestampRange.min = dateStart.valueOf() / 1000
	settingTimestampRange.max = dateEnd.valueOf() / 1000

	// $(window).resize(() => {
	// 	setupScore()
	// })

	setupScore()

	// setInterval(() => {
	// 	if (settings.realTime) recalculate(dayjs())
	// }, 100)
	
	window.addEventListener('resize', resizeGifPreviewText)
	resizeGifPreviewText()

	document.querySelector("#setting-timestamp-range").addEventListener("input", event => {
		document.querySelector("#setting-real-time").checked = false
		settings.realTime = false
		recalculate(dayjs.unix(Number(event.target.value)))
	})

	document.querySelectorAll("main input[type='checkbox']").forEach(element => {
		settings[element.dataset.settingKey] = element.checked
		element.addEventListener("input", () => {
			settings[element.dataset.settingKey] = element.checked
		})
	})

	document.querySelector("#current-date").addEventListener('click', event => {
		event.stopPropagation()
	
		const isHidden = datePicker.calendarContainer.classList.contains('qs-hidden')
		datePicker[isHidden ? 'show' : 'hide']()
		datePicker.setDate(dayjs.unix(Number(document.querySelector("#setting-timestamp-range").value)).utc()["$d"], true)
	})

})
