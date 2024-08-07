const debug = process.env.DEBUG == 'true'
module.exports = function log(...args) {
    if(debug) console.log(...args)
}