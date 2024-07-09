const crypto = require('node:crypto').webcrypto

//you can gen keys using (/generate_web_crypto.csdl) route
const crypto_base_key = "3225f86e99e205347b4310e437253bfd"
const hmac_base_key = "4d1fbf294186b82d74fff2494c04012364200263d6a36123db0bd08d6be1423c"
const encrypt_iv = new Uint8Array([247, 254, 106, 195, 32, 148, 131, 244, 222, 133, 26, 182, 20, 138, 215, 81]);

async function generateAndReturnKey() {
    const key = await generateKey();
    const keyBytes = await crypto.subtle.exportKey('raw', key);
    const keyHex = Array.from(new Uint8Array(keyBytes))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');

    return keyHex;
}

async function generateAndReturnIV() {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const ivString = JSON.stringify(Array.from(iv));
    return ivString;
}

function generateHMACKey() {
    const keyBuffer = new Uint8Array(32);
    crypto.getRandomValues(keyBuffer);
    const keyHex = Array.from(keyBuffer).map(byte => byte.toString(16).padStart(2, '0')).join('');
    return keyHex; // 512 bit key
}

async function generateKey() {
    const key = await crypto.subtle.generateKey({
        name: 'AES-CBC',
        length: 128
    },
        true,
        ['encrypt', 'decrypt']
    );

    return key;
}

async function encryptString(string) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(crypto_base_key),
        "AES-CBC",
        false,
        ["encrypt"]
    );
    const encodedId = new TextEncoder().encode(string);
    const encryptedData = await crypto.subtle.encrypt({
        name: "AES-CBC",
        iv: encrypt_iv
    },
        key,
        encodedId
    );
    const encryptedString = btoa(Array.from(new Uint8Array(encryptedData), (byte) => String.fromCharCode(byte)).join(""));
    return encryptedString;
}

async function decryptString(encryptedString) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(crypto_base_key),
        "AES-CBC",
        false,
        ["decrypt"]
    );
    const encryptedBytes = Uint8Array.from(atob(encryptedString), (char) => char.charCodeAt(0));
    const decryptedData = await crypto.subtle.decrypt({
        name: "AES-CBC",
        iv: encrypt_iv
    },
        key,
        encryptedBytes
    );
    const decryptedString = new TextDecoder().decode(decryptedData);
    return decryptedString;
}

async function genIntegrity(data, key = hmac_base_key) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hmacKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key), {
        name: 'HMAC',
        hash: 'SHA-256'
    },
        false,
        ['sign']
    );
    const hmacBuffer = await crypto.subtle.sign('HMAC', hmacKey, dataBuffer);

    const hmacArray = Array.from(new Uint8Array(hmacBuffer));
    const hmacHex = hmacArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

    return hmacHex;
}

async function checkIntegrity(text1, text2) {
    const hash1 = await genIntegrity(text1);
    const hash2 = await genIntegrity(text2);

    return hash1 === hash2;
}

module.exports = {
    generateKey, generateHMACKey, generateAndReturnIV, generateAndReturnKey,
    checkIntegrity, genIntegrity, decryptString, encryptString
}