require("dotenv").config();
const express = require("express");
const cors = require('cors');
const secure = require('ssl-express-www');
const path = require('path');
const axios = require('axios')
const favicon = require("serve-favicon");
const config = require('./utils/config');
const { decryptData, encryptData } = require("./utils/crypto");
const { download, getFileInfo, generateLink } = require("./lib/drive");
const { decryptString, genIntegrity, checkIntegrity, generateAndReturnIV, generateAndReturnKey, generateHMACKey } = require("./utils/webCrypto");
const { getAccessToken, convertBytes } = require("./utils");
const { CheckPaths } = require("./lib/checkIndex");
const { driveDirectDlIncognito } = require("./lib/driveDirectDl");
const stage = require("./stage");
const { checkMegaPath } = require("./lib/checkmega");

const app = express();
app.enable('trust proxy');

app.use(express.json());
app.use(cors());
app.use(secure)
app.use(express.static('assets'));

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

function mainPath(path) {
    return '/' + (path.split('/')[1] || '')
}

app.use(async (req, res, next) => {
    if(stage == 'dev') return res.render('maintain', {})
    if (['/', '/direct.csdl', '/download.csdl', '/info.csdl', '/token.csdl', '/generate.csdl', 'cs.download.csdl', '/generate_web_crypto.csdl', '/admin', '/gdrive.config', '/telegram'].includes(mainPath(req.path))) return next();
    var paths = req.path.replace('/', '').split('/')
    var mega={};
    var gd={};
    try {
        mega = await checkMegaPath(paths,req.query.auth) || {}
        if(mega.size) mega.size = convertBytes(mega.size)
    }catch {}
    try {
        var data = await CheckPaths(paths)
        var file = data.data.pop()
        var id = file.id
        gd = await getFileInfo(id) || {};
        if (gd?.mimeType?.includes('folder')) return res.redirect('/');
        if (!gd.error) {
            gd.size = convertBytes(gd.size)
            gd.link = await generateLink(id, gd.name);
        }
    } catch{}

    try {
        if(!mega.url && !gd.link) {
            if(gd.error) return res.render('error', gd)
            return res.redirect('/');
        }
        var { code, bot } = req.query;
        const links = ['','','','','']
        const btn = config.dlBtn
        if(gd.link) {
           if(btn.server1.active) links[btn.server1.z]=`<a href="${gd.link + '&server=cs_old'}" class="download-btn" id="link1">Direct Download</a>`
           if(btn.server2.active) links[btn.server2.z]=`<a href="${gd.link}" class="download-btn" id="link1">Direct Download 2</a>`
           if(btn.gdrive.active) links[btn.gdrive.z]=`<a href="${gd.link + '&server=gdrive'}" class="download-btn" id="link3" target="_blank">Google Download</a>`
        }
        if(mega.url && btn.mega.active) links[btn.mega.z]=`<a href="${mega.url}" class="download-btn" id="link4" target="_blank">Mega Download</a>`
        if(code && bot && btn.tg.active) links[btn.tg.z]=`<a href="https://t.me/${bot}?start=${code}" class="download-btn" id="link5" target="_blank">Telegram Download</a>`
        res.render('download', { file: gd,mega,links, info: config.dlInfo, timer : config.timer })

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
        var { file, expiry, mac, range, inline, server } = req.query;
        range = req.headers.range || range
        file = await decryptString(file);
        expiry = await decryptString(expiry);
        const integrity = await genIntegrity(`${file}|${expiry}`);
        const integrity_result = await checkIntegrity(mac, integrity);
        const current_time = Math.floor(Date.now() / 1000);
        if (current_time > parseInt(expiry)) {
            return res.render('error', { error: "Link expired." })
        }
        if (!integrity_result) {
            return res.render('error', { error: "Integrity check failed." })
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
            const link = await generateLink(id, response.name);
            res.render('download', { file: response, url: link, gUrl: link + '&server=gdrive', sUrl: link + '&server=cs_old', info: config.dlInfo, timer : config.timer })
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
