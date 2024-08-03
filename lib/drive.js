var axios = require('axios');
const { encryptString, genIntegrity } = require('../utils/webCrypto');
const config = require('../utils/config');
const { sleep, getAccessToken } = require('../utils');

async function download(id, range = '', inline) {
    const requestOption = await requestOptions();
    requestOption.headers['Range'] = range;
    let file = await getFileInfo(id);
    if (!file.name) {
        return { error: "File not found." };
    }
    let res;
    for (let i = 0; i < 3; i++) {
        try {
            res = await axios.get(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
                ...requestOption,
                responseType: 'stream'
            });
            if (res.status === 200) {
                break;
            }
        } catch (error) {
            res = error.response;
            await sleep(800 * (i + 1));
        }
    }
    console.log(res.headers)
    if (res && res.status === 200) {
        const headers = {
            'Content-Disposition': `attachment; filename="${file.name}"`,
            'Content-Length': file.size,
            ...res.headers
        };
        if (config.enable_cors_file_down) {
            headers['Access-Control-Allow-Origin'] = '*';
        }
        if (inline === true) {
            headers['Content-Disposition'] = 'inline';
        }
        return { status: 200, headers, body: res.data };
    } else if (res.status === 404) {
        return { error: "File not found." };
    } else if (res.status === 403) {
        return { error: "Permission denied." };
    } else {
        return { error: "Unknown error." };
    }
}

async function getFileInfo(id) {
    let url = `https://www.googleapis.com/drive/v3/files/${id}?fields=name,size,fileExtension,fullFileExtension,md5Checksum,sha1Checksum,sha256Checksum,createdTime,modifiedTime,webContentLink,mimeType&supportsAllDrives=true`;
    let requestOption = await requestOptions();
    let response;
    for (let i = 0; i < 3; i++) {
        try {
            response = await axios({ url, ...requestOption });
            if (response.data.name) {
                break;
            }
        } catch { }
        await sleep(800 * (i + 1));
    }
    return response?.data || { error: "File not found." }
}

async function DeleteFile(id) {
    let url = `https://www.googleapis.com/drive/v3/files/${id}?supportsAllDrives=true`;
    let requestOption = await requestOptions({}, 'DELETE');
    let res
    for (let i = 0; i < 3; i++) {
        try {
            res = await axios({ url, ...requestOption });
            if (res.status == 204) {
                break;
            }
        } catch { }
        await sleep(800 * (i + 1));
    }
    let return_status
    if (res?.status == 204) {
        return_status = "200";
    } else {
        return_status = "404";
    }
    const json = {
        "id": id,
        "status": return_status,
    }
    return [json, return_status]
}
async function requestOptions(headers = {}, method = 'GET') {
    const [token, expires] = await getAccessToken();
    headers['authorization'] = 'Bearer ' + token;
    return {
        'method': method,
        'headers': headers
    };
}

async function generateLink(file_id, filename) {
    const encrypted_id = await encryptString(file_id);
    const expiry = Date.now() + 1000 * 60 * 60 * 24 * config.file_link_expiry;
    const encrypted_expiry = await encryptString(expiry.toString());
    const integrity = await genIntegrity(`${file_id}|${expiry}`);
    const url = `/download.csdl/${encodeURIComponent(filename)}?file=${encodeURIComponent(encrypted_id)}&expiry=${encodeURIComponent(encrypted_expiry)}&mac=${encodeURIComponent(integrity)}&inline=true`;
    return url;
}

module.exports = { download, getFileInfo, DeleteFile, generateLink }