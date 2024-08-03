const fetch = require('node-fetch')
globalThis.fetch = fetch

const { Storage } = require('megajs')
const megaAccounts = require('../utils/megaAccounts')
const config = require('../utils/config')

let Socket = {}

function createSocket(data, reset) {
    try {
        if (reset || !Socket[data.id]) Socket[data.id] = new Storage({ ...data, autoload: true, keepalive: true })
        return Socket[data.id]
    } catch { }
}

async function checkMegaPath(paths = [], id = 'main') {

    if (paths.length === 0) return null
    const megaAuth = megaAccounts.find(xx => xx.id == id) || megaAccounts.find(xx => xx.id == 'main') || megaAccounts[0]

    return await new Promise((resolve, reject) => {
        try {
            const storage = createSocket(megaAuth)
            storage.on('ready', () => {
                var folder = storage.root.children.find(xx => xx.name == config.mega_rootFolder)
                for (let Path of paths) {
                    folder = folder?.children?.find(xx => xx.name == decodeURIComponent(Path))
                    if (!folder) break;
                }
                if (!folder || folder.directory) {
                    resolve(null)
                } else {
                    folder?.link((error, url) => {
                        resolve(url ? { name: folder.name, size: folder.size, url } : null)
                    })
                }
            })
            storage.on('error', (err) => {
                resolve(null)
            })
        } catch {
            createSocket(megaAuth, true)
            resolve(null)
        }
    })
}

module.exports = { checkMegaPath }