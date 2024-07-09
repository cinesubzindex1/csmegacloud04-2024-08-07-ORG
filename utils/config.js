function toBool(item, val = 'true') {
    return !(!item || item.toLowerCase() != val)
}

function generateKey(key) {
    return !key ? "google-drive-dls" : key.length < 16 ? key.padEnd(16, "0") : key.length > 16 ? key.slice(0, 16) : key;
}

//cs.download.csdl info
const dlInfo = {
    main:[ `Google Downlaod ක්ලික් කල විට නැවත Download Anyway ලෙස පැමිණෙන අතර එක ක්ලික් කිවීමෙන් අනතුරුව ඩවුන්ලෝඩ් වේ`,        
`කිසියම් Server එකක ගැටළු ඇත්නම් වෙනත් Server එකක් උත්සහ කරන්න.`,
`Server 2  ම ඩවුන්ලෝඩ් ගැටළු ඇත්නම් පහත ලින්ක් එක ඔස්සේ අපව සම්බන්ධ කරගන්න.`],
    help: 'https://t.me/CineSubzAdmin',
    support: 'https://cinesubz.co'
}

const timer = {
    active : false,
    time : 2 // seconds
}

const downloadServers = [
    "c11.csheroku01.workers.dev",
    "c11.csheroku01.workers.dev",
    "c11.csheroku01.workers.dev",
]

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
    timer,
    downloadServers,
    enable_cors_file_down : false,
    apiConfig: {
        rootFolder: "2bb64ff4bcc37803e3d14d2e6e376e68b4f37002d058bc961b4985049522ec1496bcd52ea06cc786361ecc38b0af2ff5",
        isTeamDrive: true,
        sharedDrive: "ee987853d30206571dcc5c330227c0a1e977e7be7d6bbd1d7d5c6978d6795a91"
      },
}
