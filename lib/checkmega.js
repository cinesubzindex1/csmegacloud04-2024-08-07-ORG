const fetch = require('node-fetch')
globalThis.fetch = fetch

const { Storage } = require('megajs')
const megaAccounts = require('../utils/megaAccounts')
const config = require('../utils/config')
const log = require('../utils/log')

global.MegaSockets = global.MegaSockets || {}

async function makeSocket(megaAuth, lastAttempt, refresh) {
    if(!lastAttempt && !refresh && global.MegaSockets[megaAuth.id]) {
        log('using cached mega auth')
        return global.MegaSockets[megaAuth.id]
    }
    return await new Promise((resolve, reject) => {
        try {
            const storage = new Storage({ ...megaAuth, autoload: true, keepalive: true })
            storage.on('ready', () => {
                global.MegaSockets[megaAuth.id] = storage
                resolve(global.MegaSockets[megaAuth.id])
            })
            storage.on('error', (err) => {
                if (lastAttempt) {
                    resolve(null)
                } else {
                    makeSocket(megaAuth, true).then(resolve)
                }
            })
        } catch {
            if (lastAttempt) {
                resolve(null)
            } else {
                makeSocket(megaAuth, true).then(resolve)
            }
        }
    })
}

async function checkMegaPath(paths = [],withLink, id = 'main') {

    if (paths.length === 0) return null
    const megaAuth = megaAccounts.find(xx => xx.id == id) || megaAccounts.find(xx => xx.id == 'main') || megaAccounts[0]

    try {
        const storage = await makeSocket(megaAuth)
        var folder = storage.root.children.find(xx => xx.name == config.mega_rootFolder)
        for (let Path of paths) {
            folder = folder?.children?.find(xx => xx.name == decodeURIComponent(Path))
            if (!folder) break;
        }
        if (!folder || folder.directory) return null;
        var url = withLink ? await folder.link((error, _url) => _url) : 'https://mega.nz'
        return url ? { hasfile : true, name: folder.name, size: folder.size, url } : null
    } catch {
        return null
    }
}

module.exports = { checkMegaPath }
