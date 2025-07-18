export const isValidEnvironment = (env) => /^[a-z]+$/.test(env);

export const BASE = '/frontend-publish-management';

export const isValidFileExtension = (filename) => /\.tar(\.(gz|xz))?$/.test(filename);

export const fileAccept = '.tar, .tar.gz, .tar.xz';
