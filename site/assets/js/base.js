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
