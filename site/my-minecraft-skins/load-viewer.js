let skinViewer

skinViewer = new skinview3d.FXAASkinViewer({
	canvas: document.getElementById('skinview3d-canvas'),
	height: 400,
	// skin: 'skins/gameboy.png'
})

skinViewer.animations.speed = 1
let rotateAnimation = skinViewer.animations.add(skinview3d.RotatingAnimation)
rotateAnimation.paused = true
rotateAnimation.progress = 0.5
let idleAnimation = skinViewer.animations.add(skinview3d.IdleAnimation)
idleAnimation.speed = 2

const control = skinview3d.createOrbitControls(skinViewer)
control.enableRotate = true
control.enableZoom = true

// skinViewer.renderer.setClearColor(0xFFFFFF);

vm.skin = 'gameboy'

const resizeCanvas = () => {
	skinViewer.width = document.querySelector('#skinview3d-canvas').parentElement.offsetWidth
}

window.addEventListener('resize', resizeCanvas)
resizeCanvas()