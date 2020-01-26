declare module '*.json' {
    export const version: string
}
declare module 'mkdirp' {
  function mkdirp(dir: string): Promise<void>
  export = mkdirp
}
