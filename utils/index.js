const axios = require('axios');
const { JSONWebToken } = require('./jwt');
const config = require('./config');
const serviceAccounts = require('./serviceAccounts');
const log = require('./log');
var tempAuth = {}

function getServiceAccount(){
    if(config.USE_SERVICE_ACCOUNT && serviceAccounts.length > 0) {
        var acc = serviceAccounts[Math.floor(Math.random() * serviceAccounts.length)]
        if(acc?.client_email && acc?.private_key) return acc
    }
    return false
}

async function getAccessToken() {
    if (tempAuth.accessToken && tempAuth.expires > Date.now()) {
        log("Using cached gdrive token");
        return [tempAuth.accessToken, tempAuth.expires];
    }
    const obj = await fetchAccessToken();
    if (obj.access_token != void 0) {
        tempAuth.accessToken = obj.access_token;
        tempAuth.expires = Date.now() + 1800 * 1e3;
    }
    return [tempAuth.accessToken, tempAuth.expires];
}

async function fetchAccessToken() {
    const url = "https://www.googleapis.com/oauth2/v4/token";
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    var post_data;
    const service_acc = getServiceAccount()
    if (service_acc) {
        const jwtToken = await JSONWebToken.generateGCPToken(service_acc);
        post_data = {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwtToken,
        };
    } else {
        post_data = {
            client_id: config.GOOGLE_CLIENT_ID,
            client_secret: config.GOOGLE_CLIENT_SECRET,
            refresh_token: config.GOOGLE_REFRESH_TOKEN,
            grant_type: "refresh_token",
        };
    }

    let requestOption = {
        method: 'POST',
        headers,
        data: enQuery(post_data),
        url
    };

    let response;
    for (let i = 0; i < 3; i++) {
        try {
            response = await axios(requestOption);
            if (response.data.access_token) {
                break;
            }
        } catch { }
        await sleep(800 * (i + 1));
    }
    return response.data
}

async function sleep(ms) {
    return new Promise(function (resolve, reject) {
        let i = 0;
        setTimeout(function () {
            console.log('sleep' + ms);
            i++;
            if (i >= 2) reject(new Error('i>=2'));
            else resolve(i);
        }, ms);
    })
}

function enQuery(data) {
    const ret = [];
    for (let d in data) {
        ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
    }
    return ret.join('&');
}


function convertBytes(bytes) {
    const ONE_GB_IN_BYTES = 1024 * 1024 * 1024;
    const ONE_MB_IN_BYTES = 1024 * 1024;
  
    let result;
    if (bytes >= ONE_GB_IN_BYTES) {
      result = bytes / ONE_GB_IN_BYTES;
      return `${result.toFixed(2)} GB`;
    } else {
      result = bytes / ONE_MB_IN_BYTES;
      return `${result.toFixed(2)} MB`;
    }
  }

module.exports = { 
    getAccessToken, sleep, convertBytes
}
