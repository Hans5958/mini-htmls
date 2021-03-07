/*!
 * Bootstrap 4 multi dropdown navbar (https://github.com/bootstrapthemesco/bootstrap-4-multi-dropdown-navbar)
 * Copyright 2017.
 * Licensed under the GPL license
 */

$(() => {
	$(".dropdown-menu a.dropdown-toggle").on("click", (e) => {
		var el = $(this)
		var parent = $(this).offsetParent(".dropdown-menu")
		if (!$(this).next().hasClass("show")) {
			$(this).parents(".dropdown-menu").first().find(".show").removeClass("show")
		}
		var subMenu = $(this).next(".dropdown-menu")
		subMenu.toggleClass("show")
		$(this).parent("li").toggleClass("show")
		$(this)
			.parents("li.nav-item.dropdown.show")
			.on("hidden.bs.dropdown", (e) => {
				$(".dropdown-menu .show").removeClass("show")
			})
		if (!parent.parent().hasClass("navbar-nav")) {
			el.next().css({ top: el[0].offsetTop, left: parent.outerWidth() - 4 })
		}
		return false
	})
})
