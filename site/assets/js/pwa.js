const brandEl = document.querySelector('.navbar-brand')
const pwaToDisableAnchorEls = [
	...document.querySelectorAll('a[href^=http]')
]
const pwaEl = document.createElement('span')
pwaEl.className = "nav-text ml-md-2 mr-1 mr-md-2 badge badge-info"
pwaEl.textContent = "PWA active"
let pwaIsStandalone

const pwaHandleConnection = () => {
	// console.info(navigator.onLine)
	if (pwaIsStandalone) {
		pwaEl.textContent = "Standalone mode"
		pwaGatekeepOn()
	} else if (navigator.onLine) {
		pwaEl.textContent = "PWA active"
		pwaGatekeepOff()
	} else {
		pwaEl.textContent = "Offline mode"
		pwaGatekeepOn()
	}
}

const handlePwaTransition = matches => {
	if (matches) {
		// console.log("In standalone")
		pwaIsStandalone = true
		pwaEl.textContent = "Standalone mode"
		pwaGatekeepOn()
	} else {
		pwaIsStandalone = false
		pwaEl.textContent = "PWA active"
		pwaGatekeepOff()
	}
}

const pwaGatekeepOff = () => {
	pwaEl.classList.add("ml-md-2")
	pwaEl.classList.add("mr-1")
	pwaEl.classList.add("mr-md-2")
	brandEl.style.pointerEvents = ""
	document.querySelector('.navbar-nav').style.display = ""
	pwaToDisableAnchorEls.forEach(el => {
		el.style.color = ""
		el.style.pointerEvents = ""
	})
}

const pwaGatekeepOn = () => {
	pwaEl.classList.remove("ml-md-2")
	pwaEl.classList.remove("mr-1")
	pwaEl.classList.remove("mr-md-2")
	brandEl.style.pointerEvents = "none"
	document.querySelector('.navbar-nav').style.display = "none"
	pwaToDisableAnchorEls.forEach(el => {
		el.style.color = "inherit"
		el.style.pointerEvents = "none"
	})
}

window.matchMedia('(display-mode: standalone)').addEventListener('change', ({ matches }) => {
	handlePwaTransition(matches)
})

window.addEventListener('online', pwaHandleConnection);
window.addEventListener('offline', pwaHandleConnection);

const documentReadyPwa = () => {
	document.querySelector('#collapsibleNavbar').insertBefore(pwaEl, document.querySelector('#collapsibleNavbar').children[1])
	const { matches } = window.matchMedia('(display-mode: standalone)')
	handlePwaTransition(matches)
	// console.log(matches)
	pwaHandleConnection()
}

// if (document.readyState === "complete" || document.readyState !== "loading") {
// 	documentReadyPwa()
// } else {
// 	document.addEventListener("DOMContentLoaded", documentReadyPwa)
// }

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		documentReadyPwa()
		navigator.serviceWorker
			.register("pwa-sw.js")
			.then(res => {
				documentReadyPwa()
				// console.log("Service worker registered")
			})
			// .catch(err => console.log("Service worker not registered", err))
	})
}