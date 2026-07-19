const DEFAULT_PORT = 3000;

export function getRuntimeConfig(environment = process.env) {
  const parsedPort = Number.parseInt(environment.PORT ?? `${DEFAULT_PORT}`, 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return {
    host: environment.HOST ?? '127.0.0.1',
    port: parsedPort,
    nodeEnv: environment.NODE_ENV ?? 'development',
    secureCookies: environment.DDAUTO_SECURE_COOKIES === 'true',
  };
}
