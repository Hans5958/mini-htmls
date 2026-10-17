/*
 * Part of the content is made by The Longplayer Trust, and is licensed under
 * the terms of Creative Commons Attribution-NonCommercial 4.0 International License.
 */

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_arraySupport)

let themeDirectory = jsonData.themeDirectory, // "/wp-content/themes/longplayer"
	// frameCount = 0,
	lastCurrentDate = dayjs(),
	segments,
	canvas, ctx, canvasSize, waveform, bowls, currentIncrement, dateStart,
	isCanvasSupported, scoreInterval, picker

const settings = {},
	interchangeableConstValues = {
		// real: from longplayer.org (https://longplayer.org/wp-content/themes/longplayer/js/longplayer.js)
		// accuracy: from TheLongplayerTrust/longplayer-supercollider and TheLongplayerTrust/longplayer-python
		dateStart: {
			real: dayjs('2000-01-01T00:00:00+12:00'),
			accuracy: dayjs.utc('2000-01-01T00:00:00Z')
		},
		dateEnd: {
			real: dayjs('3000-01-01T00:00:00+12:00'),
			accuracy: dayjs.utc('3000-01-01T00:00:00Z')
		},
		segmentIncrements: {
			real: [
				0.002202643172,      // period = 227 days
				0.132158590298,      // period = 3.78 days
				0.000001360000,      // period = 365,243 days
				0.000310751705,      // period = 1609 days
				0.074580484778,      // period = 6.70 days
				0.017351461903       // period = 26.8 days
			],
			accuracy: [
				579240 / 262974960,
				3475440 / 262974960,
				360 / 262974960,
				81720 / 262974960,
				19612800 / 262974960,
				4563000 / 262974960
			]
		}
	}

/*-----------------------------------------------------------------------------*
* Length of each audio segment (seconds). Needed to calculate no. increments
* since the start of the piece.
*----------------------------------------------------------------------------*/
const segmentDuration = 120.0

let segmentIncrements
const segmentAngles = new Array(6)

// Converts from degrees to radians.
Math.radians = (degrees) => {
	return degrees * Math.PI / 180
}

let recalculate = (currentDate = lastCurrentDate, startDate = dateStart) => {

	let elapsed = currentDate.unix() - startDate.unix()
	let elapsedMs = (currentDate - startDate)/1000
	lastCurrentDate = currentDate

	let incrementsSinceStart = Math.floor(elapsed / segmentDuration)

	if (currentIncrement !== incrementsSinceStart) {

		for (let i = 0; i < 6; i++) {
			let segmentAngleDeg = (segmentIncrements[i] * incrementsSinceStart) % 360
			segmentAngles[i] = Math.radians(segmentAngleDeg)
			document.querySelector(`#stats-angle-${i + 1}`).textContent = segmentAngleDeg
			document.querySelector(`#stats-revolution-${i + 1}`).textContent = Math.floor((segmentIncrements[i] * incrementsSinceStart) / 360)
		}

		document.querySelector("#stats-increment").textContent = incrementsSinceStart
		currentIncrement = incrementsSinceStart
	}

	let incrementDuration = elapsed % segmentDuration
	let incrementDurationMs = elapsedMs % segmentDuration

	document.querySelector("#current-date-1").textContent = currentDate.format('dddd, D MMMM YYYY HH:mm:ss Z')
	document.querySelector("#current-date-2").textContent = currentDate.format()
	document.querySelector("#setting-timestamp-range").value = currentDate.unix()

	document.querySelector("#stats-percentage").textContent = `${((elapsedMs/31556995200)*100).toPrecision(16)}%`
	document.querySelector("#stats-increment-duration").textContent = Math.round(incrementDurationMs * 10) / 10
	document.querySelector("#stats-increment-percentage").textContent = `${((incrementDurationMs/120)*100).toPrecision(4)}%`

}

let refresh = w => {
	ctx.clearRect(0, 0, w, w)

	for (let i = 0; i < 6; i++) {
		ctx.save()
		ctx.translate(w / 2, w / 2)
		ctx.rotate(segmentAngles[i])
		ctx.translate(-w / 2, -w / 2)
		ctx.drawImage(segments[i], 0, 0, w, w)
		ctx.restore()
	}

	ctx.drawImage(bowls, 0, 0, w, w)
}

let visualScore = width => {
	bowls = document.createElement('img')
	bowls.src = themeDirectory + "/bowls-and-score-hidpi.png"

	segments = new Array()

	for (let i = 0; i < 6; i++) {
		segments[i] = document.createElement('img')
		segments[i].src = themeDirectory + "/segment-" + i + ".png"
	}

	canvas = document.getElementById("score")
	if (!canvas) return
	canvas.width = width
	canvas.height = width

	ctx = canvas.getContext("2d")
}

let retinaScore = () => {
	let startingSize = $("#score").width()
	$("#score").attr('width', startingSize * window.devicePixelRatio)
	$("#score").attr('height', startingSize * window.devicePixelRatio)
	$("#score").css('width', startingSize)
	$("#score").css('height', startingSize)
	let canvas = document.getElementById("score")
	if (canvas) {
		let ctx = canvas.getContext("2d")
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
	}
}

let setupScore = () => {

	if (canvasSize === document.querySelector("#score-container").clientWidth) return
	canvasSize = document.querySelector("#score-container").clientWidth

	clearInterval(scoreInterval)

	recalculate(dayjs())

	if (isCanvasSupported) {

		let width = document.querySelector("#score-container").clientWidth
		
		if ($("#static-score")) $("#static-score").remove()
		$("canvas").remove()
		$("#score-container").append("<canvas id='score'></canvas>")
		visualScore(width)
		if (window.devicePixelRatio) retinaScore()


		scoreInterval = setInterval(() => {
			if (settings.realTime) recalculate(dayjs())
			refresh(width)
		}, 100)

	} else {

		scoreInterval = setInterval(() => {
			if (settings.realTime) recalculate(dayjs())
		}, 100)

	}

}

$(document).ready(() => {

	try {
		// This is really weird. Adding the line and an error occured, but removing it and no tooltip to be seen.
		$(document.querySelector('[data-toggle="tooltip"]')).tooltip()
	} catch (e) {}

	let constType = document.querySelector("#setting-accuracy").checked ? "accuracy" : "real"
	dateStart = interchangeableConstValues.dateStart[constType]
	segmentIncrements = interchangeableConstValues.segmentIncrements[constType]

	let canvasTestElement = document.createElement('canvas')
	isCanvasSupported = !!(canvasTestElement.getContext && canvasTestElement.getContext('2d'))

	datePicker = datepicker("#datepicker", {
		maxDate: new Date(3000, 0, 1, 0, 0, 0),
		minDate: new Date(2000, 0, 1, 0, 0, 0),
		dateSelected: new Date(),
		onHide: instance => {
			document.querySelector("#setting-real-time").checked = false
			settings.realTime = false
			recalculate(dayjs.utc(instance.dateSelected.valueOf() + dayjs().utcOffset()*60*1000).local())
		}
	})

	$(window).resize(() => {
		setupScore()
	})

	setupScore()

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

	document.querySelector("#setting-accuracy").addEventListener("input", event => {
		let constType = event.target.checked ? "accuracy" : "real"
		dateStart = interchangeableConstValues.dateStart[constType]
		segmentIncrements = interchangeableConstValues.segmentIncrements[constType]
		recalculate()
	})
})