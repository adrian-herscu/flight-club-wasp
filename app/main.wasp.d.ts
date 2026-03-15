declare module 'wasp-config' {
  export class App {
    constructor(name: string, options: unknown)
    auth(config: unknown): void
    emailSender(config: unknown): void
    db(config: unknown): void
    client(config: unknown): void
    page(name: string, config: unknown): unknown
    route(name: string, config: unknown): void
    query(name: string, config: unknown): void
    action(name: string, config: unknown): void
    api(name: string, config: unknown): void
    middleware(config: unknown): void
    job(name: string, config: unknown): void
  }
}
