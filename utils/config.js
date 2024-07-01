function toBool(item, val = 'true') {
    return !(!item || item.toLowerCase() != val)
}

function generateKey(key) {
    return !key ? "google-drive-dls" : key.length < 16 ? key.padEnd(16, "0") : key.length > 16 ? key.slice(0, 16) : key;
}

//cs.download.csdl info
const dlInfo = {
    main: 'ඩිරෙක්ට් ඩවුන්ලෝඩ් කියමට ඉහත Server 1 හෝ Server 2 හෝ Google Server එක ක්ලික් කර ලබා ගන්න.\n 
කිසියම් Server එකක ගැටළු ඇත්නම් වෙනත් Server එකක් උත්සහ කරන්න.\n
Server  3 ම වැඩ නැත්නම් අපට දැනුම් දෙන්න. \n ඩවුන්ලෝඩ් ගැටළු ඇත්නම් පහත ලින්ක් එක ඔස්සේ අපව සම්බන්ධ කරගන්න.',
    help: 'https://t.me/CineSubzAdmin',
    support: 'https://cinesubz.co'
}

module.exports = {
    version: "v1.0",
    PORT: process.env.PORT || 8000,
    ENCRYPTION_KEY: generateKey(process.env.ENCRYPTION_KEY),
    USE_SERVICE_ACCOUNT: toBool(process.env.USE_SERVICE_ACCOUNT),
    ALLOW_DOWNLOADING_PAGE: toBool(process.env.ALLOW_DOWNLOADING_PAGE),
    ALLOW_DOWNLOADING_FILES: toBool(process.env.ALLOW_DOWNLOADING_FILES),
    ALLOW_DIRECT_ID_DOWNLOADS: toBool(process.env.ALLOW_DIRECT_ID_DOWNLOADS),
    ALLOW_FETCHING_FILE_INFO: toBool(process.env.ALLOW_FETCHING_FILE_INFO),
    ALLOW_GENERATING_LINKS: toBool(process.env.ALLOW_GENERATING_LINKS),
    ALLOW_GENERATING_TOKENS: toBool(process.env.ALLOW_GENERATING_TOKENS),
    GOOGLE_CLIENT_ID: process.env.CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.REFRESH_TOKEN,
    file_link_expiry: 7, // 7 days
    dlInfo,
    enable_cors_file_down : false
}
