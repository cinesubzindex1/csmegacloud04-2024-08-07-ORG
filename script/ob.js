var JavaScriptObfuscator = require('javascript-obfuscator');
function obCode(code) {
    var obfuscationResult = JavaScriptObfuscator.obfuscate(code,{
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 1,
        debugProtection: false,
        debugProtectionInterval: 2000,
        disableConsoleOutput: false,
        domainLock: [],
        domainLockRedirectUrl: 'about:blank',
        forceTransformStrings: [],
        identifierNamesCache: null,
        identifierNamesGenerator: 'hexadecimal',
        identifiersDictionary: [],
        identifiersPrefix: '',
        ignoreImports: false,
        inputFileName: '',
        log: false,
        numbersToExpressions: false,
        optionsPreset: 'default',
        renameGlobals: false,
        renameProperties: false,
        renamePropertiesMode: 'safe',
        reservedNames: [],
        reservedStrings: [],
        seed: 0,
        selfDefending: false,
        simplify: true,
        sourceMap: false,
        sourceMapBaseUrl: '',
        sourceMapFileName: '',
        sourceMapMode: 'separate',
        sourceMapSourcesMode: 'sources-content',
        splitStrings: true,
        splitStringsChunkLength: 4,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.5,
        stringArrayEncoding: [],
        stringArrayIndexesType: [
            'hexadecimal-number'
        ],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        target: 'browser',
        transformObjectKeys: false,
        unicodeEscapeSequence: false
    }
    );
    return Buffer.from('Ly9hdXRvIEdlbmVyYXRlZCAoZ2l0aHViOnJhdmluZHUwMW1hbm9qKQo=','base64').toString('utf-8') + obfuscationResult.getObfuscatedCode();
}

module.exports = { obCode }