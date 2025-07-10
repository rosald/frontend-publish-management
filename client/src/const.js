export const BASE = '/frontend-publish-management';

export const isValidEnvironment = (env) => /^[a-z]+$/.test(env);

export const fileAccept = '.tar, .tar.gz, .tar.xz';

export const isValidFileExtension = (filename) => /\.tar(\.(gz|xz))?$/.test(filename);
