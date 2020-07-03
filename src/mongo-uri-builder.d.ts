declare module 'mongo-uri-builder' {
  interface BuilderOptions {
    username?: string,
    password?: string,
    host: string,
    port: number,
    database: string,
  }

  const builder: (options: BuilderOptions) => string;
  export default builder;
}
