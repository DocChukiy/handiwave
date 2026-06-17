const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'development'

function noop() {}

const logger = {
  debug: isDev ? (...args) => console.debug(...args) : noop,
  info: isDev ? (...args) => console.info(...args) : noop,
  warn: isDev ? (...args) => console.warn(...args) : noop,
  error: (...args) => console.error(...args), // always log errors
}

export default logger
