/*

This is, really, not a ScratchStats.com clone.
I wrote this script by myself.

I actually challenged myself to write this in ES5.
But, by using ES5 I can make it faster with promises.
Also, I can make the code cleaner by using ES6.

@World_Languages, watch and learn. lol

*/

// One-time preparations

const
    buildDate = "23/07/2019",

    lists = ["projectsFavorited", "usersFollowing", "usersFollowers", "studiosFollowed", "studiosCurated"]
listsName = ["Project Favorites", "Followed Users", "Followers", "Followed Studios", "Curated Studios"]

let test1, test2, test3, test4, test5

let username, cors, profileData, projList, topProjects, dateJoined, activity, msgCount, fullSpeed, list,
    stats, statsC, statsP, statsPC,
    log = [],
    report = []

// Log function for interface.

function logEvent(logged = "", error = false, update = true) {
    //console.log("[SS] " + logged)
    log.push(logged)
    if (error === true) {
        $("#username")[0].disabled = false
        $("#mode")[0].disabled = false
    }
    if (update === true) {
        $("pre#log")[0].innerHTML = log.join("\n")
        $("pre#log")[0].scrollTop = $("pre#log")[0].scrollHeight;
    }
}

function reportEvent(reported = "") {
    report.push(reported)
}

function sort(array, prefix, comparator) {
    logEvent(prefix + " List sorted.")
    return array.sort(comparator)
}

const timer = {
    time: 0,

    start() {
        return this.time = Date.now()
    },

    stop() {
        return this.time = Date.now() - this.time
    }
}

function regexResult(rawData, regex) {
    let globalRegex = new RegExp(regex, 'gm')
    let finalData = []
    matchedData = rawData.match(globalRegex)
    for (var i in matchedData) {
        if (matchedData[i].match(regex).length === 2) {
            finalData.push(matchedData[i].match(regex)[1])
        } else {
            finalData.push(matchedData[i].match(regex).slice(1))

        }
    }
    return finalData
}

// Initialization for dynamic execution.

const init = () => new Promise(async callback => {

    logEvent()
    logEvent("Scratch Stats starting...")
    logEvent("Preparing...")

    $("#username")[0].disabled = true
    $("#mode")[0].disabled = true
    timer.start()

    // C = capitalized, P = passive

    stats = ["views", "loves", "favorites", "comments"]
    statsC = ["Views", "Loves", "Favorites", "Comments"]
    statsP = ["viewed", "loved", "favorited", "commented"]
    statsPC = ["Viewed", "Loved", "Favorited", "Commented"]

    if ($("#mode")[0].value !== "main") {
        stats.push("remixes")
        statsC.push("Remixes")
        statsP.push("remixed")
        statsPC.push("Remixed")
    }

    report = []
    projList = []
    topProjects = {
        "views": {},
        "loves": {},
        "favorites": {},
        "comments": {},
        "remixes": {},
        "oldest": {},
        "newest": {}
    }
    sortLists = {
        "views": {},
        "loves": {},
        "favorites": {},
        "comments": {},
        "remixes": {},
        "id": {}
    }
    totalStats = {
        "views": 0,
        "loves": 0,
        "favorites": 0,
        "comments": 0,
        "remixes": 0
    }
    avgStats = {
        "views": 0,
        "loves": 0,
        "favorites": 0,
        "comments": 0,
        "remixes": 0
    }
    activity = {
            "favorite": 0,
            "love": 0,
            "studioadd": 0,
            "studiofollow": 0,
            "userfollow": 0,
            "studiocurator": 0,
            "studiomanager": 0,
            "share": 0,
            "total": 0
        },
        list = {
            "projectsFavorited": [],
            "usersFollowing": [],
            "usersFollowers": [],
            "studiosFollowed": [],
            "studiosCurated": []
        }

    // Selecting CORS proxy.

    const corsDetect = () => new Promise(callback2 => {
        $.getJSON("https://api.scratch.mit.edu/", function() {
                callback2("")
            })
            .fail(function() {
                $.getJSON("https://glen-hydrofoil.glitch.me/https://api.scratch.mit.edu", function() {
                        callback2("https://glen-hydrofoil.glitch.me/")
                    })
                    .fail(function() {
                        callback2(false)
                    })
            })
    })

    logEvent("Selecting CORS proxy...")
    if (typeof corsOverride === "string") {
        cors = corsOverride
        logEvent("CORS proxy selected! " + cors)
        callback()
    } else {
        cors = await corsDetect()
        if (cors !== false) {
            logEvent("CORS proxy selected! " + cors)
            if (cors === "") {
                fullSpeed = true
                logEvent("Allowed all cross-origin request. Full speed!")
                callback()
            } else {
                if ($("#mode")[0].value === "ext") {
                    logEvent("Cross-origin request not allowed.")
                    logEvent("To continue, allow cross-origin request (by downloading CORS Everywhere")
                    logEvent("or any other add-on/extension) and try again.", true)
                } else {
                    callback()
                }
            }
        } else {
            logEvent("CORS proxy failed! Aborting operation.", true)
        }
    }

})

// Obtaining user's data, if failed then such user don't exist.

const execProfile = () => new Promise(callback => {

    username = $("#username")[0].value
    logEvent("Username: " + username)
    logEvent("Finding user...")
    $.getJSON(cors + "https://api.scratch.mit.edu/users/" + username)
        .done(function(data) {
            logEvent("User found!")
            profileData = data
            dateJoined = new Date(data.history.joined)
            callback()
        })
        .fail(function() {
            logEvent("User not found! Aborting operation.", true)
        })

})

// A new method of obtaining project's data with a single API for listing projects.

const execProjectMain = () => new Promise(callback => {

    logEvent("[P1] Retrieving projects list...")

    function gallery(pg) {
        pgPlus = pg + 1
        logEvent("[P1] Analyzing page " + pgPlus + "...")
        $.getJSON(cors + "https://api.scratch.mit.edu/users/" + username + "/projects/?limit=40&offset=" + pg * 40,
            function(data) {
                if (data.length != 0) {
                    data.forEach(function(v) {
                        logEvent("[P1] " + v.id + " " + v.title, false, false)
                        projList.push({
                            "id": v.id,
                            "title": v.title,
                            "stats": v.stats
                        })
                    })
                    logEvent("[P1] Analyzed page " + pgPlus + ".")
                    logEvent("[P1] Total projects now: " + projList.length)
                    gallery(pgPlus)
                } else {
                    logEvent("[P1] All pages analyzed and all project's statistics obtained!")
                    callback()
                }
            })
    }
    gallery(0)

})

// An alternative, old method of obtaining project's data by fetch the list of projects
// and fetch the project's data manually.

const execProjectAlt = () => new Promise(async callback1 => {

    let pageDone = 0,
        pageTotal, proj1, proj2 = [],
        projN, projDone = 0

    const execProjectList = () => new Promise(callback2 => {
        logEvent("[P1] Retrieving projects list...")

        function funcCallback(pageNow) {
            logEvent("[P1] Analyzed page " + pageNow + " of " + pageTotal + ".")
            logEvent("[P1] Total projects now: " + proj2.length)
            pageDone++
            if (pageDone === pageTotal) {
                callback2()
            }
        }

        $.get(cors + "https://scratch.mit.edu/users/" + username + "/projects/")
            .done(function(data1) {
                proj1 = data1.match(/project\/\d+/gm)
                proj2 = proj2.concat(proj1)
                if (data1.match(/<span class="page-current/gm) === null) {
                    pageTotal = 1
                } else {
                    pageTotal = data1.match(/<span class="page-current/gm).length
                }
                logEvent("[P1] Projects retrieved!")
                logEvent("[P1] Analyzing " + pageTotal + " page(s)...")
                // Starts the analyze process.
                funcCallback(1)
                if (pageTotal > 1) {
                    for (var i = 2; i < pageTotal + 1; i++) {
                        $.get(cors + "https://scratch.mit.edu/users/" + username + "/projects/?page=" + i,
                            function(data2) {
                                proj1 = data2.match(/project\/\d+/gm)
                                proj2 = proj2.concat(proj1)
                                funcCallback(i)
                            })
                    }
                }
            })
    })

    const execProjectData = () => new Promise(callback2 => {
        logEvent("[P1] All pages analyzed!")
        logEvent("[P1] Total projects: " + proj2.length)
        projN = proj2.length
        logEvent("[P1] Obtaining " + projN + " project's statistics...")
        for (var i2 = 0; i2 < projN + 1; i2++) {
            $.getJSON(cors + "https://api.scratch.mit.edu/projects/" + proj2[i2].match(/\d+/g))
                .done(function(data) {
                    projDone++
                    logEvent("[P1] Obtained project's statistics " + projDone + " of " + projN + ".")
                    logEvent("[P1] " + data.id + " " + data.title)
                    projList.push({
                        "id": data.id,
                        "title": data.title,
                        "stats": data.stats
                    })
                    if (projN == projDone) {
                        logEvent("[P1] All project's statistics obtained!")
                        callback1()
                    }
                })
                .fail(function() {
                    projDone++
                    logEvent("[P1] Failed to obtain project's statistics " + projDone + " of " +
                        projN + ".")
                    logEvent("[P1] " + data.id)
                    if (projN == projDone) {
                        logEvent("[P1] All project's statistics obtained!")
                        callback1()
                    }
                })
        }
    })

    await execProjectList()
    await execProjectData()

})

// Analyzing the project's for its stats.

const execProjectStats = () => new Promise(callback => {

    logEvent("[P1] Analyzing all projects...")

    stats.forEach(function(v1) {
        sortLists[v1] = Array.from(projList)
        sortLists[v1].sort(function(a, b) {
            return b.stats[v1] - a.stats[v1];
        })
        topProjects[v1] = sortLists[v1][0]
        projList.forEach(function(v2) {
            totalStats[v1] += v2.stats[v1]
        })
        avgStats[v1] = Math.round(totalStats[v1] / projList.length)
    })
    sortLists.id = Array.from(projList)
    sortLists.id.sort(function(a, b) {
        return a.stats.id + b.stats.id;
    })
    topProjects.id = sortLists.id[0]
    projList.forEach(function(v2) {
        totalStats.id += v2.stats.id
    })
    avgStats.id = Math.round(totalStats.id / projList.length)
    topProjects.oldest = sortLists.id[0]
    topProjects.newest = sortLists.id[projList.length - 1]
    logEvent("[P1] All projects analyzed!")
    callback()

})

// Obtaining user activity.

const execActivity = () => new Promise(callback => {

    logEvent("[AC] Analyzing user activity...")
    $.get(cors + "https://scratch.mit.edu/messages/ajax/user-activity/?user=" + username + "&max=99999",
        function(
            data) {
            function actMatch(regex) {
                return (data.match(regex) === null) ? 0 : data.match(regex).length
            }
            activity.favorite = actMatch(/favorites/g)
            activity.love = actMatch(/loves/g)
            activity.studioadd = actMatch(/added/g)
            activity.studiofollow = actMatch(/following the/g)
            activity.userfollow = actMatch(/following (?!the)/g)
            activity.studiocurator = actMatch(/became/g)
            activity.studiomanager = actMatch(/promoted/g)
            activity.share = actMatch(/shared/g)
            activity.total = actMatch(/\/li/g)
            logEvent("[AC] User activity analyzed!")
            callback()
        })

})

// Obtaining message count of a user.
// Let's be honest, it is useless but novelty.

const execMessages = () => new Promise(callback => {

    logEvent("[MS] Obtaining message count...")
    $.getJSON(cors + "https://api.scratch.mit.edu/users/" + username + "/messages/count", function(data) {
        msgCount = data.count
        logEvent("[MS] Message count obtained!")
        callback()
    })

})

// These functions is self-explanatory.
// There are only minor diferences between the functions.

const execUsersFollowing = () => new Promise(callback => {

    logEvent("[U1] Retrieving following list...")
    let pageDone = 0,
        pageTotal

    function funcCallback() {
        pageDone++
        logEvent("[U1] Analyzed page " + pageDone + " of " + pageTotal + ".")
        logEvent("[U1] Total following users now: " + list.usersFollowing.length)
        if (pageDone === pageTotal) {
            logEvent("[U1] All pages analyzed!")
            sort(list.usersFollowing, "[U1]")
            callback()
        }
    }

    $.get(cors + "https://scratch.mit.edu/users/" + username + "/following/")
        .done(function(data1) {
            list.usersFollowing = list.usersFollowing.concat(regexResult(data1, /item">\s*<a href="\/users\/(.+)\//))
            if (data1.match(/<span class="page-current/gm) === null) {
                pageTotal = 1
            } else {
                pageTotal = data1.match(/<span class="page-current/gm).length
            }
            logEvent("[U1] Following users retrieved!")
            logEvent("[U1] Analyzing " + pageTotal + " page(s)...")
            funcCallback(1)
            if (pageTotal > 1) {
                for (var i = 2; i < pageTotal + 1; i++) {
                    $.get(cors + "https://scratch.mit.edu/users/" + username + "/following/?page=" + i, function(data2) {
                        list.usersFollowing = list.usersFollowing.concat(regexResult(data2, /item">\s*<a href="\/users\/(.+)\//))
                        funcCallback()
                    })
                }
            }
        })
})

const execUsersFollowers = () => new Promise(callback => {

    logEvent("[U2] Retrieving followers list...")
    let pageDone = 0,
        pageTotal

    function funcCallback() {
        pageDone++
        logEvent("[U2] Analyzed page " + pageDone + " of " + pageTotal + ".")
        logEvent("[U2] Total followers now: " + list.usersFollowers.length)
        if (pageDone === pageTotal) {
            logEvent("[U2] All pages analyzed!")
            sort(list.usersFollowers, "[U2]")
            callback()
        }
    }

    $.get(cors + "https://scratch.mit.edu/users/" + username + "/followers/")
        .done(function(data1) {
            list.usersFollowers = list.usersFollowers.concat(regexResult(data1, /item">\s*<a href="\/users\/(.+)\//))
            if (data1.match(/<span class="page-current/gm) === null) {
                pageTotal = 1
            } else {
                pageTotal = data1.match(/<span class="page-current/gm).length
            }
            logEvent("[U2] Followers retrieved!")
            logEvent("[U2] Analyzing " + pageTotal + " page(s)...")
            funcCallback(1)
            if (pageTotal > 1) {
                for (var i = 2; i < pageTotal + 1; i++) {
                    $.get(cors + "https://scratch.mit.edu/users/" + username + "/followers/?page=" + i, function(data2) {
                        list.usersFollowers = list.usersFollowers.concat(regexResult(data2, /item">\s*<a href="\/users\/(.+)\//))
                        funcCallback()
                    })
                }
            }
        })
})

const execStudiosCurated = () => new Promise(callback => {

    logEvent("[S1] Retrieving curated studios list...")
    let pageDone = 0,
        pageTotal

    function funcCallback() {
        pageDone++
        logEvent("[S1] Analyzed page " + pageDone + " of " + pageTotal + ".")
        logEvent("[S1] Total studios curated now: " + list.studiosCurated.length)
        if (pageDone === pageTotal) {
            logEvent("[S1] All pages analyzed!")
            sort(list.studiosCurated, "[S1]", function(a, b) {
                return a[0] - b[0]
            })
            callback()
        }
    }

    $.get(cors + "https://scratch.mit.edu/users/" + username + "/studios/")
        .done(function(data1) {
            list.studiosCurated = list.studiosCurated.concat(regexResult(data1, /\<a href="\/studios\/(.+)\/">(.+)/))
            if (data1.match(/<span class="page-current/gm) === null) {
                pageTotal = 1
            } else {
                pageTotal = data1.match(/<span class="page-current/gm).length
            }
            logEvent("[S1] Curated studios retrieved!")
            logEvent("[S1] Analyzing " + pageTotal + " page(s)...")
            funcCallback(1)
            if (pageTotal > 1) {
                for (var i = 2; i < pageTotal + 1; i++) {
                    $.get(cors + "https://scratch.mit.edu/users/" + username + "/studios/?page=" + i, function(data2) {
                        list.studiosCurated = list.studiosCurated.concat(regexResult(data2, /\<a href="\/studios\/(.+)\/">(.+)/))
                        funcCallback()
                    })
                }
            }
        })
})

const execStudiosFollowed = () => new Promise(callback => {

    logEvent("[S2] Retrieving followed studios list...")
    let pageDone = 0,
        pageTotal

    function funcCallback() {
        pageDone++
        logEvent("[S2] Analyzed page " + pageDone + " of " + pageTotal + ".")
        logEvent("[S2] Total studios followed now: " + list.studiosFollowed.length)
        if (pageDone === pageTotal) {
            logEvent("[S2] All pages analyzed!")
            sort(list.studiosFollowed, "[S2]", function(a, b) {
                return a[0] - b[0]
            })
            callback()
        }
    }

    $.get(cors + "https://scratch.mit.edu/users/" + username + "/studios_following/")
        .done(function(data1) {
            list.studiosFollowed = list.studiosFollowed.concat(regexResult(data1, /\<a href="\/studios\/(.+)\/">(.+)/))
            if (data1.match(/<span class="page-current/gm) === null) {
                pageTotal = 1
            } else {
                pageTotal = data1.match(/<span class="page-current/gm).length
            }
            logEvent("[S2] Followed studios retrieved!")
            logEvent("[S2] Analyzing " + pageTotal + " page(s)...")
            funcCallback(1)
            if (pageTotal > 1) {
                for (var i = 2; i < pageTotal + 1; i++) {
                    $.get(cors + "https://scratch.mit.edu/users/" + username + "/studios_following/?page=" + i, function(data2) {
                        list.studiosFollowed = list.studiosFollowed.concat(regexResult(data2, /\<a href="\/studios\/(.+)\/">(.+)/))
                        funcCallback()
                    })
                }
            }
        })
})

const execProjectsFavorited = () => new Promise(callback => {

    logEvent("[P2] Retrieving favorited projects list...")
    let pageDone = 0,
        pageTotal

    function funcCallback() {
        pageDone++
        logEvent("[P2] Analyzed page " + pageDone + " of " + pageTotal + ".")
        logEvent("[P2] Total projects favorited now: " + list.projectsFavorited.length)
        if (pageDone === pageTotal) {
            logEvent("[P2] All pages analyzed!")
            sort(list.projectsFavorited, "[P2]", function(a, b) {
                a[0], b[0]
            })
            callback()
        }
    }

    $.get(cors + "https://scratch.mit.edu/users/" + username + "/favorites/")
        .done(function(data1) {
            list.projectsFavorited = list.projectsFavorited.concat(regexResult(data1, /\<a href="\/projects\/(.+)\/">(.+)/))
            if (data1.match(/<span class="page-current/gm) === null) {
                pageTotal = 1
            } else {
                pageTotal = data1.match(/<span class="page-current/gm).length
            }
            logEvent("[P2] Favorited users retrieved!")
            logEvent("[P2] Analyzing " + pageTotal + " page(s)...")
            funcCallback(1)
            if (pageTotal > 1) {
                for (var i = 2; i < pageTotal + 1; i++) {
                    $.get(cors + "https://scratch.mit.edu/users/" + username + "/favorites/?page=" + i, function(data2) {
                        list.projectsFavorited = list.projectsFavorited.concat(regexResult(data2, /\<a href="\/projects\/(.+)\/">(.+)/))
                        funcCallback()
                    })
                }
            }
        })
})

// End of the execution. Print the report.

function execEnd() {

    // Making the report first on an array, maybe I can implement
    // features like saving your report, some time later.

    // Header

    reportEvent("Hans5958's Scratch Stats (build date " + buildDate + ")")
    reportEvent("Report of " + profileData.username)
    reportEvent()
    reportEvent("Data obtained on " + moment().tz(moment.tz.guess()).format("dddd, D MMMM YYYY, H:mm:ss z") + ".")
    reportEvent("Vanity URL: " + window.location)
    reportEvent()

    // General info.

    reportEvent("Username: " + profileData.username)
    reportEvent("ID: " + profileData.id)
    reportEvent("Join Date: " + moment.tz(dateJoined, "GMT").tz(moment.tz.guess()).format("dddd, D MMMM YYYY, H:mm:ss z"))
    reportEvent("Country: " + profileData.profile.country)
    reportEvent("Projects Shared: " + projList.length)
    reportEvent("Projects Favorited: " + list.projectsFavorited.length)
    reportEvent("Followed User: " + list.usersFollowing.length)
    reportEvent("Followers: " + list.usersFollowers.length)
    reportEvent("Curated Studios: " + list.studiosCurated.length)
    reportEvent("Followed Studios: " + list.studiosFollowed.length)
    reportEvent("Current Message Count: " + msgCount)
    reportEvent()

    // User activity.

    reportEvent("User Activity (each limited to 20)")
    reportEvent("Projects Loved: " + activity.love)
    reportEvent("Projects Favorited: " + activity.favorite)
    reportEvent("Projects Shared: " + activity.share)
    reportEvent("Users Followed: " + activity.userfollow)
    reportEvent("Projects Added to Studio: " + activity.studioadd)
    reportEvent("Studios Curated: " + activity.studiocurator)
    reportEvent("Studios Managed: " + activity.studiomanager)
    reportEvent("Total: " + activity.total)
    reportEvent()

    // Project stats.

    stats.forEach(function(v, i) {
        reportEvent("Total " + statsC[i] + ": " + totalStats[v])
    })
    reportEvent()
    stats.forEach(function(v, i) {
        reportEvent("Average " + statsC[i] + ": " + avgStats[v])
    })
    reportEvent()
    stats.forEach(function(v, i) {
        reportEvent("Most " + statsPC[i] + " Project: " + topProjects[v].title + " (" + topProjects[v].stats[v] + ")")
    })
    reportEvent()
    reportEvent("Oldest Project: " + topProjects.oldest.title + " (" + topProjects.oldest.id + ")")
    reportEvent("Newest Project: " + topProjects.newest.title + " (" + topProjects.newest.id + ")")
    reportEvent()

    // List of stats.

    reportEvent("Lists Of Stats:")
    reportEvent()
    reportEvent("Projects: (views / loves / comments / favorites / remixes)")
    sortLists.id.forEach(function(v, i) {
        i++
        reportEvent(i + ". [" + v.id + "] " + v.title + " (" + v.stats.views + " / " + v.stats.loves + " / " + v.stats.comments + " / " + v.stats.favorites + " / " + v.stats.remixes + ")")
    })
    stats.forEach(function(v1, i) {
        reportEvent()
        reportEvent("Most " + statsPC[i] + " Project:")
        sortLists[v1].forEach(function(v2, i) {
            i++
            reportEvent(i + ". [" + v2.stats[v1] + "] " + v2.title)
        })
    })

    // Other list.
    if ($("#mode")[0].value === "ext") {
        lists.forEach(function(v1, i) {
            reportEvent()
            reportEvent(listsName[i] + ":")
            list[v1].forEach(function(v2, i) {
                i++
                if (typeof v2 === "object") {
                    reportEvent(i + ". [" + v2[0] + "] " + v2[1])
                } else {
                    reportEvent(i + ". " + v2)
                }
            })
        })
    }

    // Priting the actual report.

    logEvent()
    logEvent("================================")
    logEvent()
    report.forEach(function(v) {
        logEvent(v, false, false)
    })
    logEvent()
    logEvent("================================")
    logEvent()
    logEvent("Report printed!")
    logEvent("Operation completed in " + timer.stop() / 1000 + " seconds.", true)

}

// Execution triggers, including from vanity URL and edge cases.

$(function() {

    $("input")[0].value = (window.location.hash) ? window.location.hash.slice(1) : "Hans5958"
    window.location.hash = $("input")[0].value
    go()
    $("#username").change(function() {
        go()
        window.location.hash = $("input")[0].value
        $("input")[0].value = window.location.hash.slice(1)
    })
    window.onhashchange = function() {
        go()
        $("input")[0].value = window.location.hash.slice(1)
        window.location.hash = $("input")[0].value
    }
    $("#mode").change(function() {
        go()
    })

})

// The execution!

async function go() {

    if ($("#username")[0].disabled === false) {
        async function execProject() {
            if ($("#mode")[0].value === "main") {
                await execProjectMain()
            } else {
                await execProjectAlt()
            }
            await execProjectStats()
        }
        async function execExtended() {
            if ($("#mode")[0].value === "ext") {
                await Promise.all([execUsersFollowing(), execUsersFollowers(), execStudiosCurated(), execStudiosFollowed(), execProjectsFavorited()])
            }
        }
        await init()
        await execProfile()
        await Promise.all([execActivity(), execMessages(), execProject(), execExtended()])
        execEnd()
    }

}