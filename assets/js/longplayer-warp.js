/**
 * Part of the content is made by The Longplayer Trust, and is licensed under 
 * the terms of Creative Commons Attribution-NonCommercial 4.0 International License.
 */

let settings = {
	realTime: true
}
let currentIncrement

// var themeDirectory = "/wp-content/themes/longplayer"
var themeDirectory = jsonData.themeDirectory
var canvas, ctx;
var canvasSize;
var waveform,
	bowls,
	segments;
var frameCount = 0;

var constValues = {
	dateStart: {
		real: null,
		accuracy: null
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
var segmentDuration = 120.0;

/*-----------------------------------------------------------------------------*
 * Every increment, each segment is shifted forward by N degrees
 *----------------------------------------------------------------------------*/
// var SEGMENT_INCREMENTS = [
// 	0.002202643172,      // period = 227 days
// 	0.132158590298,      // period = 3.78 days
// 	0.000001360000,      // period = 365,243 days
// 	0.000310751705,      // period = 1609 days
// 	0.074580484778,      // period = 6.70 days
// 	0.017351461903       // period = 26.8 days
// ];

var segmentIncrements
var dateStart

var segmentAngles = new Array(6);

// Converts from degrees to radians.
Math.radians = function (degrees) {
	return degrees * Math.PI / 180;
};


function recalculate(currentDate = dayjs(), startDate = dateStart) {

	var elapsed = currentDate.unix() - startDate.unix();
	var elapsedMs = (currentDate - startDate)/1000

	var incrementsSinceStart = Math.floor(elapsed / segmentDuration);
	// console.log("incrementsSinceStart: " + incrementsSinceStart);

	if (currentIncrement !== incrementsSinceStart) {

		for (var i = 0; i < 6; i++) {
			var segmentAngleDeg = segmentIncrements[i] * incrementsSinceStart
			segmentAngles[i] = Math.radians(segmentAngleDeg);
			// console.log("angle " + i + ": " + SEGMENT_INCREMENTS[i] * incrementsSinceStart);
			// console.log("angle " + i + ": " + segment_angles[i]);
			document.querySelector(`#stats-angle-${i + 1}`).textContent = segmentAngleDeg % 360
			document.querySelector(`#stats-revolution-${i + 1}`).textContent = Math.floor(segmentAngleDeg / 360)
		}

		document.querySelector("#stats-increment").textContent = incrementsSinceStart
	
	}

	let incrementDuration = elapsed % segmentDuration
	let incrementDurationMs = elapsedMs % segmentDuration

	document.querySelector("#current-date-1").textContent = currentDate.format('dddd, D MMMM YYYY HH:mm:ss Z')
	document.querySelector("#current-date-2").textContent = currentDate.format()
	document.querySelector("#settings-timestamp-range").value = currentDate.unix()

	document.querySelector("#stats-percentage").textContent = `${((elapsedMs/31556995200)*100).toPrecision(16)}%`
	document.querySelector("#stats-increment-duration").textContent = Math.round(incrementDurationMs * 10) / 10
	document.querySelector("#stats-increment-percentage").textContent = `${((incrementDurationMs/120)*100).toPrecision(4)}%`

}

function refresh(w) {
	frameCount += 0.05;

	ctx.clearRect(0, 0, w, w);

	for (var i = 0; i < 6; i++) {
		ctx.save();
		ctx.translate(w / 2, w / 2);
		// ctx.rotate(frameCount * 0.1 * (i + 1));
		ctx.rotate(segmentAngles[i]);
		ctx.translate(-w / 2, -w / 2);
		ctx.drawImage(segments[i], 0, 0, w, w);
		ctx.restore();
	}

	// ctx.drawImage(waveform, 0, 0, canvasSize, canvasSize);
	ctx.drawImage(bowls, 0, 0, w, w);
}

function visualScore(w) {
	// waveform = document.createElement('img');
	// waveform.src = themeDirectory + "/waveform.png";
	bowls = document.createElement('img');
	bowls.src = themeDirectory + "/bowls-and-score-hidpi.png";

	segments = new Array();

	for (i = 0; i < 6; i++) {
		segments[i] = document.createElement('img');
		segments[i].src = themeDirectory + "/segment-" + i + ".png";
	}

	canvas = document.getElementById("score");
	if (!canvas) return;
	canvas.width = w;
	canvas.height = w;

	ctx = canvas.getContext("2d");

	recalculate();
	// store the timer in a variable so that we can time it out 
	// if somebody resizes the window.
	window.scoreTimer = setInterval(() => runOnTick(w), 100)
};

function retinaScore() {
	var startingSize = $("#score").width();
	$("#score").attr('width', startingSize * window.devicePixelRatio);
	$("#score").attr('height', startingSize * window.devicePixelRatio);
	$("#score").css('width', startingSize);
	$("#score").css('height', startingSize);
	var canvas = document.getElementById("score");
	if (canvas) {
		var ctx = canvas.getContext("2d");
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	}
}

function setupScore() {

	if (canvasSize === document.querySelector("#score-container").clientWidth) return
	canvasSize = document.querySelector("#score-container").clientWidth

	clearInterval(window.scoreTimer);

	if (isCanvasSupported()) {
		if ($("#static-score")) {
			$("#static-score").remove();
		}

		$("canvas").remove();

		$("#score-container").append("<canvas id='score'></canvas>");

		visualScore(document.querySelector("#score-container").clientWidth); //defined in score.js  

		if (window.devicePixelRatio) {
			retinaScore();
		}
	}
}

function isCanvasSupported() {
	var elem = document.createElement('canvas');
	return !!(elem.getContext && elem.getContext('2d'));
}

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_arraySupport)

constValues.dateStart.real = dayjs([1999, 11, 31, 12, 0, 0])
constValues.dateStart.accuracy = dayjs.utc([2000, 0, 1, 0, 0, 0])

var picker

$(document).ready(function () {

	try {
		// This is really weird. Adding the line and an error occured, but removing it and no tooltip to be seen.
		$(document.querySelector('[data-toggle="tooltip"]')).tooltip()
	} catch (e) {}


	(() => {
		let constType = document.querySelector("#setting-accuracy").checked ? "accuracy" : "real"
		dateStart = constValues.dateStart[constType] 
		segmentIncrements = constValues.segmentIncrements[constType] 
	})()

	picker = datepicker("#datepicker", {
		maxDate: new Date(3000, 0, 1, 0, 0, 0),
		minDate: new Date(2000, 0, 1, 0, 0, 0),
		dateSelected: new Date(),
		onShow: instance => {
		},
		onHide: instance => {
			console.log(instance)
			document.querySelector("#realTime").checked = false
			settings.realTime = false
			recalculate(dayjs.utc(instance.dateSelected.valueOf() + dayjs().utcOffset()*60*1000).local())
		}
	})

	$(window).resize(function () {
		setupScore();
	});

	setupScore();

	document.querySelector("#settings-timestamp-range").addEventListener("input", event => {
		document.querySelector("#realTime").checked = false
		settings.realTime = false
		recalculate(dayjs.unix(Number(event.target.value)))
	})

	document.querySelectorAll("main input[type='checkbox']").forEach(element => {
		element.addEventListener("input", event => {
			if (!event.target.dataset.settingKey) return
			settings[event.target.dataset.settingKey] = event.target.checked
		})
	})

	document.querySelector("#current-date").addEventListener('click', e => {
		e.stopPropagation()
	  
		const isHidden = picker.calendarContainer.classList.contains('qs-hidden')
		picker[isHidden ? 'show' : 'hide']()
		picker.setDate(dayjs.unix(Number(document.querySelector("#timestamp-range").value)).utc()["$d"], true)
	})

	document.querySelector("#setting-accuracy").addEventListener("input", event => {
		let constType = event.target.checked ? "accuracy" : "real"
		dateStart = constValues.dateStart[constType] 
		segmentIncrements = constValues.segmentIncrements[constType]
		console.log(dateStart)
	})

})

function runOnTick(w) {
	if (settings.realTime) recalculate()
	refresh(w) 
}