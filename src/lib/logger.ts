// Namespaced console logger; gate debug/info with a module-local `DEV &&` for prod stripping.
export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;
  return {
    debug: console.debug.bind(console, prefix),
    info: console.info.bind(console, prefix),
    warn: console.warn.bind(console, prefix),
    error: console.error.bind(console, prefix),
  };
}
