const vm = new Vue({
	el: '#app',
	data: {
		skin: '',
		img: '',
		name: '',
		fullName: '',
		link: [],
		author: '',
		authorDesc: '',
		edited: false,
		allSkinData: {
			gameboy: {
				img: 'skins/gameboy.png',
				name: 'Gameboy',
				fullName: 'The Gameboy',
				link: [
					['PlanetMinecraft', 'https://www.planetminecraft.com/skin/gameboy---the-gameboy/']
				],
				author: 'Raidworld',
				authorDesc: 'My "Gameboy Color" (GBC) was my favorite toy I ever had, so I made a skin of it. Because of a common GBC has no arms and legs, I made him a kind of an armor to beat every enemy he gets! While he has not to fight you can use him to play video games which are inserted in the back of his head. Otherwise just give him a sword and put him right under your pillow. He will come out and protect you from evil enemies if you need it!'
			},
			prill: {
				img: 'skins/p-rill.png',
				name: 'P-Rill',
				fullName: 'P-Rill, the Robotic Administrator',
				link: [
					['PlanetMinecraft', 'https://www.planetminecraft.com/skin/p-rill-the-robotic-administrator/']
				],
				author: 'Drazile',
				authorDesc: 'To conserve precious brain power for important updates, a doppelgänger of Paril was created to perform the menial task of moderating PMC. Due to its efficiency, there was no longer a requirement for human administrators or moderators, whether they be site, forum or even chat.',
				edited: true
			},
			f3455: {
				img: 'skins/f3455-abandonbot.png',
				name: 'Abandonbot',
				fullName: 'F3455 - Abandonbot',
				link: [
					['PlanetMinecraft', 'https://www.planetminecraft.com/skin/f3455---abandonbot/']
				],
				author: 'wldscarlet',
				authorDesc: 'Model F3455 once used to be model T3455 before unexpected situation happened. Model T3455 was created by Gwrinholk Robotic Company to burn or crush garbage to extract useful materials and send them back to factories.<br />After model T3455 became wide used robot in many cities, it got hacked. The model T3455 got hacked by homeless people and they turn these robots into their slaves.<br />After the research result was published, Gwrinholk Robotic Company decided to shut this project of model T3455 down because they could not control over a lot of their robots which causing wasting money for service and supporting. So they changed the name of model to F3455, the failed model, and gave its codename "Abandonbot".'
			},
			redstoner: {
				img: 'skins/redstoner.png',
				name: 'Redstoner',
				link: [
					['PlanetMinecraft', 'https://www.planetminecraft.com/skin/redstoner-2735015/']
				],
				author: 'Luis',
				authorDesc: 'A sort of request'
			},
			redstone: {
				img: 'skins/redstone.png',
				name: 'Redstone',
				link: [
					['PlanetMinecraft', 'https://www.planetminecraft.com/skin/redstone-2513108/']
				],
				author: '12Me21',
				authorDesc: 'A redstone-themed skin'
			},
			speedycube: {
				img: 'skins/speedycube.png',
				name: 'SpeedyCube',
				link: [
					['PlanetMinecraft', 'https://www.planetminecraft.com/skin/speedycube/']
				],
				author: 'Drazile',
				edited: true
			},
			redstoneEngineer: {
				img: 'skins/redstone-engineer.png',
				name: 'Redstone Engineer',
				link: [
					['PlanetMinecraft', 'https://www.planetminecraft.com/skin/redstone-engineer-3114443/']
				],
				author: 'OakPilot',
				authorDesc: 'Redstone Engineer, for my borther, Boomshakalaka. Comes with state-of-the-art Engineer Goggles, Construction Overalls, Worker Gloves, and Redstone torches for those redstone needs!'
			},
			prototypes: {
				img: 'skins/prototypes.png',
				name: 'The Prototypes',
				link: [
					['PlanetMinecraft', 'https://www.planetminecraft.com/skin/the-prototypes-skin-packs/'],
					['Minecraft Forum', 'https://www.minecraftforum.net/forums/mapping-and-modding-java-edition/skins/1218784-the-prototypes-free-robot-skins']
				],
				author: 'sixfootblue',
				authorDesc: "They're free, and ready to fight...<br />These are some old skins that I made back in 2013 and posted on the Minecraft Forums. I think they were probably my first public skin upload too."
			},
			computerGuy: {
				img: 'skins/computer-guy.png',
				name: 'Computer Guy',
				link: [
					['Skin 1', 'https://namemc.com/skin/2ef90b4de861ecc0'],
					['Skin 2', 'https://namemc.com/skin/ee0f87f0db239335']
				],
				author: 'Hans5958',
				authorDesc: 'This is a merge of two skins I found on the internet, a robot head and a colorful sweater, including some robotic edits.',
				edited: true
			}
		},
		skinDataTemplate: {
			img: 'skins/.png',
			name: '',
			fullName: '',
			link: '',
			author: '',
			authorDesc: '',
			edited: false
		}
	},
	watch: {
		skin: function (val) {
			skinViewer.loadSkin(this.allSkinData[val].img)	
			for (const [key, value] of Object.entries({...this.skinDataTemplate, ...this.allSkinData[val]})) {
				this[key] = value
			}
			// rotateAnimation.reset()
		}
	},
	methods: {
		pauseRotate() {
			rotateAnimation.speed = 0
		},
		resumeRotate() {
			// rotateAnimation.speed = 0.1
		},
		resetRotate() {
			rotateAnimation.progress = Math.PI
		}
	}
})