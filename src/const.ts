import { resolve } from "path";

export const BASE_URL = "https://sber-zvuk.com";

export const TRACK_REGEX = /[/:]track[/:](.+)/;
export const RELEASE_REGEX = /[/:]release[/:](.+)/;
export const PLAYLIST_REGEX = /[/:]playlist[/:](.+)/;

export const DEFAULT_FOLDER = resolve(`${__dirname}/../Downloads`);
