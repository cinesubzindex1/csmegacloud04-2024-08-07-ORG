require("dotenv").config();
const express = require("express");
const cors = require('cors');
const secure = require('ssl-express-www');
const path = require('path');
const axios = require('axios')
const config = require('./utils/config');
const { decryptData } = require("./utils/crypto");
const { download, getFileInfo, generateLink } = require("./lib/drive");
const { decryptString, genIntegrity, checkIntegrity, generateAndReturnIV, generateAndReturnKey, generateHMACKey } = require("./utils/webCrypto");
const { getAccessToken, convertBytes } = require("./utils");

const app = express();
app.enable('trust proxy');

app.use(express.json());
app.use(cors());
app.use(secure)
app.use(express.static('assets'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('error', { error: 'Permission denied' })
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
        if (server == 'gdrive') return res.redirect(`https://drive.usercontent.google.com/download?id=${file}&export=download`)
        if (server == 'cs_old') {
            try{
                var {data} = await axios.get('https://kos.csheroku01.workers.dev/generate.aspx?id=' + file)
                return res.redirect(data.link)
            } catch {}
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
    } catch(e) {
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
        const link = await generateLink(id,response.name);
        const json = {
            link: "https://" + req.get('host') + link,
            gdrive: "https://" + req.get('host') + link + '&server=gdrive',
            sever:"https://" + req.get('host') + link + '&server=cs_old'
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
            const link = await generateLink(id,response.name);
            res.render('download', { file: response, url: link, gUrl: link + '&server=gdrive',sUrl: link + '&server=cs_old', info: config.dlInfo })
        }
    } catch {
        return res.render('error', { error: "Invalid request." })
    }
});

app.get('/generate_web_crypto.csdl', async (req, res) => {
    const key = await generateAndReturnKey();
    const iv = await generateAndReturnIV();
    const hmac = generateHMACKey();
    res.json({key,iv,hmac})
});

app.listen(config.PORT, () => {
    console.log("Server is running on port " + config.PORT);
});
