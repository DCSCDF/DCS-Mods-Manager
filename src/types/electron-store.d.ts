import Store from 'electron-store'

export interface AppConfig {
  dcsPath: string
}

declare module 'electron-store' {
  interface Store<T extends Record<string, unknown> = Record<string, unknown>> {
    get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K]
    set(key: K, value: T[K]): void
  }
}