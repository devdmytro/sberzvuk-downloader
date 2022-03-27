import { createWriteStream, existsSync, ReadStream } from "fs";
import { mkdir } from "fs/promises";
import { resolve } from "path";
import ProgressBar from "progress";
import { Api } from "./api";
import { ConfigManager } from "./Config";
import { PLAYLIST_REGEX, RELEASE_REGEX, TRACK_REGEX } from "./const";
import { FlacWriter } from "./FlacWriter";
import { Id3Writer } from "./Id3Writer";
import { SZTrack } from "./types";

export type ParsedLink = [string, string | undefined, string | undefined];

export class Downloader {
    constructor(
        private api: Api,
        private config: ConfigManager,
    ) { }

    id3 = new Id3Writer();

    flac = new FlacWriter();

    downloadQuery: SZTrack[] = [];

    count = 0;

    search = async (parsedLink: ParsedLink) => {
        if (!parsedLink[1] || !parsedLink[2]) {
            throw new Error("Bad link.");
        }
        const threads = this.config.get("threads");
        const response = await this.api.get("/sapi/meta", { params: { [parsedLink[1]]: parsedLink[2], include: "(track (release label) artist)" } });
        if (parsedLink[1] === "releases" && response.data.result.releases[parsedLink[2]]) {
            const tracks = (await this.api.get("/sapi/meta", { params: { tracks: response.data.result.releases[parsedLink[2]].track_ids.join(","), include: "(track (release label) artist)" } }))
                .data.result.tracks as Record<string, SZTrack>;
            for (const track of Object.values(tracks)) {
                this.downloadQuery.push(track);
                this.count = this.downloadQuery.length;
            }
        } else if (parsedLink[1] === "playlists" && response.data.result.playlists[parsedLink[2]]) {
            const tracks = (await this.api.get("/sapi/meta", { params: { tracks: response.data.result.playlists[parsedLink[2]].track_ids.join(","), include: "(track (release label) artist)" } }))
                .data.result.tracks as Record<string, SZTrack>;
            for (const track of Object.values(tracks)) {
                this.downloadQuery.push(track);
                this.count = this.downloadQuery.length;
            }
        } else if (response.data.result.tracks[parsedLink[2]])
            this.downloadQuery.push(response.data.result.tracks[parsedLink[2]]);
        else {
            console.log("Track not found.");
            return;
        }
        if (parsedLink[1] !== "tracks") {
            for (let i = 0; i < threads && this.downloadQuery.length; i++)
                await this.download(
                    parsedLink[1],
                    parsedLink[1] === "playlists"
                        ? response.data.result.playlists[parsedLink[2]].title
                        : response.data.result.releases[parsedLink[2]].artist_names[0],
                );
        } else await this.download(parsedLink[1]);
    };
    //

    // Download track
    download = async (type: string, title?: string) => { // type отвечает за тип ссылки, title - для альбомов это первый артист, для плейличтов название
        const track = this.downloadQuery.shift();
        if (!track) {
            return process.exit(0);
        }

        const quality = this.config.get("quality");
        const folder = this.config.get("folder");

        // Check dir
        let downloadPath = folder;
        if (type === "tracks") { // Для треков и плейлистов каждый раз нужно качать обложку, ибо она может различаться
            await mkdir(`${folder}/${track.artist_names[0]}`, { recursive: true });
            downloadPath = `${folder}/${track.artist_names[0]}`;
            await this.downloadCover(track.image.src, downloadPath, type, track.title);

        }
        if (type === "releases") { // При первом создании альбомных папок можно наверн сразу качать обложку
            await mkdir(`${folder}/${title}/${track.release_title}`, { recursive: true });
            downloadPath = `${folder}/${title}/${track.release_title}`;
            if (!existsSync(`${downloadPath}/cover.jpg`))
                await this.downloadCover(track.image.src, downloadPath, type);
        }

        if (type === "playlists") {
            await mkdir(`${folder}/${title}`, { recursive: true });
            downloadPath = `${folder}/${title}`;
            await this.downloadCover(track.image.src, downloadPath, type, track.title);
        }
        //

        // Get stream url
        const streamUrl = (await this.api.get("/api/tiny/track/stream", { params: { id: track.id, quality: track.highest_quality === "flac" ? quality : track.highest_quality !== quality && track.highest_quality === "mid" ? "mid" : "high" } }));
        if (!streamUrl) return;
        const { data, headers } = await this.api.get<ReadStream>(streamUrl.data.result.stream, { responseType: "stream" });

        const totalLength = headers["content-length"];
        if (this.config.get("threads") === 1) { // надо перепилить
            process.stdout.moveCursor(0, -1);
            process.stdout.clearLine(1);
        }
        const extension = streamUrl.data.result.stream.includes("streamfl") ? "flac" : "mp3";
        const path = `${downloadPath}/${type === "tracks" ? "" : track.position < 10 ? "0" + track.position + ". " : track.position + ". "}${track.artist_names[0]} - ${track.title}.${extension}`;
        const progressBar = new ProgressBar(`${type !== "tracks" ? `[${this.count - this.downloadQuery.length}/${this.count}]` : ""} ${track.artist_names[0]} - ${track.title} -> downloading [:bar] :percent :etas`, {
            width: 20,
            complete: "=",
            incomplete: " ",
            renderThrottle: 0,
            total: parseInt(totalLength),
        });

        const writer = createWriteStream(path);
        data.on("data", chunk => progressBar.tick(chunk.length));
        data.on("end", () => {
            const coverPath = resolve(`${downloadPath}/${type !== "releases" ? track.title : "cover"}.jpg`);
            switch (extension) {
                case "flac":
                    this.flac.write(path, track, coverPath).then(() => this.download(type, title))
                        .catch(() => null);
                    break;
                case "mp3":
                    this.id3.write(path, track, coverPath).then(() => this.download(type, title))
                        .catch(() => null);
                    break;
            }
        });
        data.pipe(writer);
    };

    // Parse link
    parseLink = (inputLink: string): ParsedLink => {
        let link = inputLink;
        if (link.includes("?")) link = link.slice(0, link.indexOf("?"));
        if (link.includes("&")) link = link.slice(0, link.indexOf("&"));
        if (link.endsWith("/")) link = link.slice(0, -1);

        if (!link.includes("sber-zvuk.com"))
            return [link, undefined, undefined];

        if (link.search(TRACK_REGEX) !== -1)
            return [link, "tracks", TRACK_REGEX.exec(link)?.[1]];

        if (link.search(RELEASE_REGEX) !== -1)
            return [link, "releases", RELEASE_REGEX.exec(link)?.[1]];

        if (link.search(PLAYLIST_REGEX) !== -1)
            return [link, "playlists", PLAYLIST_REGEX.exec(link)?.[1]];

        return [link, undefined, undefined];
    };

    downloadCover = async (url: string, path: string, type: string, name?: string) => {
        const { data } = await this.api.get(url.replace("{size}", this.config.get("coverSize")), { responseType: "stream" });
        const writer = createWriteStream(`${path}/${type !== "releases" ? `${name}.jpg` : "cover.jpg"}`);
        data.pipe(writer);
    };
}
