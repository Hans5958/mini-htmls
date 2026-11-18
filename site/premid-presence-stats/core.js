/**
 * Framework-free helpers and aggregations for the PreMiD presence stats page.
 *
 * This module has no DOM, jQuery, Chart.js or DataTables dependencies, so it
 * can be imported by any entry point (static dump, live API, tests, ...).
 */

/**
 * Simple table data container.
 */
export class List {
	constructor(header, data = []) {
		this.header = header
		this.data = data
	}

	static inArray(list) {
		if (Array.isArray(list.data)) return list.data
		const arr = []
		Object.keys(list.data).forEach(key => {
			arr.push([])
			Object.values(list.data[key]).forEach(value => {
				arr[arr.length - 1].push(value)
			})
		})
		return arr
	}
}

/**
 * Runs a function for every presence in a presence map.
 * @param {object} presence Presence name -> presence object.
 * @param {function} callback Receives (presence, name).
 */
export const forEveryPresence = (presence, callback) => {
	Object.keys(presence).forEach(name => callback(presence[name], name))
}

// https://gist.github.com/0x263b/2bdd90886c2036a1ad5bcf06d6e6fb37

/**
 * Generates a color hash from a specified string.
 * @param {string} str String that will be hashed
 */
export const getColorHash = str => {
	let hash = 0
	if (!str || str.length === 0) return hash
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash)
		hash = hash & hash
	}
	let color = '#'
	for (let i = 0; i < 3; i++) {
		const value = (hash >> (i * 8)) & 255
		color += ('00' + value.toString(16)).substr(-2)
	}
	return color
}

/**
 * General color hashing for Chart.js.
 * @param {*} ctx
 */
export const generalColorHashing = ctx => getColorHash(ctx.chart.data.labels[ctx.dataIndex])

/**
 * Entries missing any of the metadata rendered below are not usable.
 */
const isRenderablePresence = presence => Boolean(
	presence &&
	presence.name &&
	presence.metadata &&
	presence.metadata.author &&
	Array.isArray(presence.metadata.tags) &&
	presence.metadata.description &&
	typeof presence.metadata.description === "object"
)

/**
 * Older dumps store descriptions under `metadata.descriptions` (keyed by
 * language code, with a `0` entry carrying `{ languageCode, description }`).
 * The renderer only understands `metadata.description`, so normalise it.
 */
const normalizeDescriptions = metadata => {
	if (metadata.description && typeof metadata.description === "object") return
	if (!metadata.descriptions || typeof metadata.descriptions !== "object") return

	const description = {}
	Object.keys(metadata.descriptions).forEach(key => {
		const value = metadata.descriptions[key]
		if (value && typeof value === "object" && typeof value.description === "string") {
			description[value.languageCode || key] = value.description
		} else if (typeof value === "string") {
			description[key] = value
		}
	})
	if (Object.keys(description).length) metadata.description = description
}

/**
 * Normalise a raw presence dump: drop entries whose metadata cannot be
 * rendered and recompute usage shares from the user counts.
 *
 * @param {object} rawPresence Presence name -> presence object.
 * @param {{partners?: string[]}} options Partner names. Defaults to entries
 *        flagged with `additional.partner` in the dump.
 * @returns {{presence: object, totalUsers: number}}
 */
export const preparePresenceData = (rawPresence, { partners } = {}) => {
	const presence = { ...rawPresence }

	const partnerNames = new Set(
		partners ?? Object.values(rawPresence)
			.filter(entry => entry && entry.additional && entry.additional.partner)
			.map(entry => entry.name)
	)

	forEveryPresence(presence, (entry, name) => {
		normalizeDescriptions(entry.metadata)
		if (!isRenderablePresence(entry)) {
			delete presence[name]
			return
		}
		if (entry.users === undefined) entry.users = 0
		entry.additional = {
			userPercentage: 0,
			hot: false,
			partner: partnerNames.has(name)
		}
	})

	const totalUsers = Object.values(presence)
		.reduce((total, entry) => total + (Number(entry.users) || 0), 0)

	forEveryPresence(presence, entry => {
		entry.additional.userPercentage = totalUsers ? entry.users / totalUsers * 100 : 0
		entry.additional.hot = entry.additional.userPercentage > 5
	})

	return { presence, totalUsers }
}

/**
 * Build category aggregates.
 */
export const buildCategoryStats = presence => {
	const category = {}

	forEveryPresence(presence, entry => {
		const name = entry.metadata.category
		if (category[name] === undefined) {
			category[name] = {
				category: name,
				presences: [],
				users: 0,
				average: 0
			}
		}
		category[name].presences.push(entry.name)
		category[name].users += entry.users
	})

	Object.keys(category).forEach(key => {
		category[key].average = Math.round(category[key].users / category[key].presences.length)
	})

	return category
}

/**
 * Build author aggregates.
 */
export const buildAuthorStats = presence => {
	const author = {}

	forEveryPresence(presence, entry => {
		const id = entry.metadata.author.id
		if (author[id] === undefined) {
			author[id] = {
				author: entry.metadata.author.name,
				id,
				presences: [],
				users: 0,
				average: 0
			}
		}
		author[id].presences.push(entry.name)
		author[id].users += entry.users
	})

	Object.keys(author).forEach(key => {
		author[key].average = Math.round(author[key].users / author[key].presences.length)
	})

	return author
}

/**
 * Build description-language aggregates.
 * @param {object} presence Presence map.
 * @param {object} locale Language tag -> display name.
 */
export const buildLanguageStats = (presence, locale = {}) => {
	const lang = {}

	forEveryPresence(presence, entry => {
		const description = entry.metadata.description
		if (!description || typeof description !== "object") return

		Object.keys(description).forEach(langTagRaw => {
			const langTag = langTagRaw.split("_").length === 2
				? `${langTagRaw.split("_")[0]}_${langTagRaw.split("_")[1].toUpperCase()}`
				: langTagRaw

			if (lang[langTag] === undefined) {
				lang[langTag] = {
					language: locale[langTag],
					tag: langTag,
					presences: []
				}
			}
			lang[langTag].presences.push(entry.name)
		})
	})

	return lang
}

/**
 * Count feature implementations. Index 0 is unused.
 */
export const buildImplementationStats = presence => {
	const implementations = 9
	const implementation = Array(implementations + 1).fill(0)

	forEveryPresence(presence, entry => {
		const metadata = entry.metadata
		if (metadata.iframe) implementation[1]++
		if (metadata.contributors) implementation[2]++
		if (metadata.regExp) implementation[4]++
		if (typeof metadata.description === "object" && Object.keys(metadata.description).length !== 1) implementation[5]++
		if (entry.additional.partner) implementation[6]++
		if (entry.additional.hot) implementation[7]++
		if (metadata.altnames) implementation[8]++
		if (metadata.settings) {
			implementation[3]++
			if (metadata.settings.filter(setting => setting.multiLanguage).length !== 0) implementation[9]++
		}
	})

	return implementation
}
