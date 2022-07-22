dayjs.extend(dayjs_plugin_utc),dayjs.extend(dayjs_plugin_arraySupport);let segments,canvas,ctx,canvasSize,waveform,bowls,currentIncrement,dateStart,isCanvasSupported,scoreInterval,picker,themeDirectory=jsonData.themeDirectory,lastCurrentDate=dayjs();const settings={},interchangeableConstValues={dateStart:{real:dayjs([1999,11,31,12,0,0]),accuracy:dayjs.utc([2e3,0,1,0,0,0])},dateEnd:{real:dayjs([2999,11,31,12,0,0]),accuracy:dayjs.utc([3e3,0,1,0,0,0])},segmentIncrements:{real:[.002202643172,.132158590298,136e-8,.000310751705,.074580484778,.017351461903],accuracy:[579240/262974960,3475440/262974960,360/262974960,81720/262974960,.07458048477315103,4563e3/262974960]}},segmentDuration=120;let segmentIncrements;const segmentAngles=new Array(6);Math.radians=(e=>e*Math.PI/180);let recalculate=(e=lastCurrentDate,t=dateStart)=>{let a=e.unix()-t.unix(),n=(e-t)/1e3;lastCurrentDate=e;let r=Math.floor(a/segmentDuration);if(currentIncrement!==r){for(let e=0;e<6;e++){let t=segmentIncrements[e]*r;segmentAngles[e]=Math.radians(t),document.querySelector(`#stats-angle-${e+1}`).textContent=t%360,document.querySelector(`#stats-revolution-${e+1}`).textContent=Math.floor(t/360)}document.querySelector("#stats-increment").textContent=r}let c=n%segmentDuration;document.querySelector("#current-date-1").textContent=e.format("dddd, D MMMM YYYY HH:mm:ss Z"),document.querySelector("#current-date-2").textContent=e.format(),document.querySelector("#setting-timestamp-range").value=e.unix(),document.querySelector("#stats-percentage").textContent=`${(n/31556995200*100).toPrecision(16)}%`,document.querySelector("#stats-increment-duration").textContent=Math.round(10*c)/10,document.querySelector("#stats-increment-percentage").textContent=`${(c/120*100).toPrecision(4)}%`},refresh=e=>{ctx.clearRect(0,0,e,e);for(var t=0;t<6;t++)ctx.save(),ctx.translate(e/2,e/2),ctx.rotate(segmentAngles[t]),ctx.translate(-e/2,-e/2),ctx.drawImage(segments[t],0,0,e,e),ctx.restore();ctx.drawImage(bowls,0,0,e,e)},visualScore=e=>{(bowls=document.createElement("img")).src=themeDirectory+"/bowls-and-score-hidpi.png",segments=new Array;for(var t=0;t<6;t++)segments[t]=document.createElement("img"),segments[t].src=themeDirectory+"/segment-"+t+".png";(canvas=document.getElementById("score"))&&(canvas.width=e,canvas.height=e,ctx=canvas.getContext("2d"))},retinaScore=()=>{let e=$("#score").width();$("#score").attr("width",e*window.devicePixelRatio),$("#score").attr("height",e*window.devicePixelRatio),$("#score").css("width",e),$("#score").css("height",e);let t=document.getElementById("score");if(t){t.getContext("2d").scale(window.devicePixelRatio,window.devicePixelRatio)}},setupScore=()=>{if(canvasSize!==document.querySelector("#score-container").clientWidth)if(canvasSize=document.querySelector("#score-container").clientWidth,clearInterval(scoreInterval),recalculate(dayjs()),isCanvasSupported){let e=document.querySelector("#score-container").clientWidth;console.log(e),$("#static-score")&&$("#static-score").remove(),$("canvas").remove(),$("#score-container").append("<canvas id='score'></canvas>"),visualScore(e),window.devicePixelRatio&&retinaScore(),scoreInterval=setInterval(()=>{settings.realTime&&recalculate(dayjs()),refresh(e)},100)}else scoreInterval=setInterval(()=>{settings.realTime&&recalculate(dayjs())},100)};$(document).ready(()=>{try{$(document.querySelector('[data-toggle="tooltip"]')).tooltip()}catch(a){}let e=document.querySelector("#setting-accuracy").checked?"accuracy":"real";dateStart=interchangeableConstValues.dateStart[e],segmentIncrements=interchangeableConstValues.segmentIncrements[e];let t=document.createElement("canvas");isCanvasSupported=!(!t.getContext||!t.getContext("2d")),picker=datepicker("#datepicker",{maxDate:new Date(3e3,0,1,0,0,0),minDate:new Date(2e3,0,1,0,0,0),dateSelected:new Date,onHide:e=>{console.log(e),document.querySelector("#setting-real-time").checked=!1,settings.realTime=!1,recalculate(dayjs.utc(e.dateSelected.valueOf()+60*dayjs().utcOffset()*1e3).local())}}),$(window).resize(()=>{setupScore()}),setupScore(),document.querySelector("#setting-timestamp-range").addEventListener("input",e=>{document.querySelector("#setting-real-time").checked=!1,settings.realTime=!1,recalculate(dayjs.unix(Number(e.target.value)))}),document.querySelectorAll("main input[type='checkbox']").forEach(e=>{settings[e.dataset.settingKey]=e.checked,e.addEventListener("input",()=>{settings[e.dataset.settingKey]=e.checked})}),document.querySelector("#current-date").addEventListener("click",e=>{e.stopPropagation();const t=picker.calendarContainer.classList.contains("qs-hidden");picker[t?"show":"hide"](),picker.setDate(dayjs.unix(Number(document.querySelector("#setting-timestamp-range").value)).utc().$d,!0)}),document.querySelector("#setting-accuracy").addEventListener("input",e=>{let t=e.target.checked?"accuracy":"real";dateStart=interchangeableConstValues.dateStart[t],segmentIncrements=interchangeableConstValues.segmentIncrements[t]})});