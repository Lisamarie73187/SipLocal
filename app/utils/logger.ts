type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function log(level: LogLevel, message: string, context?: unknown): void {
  if (import.meta.env.PROD) {
    return
  }

  const payload = context === undefined ? message : { message, context }

  switch (level) {
    case 'debug':
      console.debug(payload)
      break
    case 'info':
      console.info(payload)
      break
    case 'warn':
      console.warn(payload)
      break
    case 'error':
      console.error(payload)
      break
  }
}

export const logger = {
  debug: (message: string, context?: unknown): void => log('debug', message, context),
  info: (message: string, context?: unknown): void => log('info', message, context),
  warn: (message: string, context?: unknown): void => log('warn', message, context),
  error: (message: string, context?: unknown): void => log('error', message, context),
}
