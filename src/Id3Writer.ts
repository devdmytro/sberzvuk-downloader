import { readFileSync } from "fs";
import id3 from "node-id3";
import { Writer } from "./Writer";
import { SZTrack } from "./types";

export class Id3Writer implements Writer {
    write(path: string, track: SZTrack, coverPath: string) {
        return new Promise<void>(resolve => {
            const id3data = {
                title: track.title,
                artist: track.artist_names.join(", "),
                album: track.release_title,
                trackNumber: track.position.toString(),
                genre: track.genres.join(", "),
                image: {
                    mime: "image/jpeg",
                    type: {
                        id: 3,
                        name: "front cover",
                    },
                    description: "cover",
                    imageBuffer: readFileSync(coverPath),
                },
            };
            id3.write(id3data, path, () => resolve());
        });
    }
}
