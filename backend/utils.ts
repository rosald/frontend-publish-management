export const isValidEnvironment = (env: string) => /^[a-z]+$/.test(env);

export const BASE = '/frontend-publish-management';

export const isValidFileExtension = (filename: string) => /\.tar(\.(gz|xz))?$/.test(filename);
