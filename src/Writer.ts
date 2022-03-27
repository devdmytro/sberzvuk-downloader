import { SZTrack } from "./types";

export interface Writer {
    write(path: string, track: SZTrack, coverPath: string): void
}
