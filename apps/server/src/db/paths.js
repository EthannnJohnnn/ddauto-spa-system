import path from 'node:path';

export function getDataDirectory(environment = process.env) {
  if (environment.DDAUTO_DATA_DIR) {
    return path.resolve(environment.DDAUTO_DATA_DIR);
  }

  const localAppData = environment.LOCALAPPDATA ?? environment.APPDATA;

  if (!localAppData) {
    throw new Error('LOCALAPPDATA is unavailable. Set DDAUTO_DATA_DIR to a writable folder.');
  }

  return path.join(localAppData, 'DD Auto Spa', 'data');
}

export function getDatabasePath(environment = process.env) {
  return path.join(getDataDirectory(environment), 'ddauto-spa.db');
}
