declare module 'mongo-uri-builder' {
  interface BuilderOptions {
    username?: string,
    password?: string,
    host: string,
    port: number,
    database: string,
    options?: Record<string, any>,
  }

  const builder: (options: BuilderOptions) => string;
  export default builder;
}
