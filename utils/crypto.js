const crypto = require('crypto');
const { ENCRYPTION_KEY } = require('./config');

function generateKey(len=16) {
  const hex = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < len; i++) {
      result += hex[Math.floor(Math.random() * 16)];
  }
  return result;
}

function encryptData(data, encryptKey= ENCRYPTION_KEY) {
  try {
    const ivKey = Buffer.from(encryptKey);
    const cipher = crypto.createCipheriv("aes-128-cbc", encryptKey, ivKey);
    return Buffer.concat([cipher.update(data, "utf-8"), cipher.final()]).toString("hex");
  } catch (e) {
    console.error(e.message);
    throw new Error(e.message);
  }
}

function decryptData(hash, encryptKey = ENCRYPTION_KEY){
  try {
    const ivKey = Buffer.from(encryptKey);
    const decipher = crypto.createDecipheriv("aes-128-cbc", encryptKey, ivKey);

    return Buffer.concat([decipher.update(hash, "hex"), decipher.final()]).toString("utf-8");
  } catch (e) {
    throw new Error("Failed to decrypt data, either invalid hash or encryption key.");
  }
}
module.exports = {encryptData,decryptData,generateKey}