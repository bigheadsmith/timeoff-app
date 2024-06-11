const config = require('../config')

const defaultLocale = config.get('options:localecode') || 'en'

/**
 * Local aware comparator to be used as compare function for Array's `sort` function
 */
const sorter = (a, b) => String(a).localeCompare(String(b), defaultLocale)

module.exports = {
  sorter
}
