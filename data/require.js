$(function(){
  $("head").append("<style>html{position:relative;min-height:100%}body{margin-bottom:60px}.footer{position:absolute;bottom:0;width:100%;height:60px;line-height:60px;background-color:#f5f5f5}</style>")
  $("body").prepend("<span id=\"nav\">")
  $("body").append("<span id=\"footer\">")
  $("#nav").load("/mini-htmls/data/nav.html")
  $("#footer").load("/mini-htmls/data/footer.html")
  $("body").append("<div id=\"require\">")
  $("#require").load("/mini-htmls/data/require.html",function(){$("head")[0].innerHTML+=$("#require2").html(),$("#require")[0].outerHTML=""})
  Pace.on("done", function() {
    $('#overlay').delay(300).fadeOut(600)
	setTimeout(function(){Pace.options.ajax = false}, 300)
 });
})
