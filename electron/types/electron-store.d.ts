import type Store from 'electron-store'

declare module 'electron-store' {
  interface ElectronStore<T = Record<string, unknown>> {
    get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K]
    set(key: string, value: unknown): void
  }
}

export {}