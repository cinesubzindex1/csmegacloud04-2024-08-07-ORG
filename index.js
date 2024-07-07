require("dotenv").config();
const express = require("express");
const cors = require('cors');
const secure = require('ssl-express-www');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const favicon = require("serve-favicon");
const config = require('./utils/config');
const { decryptData, encryptData } = require("./utils/crypto");
const { download, getFileInfo, generateLink, generateLinkData } = require("./lib/drive");
const { decryptString, genIntegrity, checkIntegrity, generateAndReturnIV, generateAndReturnKey, generateHMACKey } = require("./utils/webCrypto");
const { getAccessToken, convertBytes } = require("./utils");
const { CheckPaths } = require("./lib/checkIndex");
const { driveDirectDlIncognito } = require("./lib/driveDirectDl");
const stage = require("./stage");
const { obCode } = require("./script/ob");

const app = express();
app.enable('trust proxy');

app.use(express.json());
app.use(cors());
app.use(secure)

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

function mainPath(path) {
    return '/' + (path.split('/')[1] || '')
}

app.use(async (req, res, next) => {
    if(stage == 'dev') return res.render('maintain', {})
    if (['/', '/direct.csdl', '/download.csdl', '/info.csdl', '/token.csdl', '/generate.csdl', 'cs.download.csdl', '/generate_web_crypto.csdl', '/admin', '/gdrive.config', '/telegram'].includes(mainPath(req.path))) return next();
    try {
        var data = await CheckPaths(req.path.replace('/', '').split('/'))
        var file = data.data.pop()
        var id = decryptData(file.id)
        const response = await getFileInfo(id);
        if (response?.mimeType?.includes('folder')) return res.redirect('/');
        if (response.error) {
            res.render('error', response)
        } else {
            response.size = convertBytes(response.size)
            const meta = await generateLinkData(id, response.name);
            const code = fs.readFileSync('./script/dlButton.js','utf-8')
            const downloadScript = obCode(code.replace('meta.id',meta.id).replace('meta.expiry',meta.expiry))
            res.render('download', { file: response,meta ,downloadScript, info: config.dlInfo, timer : config.timer })
        }
    } catch {
        return res.render('error', { error: "Invalid request." })
    }
});

app.get('/', (req, res) => {
    res.render('error', { error: 'Permission denied' })
});

app.get('/telegram',(req, res) => {
        var { code, bot } = req.query;
        if(!code || !bot) return res.redirect('/')
        const tg = `https://t.me/${bot}?start=${code}`
        res.render('tg', { tg, info: config.dlInfo, timer : config.timer })
});

app.get('/admin', (req, res) => {
    var { pass } = req.query;
    if (pass != 'cs123') res.redirect('/');
    res.render('setup', { enc: config.ENCRYPTION_KEY, path: 'gdrive.config' })
});

app.get('/gdrive.config', (req, res) => {
    var { rootFolder, sharedDrive, enc } = req.query;
    rootFolder = encryptData(rootFolder, enc)
    sharedDrive = encryptData(sharedDrive, enc)
    res.json({ ENCRYPTION_KEY: enc, apiConfig: { rootFolder, isTeamDrive: true, sharedDrive } })
});

app.get('/direct.csdl/:name', async (req, res) => {
    try {
        if (!config.ALLOW_DIRECT_ID_DOWNLOADS) return res.redirect('/');

        var { id, range, inline, key, encryptedId } = req.query;
        if (encryptedId) id = decryptData(encryptedId)
        range = req.headers.range || range
        if (key !== 'csdiv') {
            return res.render('error', { error: 'Permission denied' })
        }
        const response = await download(id, range, inline === 'true');
        if (response.error) {
            res.render('error', response)
        } else {
            for (const [key, value] of Object.entries(response.headers)) {
                res.setHeader(key, value);
            }
            response.body.pipe(res);
        }
    } catch {
        return res.render('error', { error: "Invalid request." })
    }
});

app.get('/download.csdl/:name', async (req, res) => {

    if (!config.ALLOW_DOWNLOADING_FILES) return res.redirect('/');

    try {
        var { file, expiry, mac, range, inline, server, iv, tag, resp} = req.query;
        range = req.headers.range || range
        file = await decryptString(file);
        expiry = await decryptString(expiry);
        const integrity = await genIntegrity(`${file}|${expiry}`);
        const integrity_result = await checkIntegrity(mac, integrity);
        const current_time = Date.now();
        const current_time_x = current_time + 1000 * 60 * 60 * 24 * config.file_link_expiry
        const delay = config.timer.active && config.timer.time > 0 ? config.timer.time : 1

        if (current_time > parseInt(expiry)) {
            return res.render('error', { error: "Link expired." })
        }
        if(!resp && (current_time_x - parseInt(expiry))/1000 < delay) {
            return res.render('error', { error: "Link stage invalid." })
        }
        if (!integrity_result) {
            return res.render('error', { error: "Integrity check failed." })
        }
        if (!iv || !tag) {
            return res.render('error', { error: "invalid url" })
        }
        if (server == 'gdrive'){
            const dlLink = await driveDirectDlIncognito(file)
            return res.redirect(dlLink || `https://drive.usercontent.google.com/download?id=${file}&export=download`)
        }
        if (server == 'cs_old') {
            async function useServer(fail) {
                try {
                    const server = config.downloadServers[Math.floor(Math.random() * config.downloadServers.length)]
                    var { data } = await axios.get(`https://${server}/generate.aspx?id=` + file)
                    return res.redirect(data.link)
                } catch { 
                    if(!fail) return await useServer(true)
                }
            }
            return await useServer()
        }

        const response = await download(file, range, inline === 'true');
        if (response.error) {
            res.render('error', response)
        } else {
            for (const [key, value] of Object.entries(response.headers)) {
                res.setHeader(key, value);
            }
            response.body.pipe(res);
        }
    } catch (e) {
        console.log(e)
        return res.render('error', { error: "Invalid request." })
    }
});

app.get('/info.csdl', async (req, res) => {
    try {
        if (!config.ALLOW_FETCHING_FILE_INFO) return res.redirect('/');

        var { id, encryptedId } = req.query;
        if (encryptedId) id = decryptData(encryptedId)
        const response = await getFileInfo(id);
        if (response.error) {
            res.render('error', response)
        } else {
            res.json(response)
        }
    } catch {
        return res.render('error', { error: "Invalid request." })
    }
});

app.get('/token.csdl', async (req, res) => {
    try {
        if (!config.ALLOW_GENERATING_TOKENS) return res.redirect('/');

        const [token, expiry] = await getAccessToken();
        if (!token || !expiry) {
            res.render('error', { error: 'can\'t fetch token' })
        } else {
            res.json({ token: token, expires: expiry })
        }
    } catch {
        return res.render('error', { error: "Invalid request." })
    }
});

app.get('/generate.csdl', async (req, res) => {
    try {
        if (!config.ALLOW_GENERATING_LINKS) return res.redirect('/');

        var { id, encryptedId } = req.query;
        if (encryptedId) id = decryptData(encryptedId)
        const response = await getFileInfo(id);
        const link = await generateLink(id, response.name);
        const json = {
            link: "https://" + req.get('host') + link,
            gdrive: "https://" + req.get('host') + link + '&server=gdrive',
            sever: "https://" + req.get('host') + link + '&server=cs_old'
        }
        res.json(json)
    } catch {
        return res.render('error', { error: "Invalid request." })
    }
});

app.get('/cs.download.csdl', async (req, res) => {
    try {
        if (!config.ALLOW_DOWNLOADING_PAGE) return res.redirect('/');

        var { id, encryptedId } = req.query;
        if (encryptedId) id = decryptData(encryptedId)
        const response = await getFileInfo(id);
        if (response.error) {
            res.render('error', response)
        } else {
            response.size = convertBytes(response.size)
            const meta = await generateLinkData(id, response.name);
            const code = fs.readFileSync('./script/dlButton.js','utf-8')
            const downloadScript = obCode(code.replace('meta.id',meta.id).replace('meta.expiry',meta.expiry))
            res.render('download', { file: response, meta ,downloadScript, info: config.dlInfo, timer : config.timer })
        }
    } catch {
        return res.render('error', { error: "Invalid request." })
    }
});

app.get('/generate_web_crypto.csdl', async (req, res) => {
    const key = await generateAndReturnKey();
    const iv = await generateAndReturnIV();
    const hmac = generateHMACKey();
    res.json({ key, iv, hmac })
});

app.listen(config.PORT, () => {
    console.log("Server is running on port " + config.PORT);
});
