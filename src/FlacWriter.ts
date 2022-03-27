/* eslint-disable @typescript-eslint/no-explicit-any */
import { createWriteStream, readFileSync } from "fs";
import { PassThrough } from "stream";
import * as flacMetadata from "flac-metadata";
import { SZTrack } from "./types";
import { Writer } from "./Writer";

export class FlacWriter implements Writer {
    write(path: string, track: SZTrack, coverPath: string) {
        return new Promise<void>(resolve => {
            const flacComments = [
                "SOURCE=sberzvuk-downloader",
                "SOURCEID=" + track.id,
            ];

            if (track.title !== "") {
                flacComments.push("TITLE=" + track.title);
            }

            if (track.release_title !== "") {
                flacComments.push("ALBUM=" + track.release_title);
            }

            if (track.genres.length) {
                flacComments.push("GENRE=" + track.genres.join(", "));
            }

            /* if (trackMetadata.albumArtist !== "") {
                flacComments.push("ALBUMARTIST=" + trackMetadata.albumArtist);
            } */

            if (track.artist_names.length > 0) {
                flacComments.push("ARTIST=" + track.artist_names.join(", "));
            }

            if (track.position) {
                flacComments.push("TRACKNUMBER=" + track.position);
            }

            /* if (trackMetadata.tracktotal !== "") {
                flacComments.push("TRACKTOTAL=" + trackMetadata.tracktotal);
                flacComments.push("TOTALTRACKS=" + trackMetadata.tracktotal);
            } */

            /* if (trackMetadata.partOfSet !== "") {
                flacComments.push("DISCNUMBER=" + trackMetadata.partOfSet);
            } */

            /* if (trackMetadata.disctotal !== "") {
                flacComments.push("DISCTOTAL=" + trackMetadata.disctotal);
                flacComments.push("TOTALDISCS=" + trackMetadata.disctotal);
            } */

            /* if (trackMetadata.label !== "") {
                flacComments.push("LABEL=" + trackMetadata.label);
            }

            if (trackMetadata.copyright !== "") {
                flacComments.push("COPYRIGHT=" + trackMetadata.copyright);
            }

            if (trackMetadata.duration !== "") {
                flacComments.push("LENGTH=" + trackMetadata.duration);
            }

            if (trackMetadata.ISRC !== "") {
                flacComments.push("ISRC=" + trackMetadata.ISRC);
            }

            if (trackMetadata.upc !== "") {
                flacComments.push("BARCODE=" + trackMetadata.upc);
            }

            if (trackMetadata.media !== "") {
                flacComments.push("MEDIA=" + trackMetadata.media);
            }

            if (trackMetadata.compilation !== "") {
                flacComments.push("COMPILATION=" + trackMetadata.compilation);
            }

            if (trackMetadata.explicit !== "") {
                flacComments.push("EXPLICIT=" + trackMetadata.explicit);
            }

            if (trackMetadata.releaseType) {
                flacComments.push("RELEASETYPE=" + trackMetadata.releaseType);
            } */

            track.artist_names.forEach(artist => {
                flacComments.push("ARTISTS=" + artist);
            });
            /*
            trackMetadata.composer.forEach(composer => {
                flacComments.push("COMPOSER=" + composer);
            });

            trackMetadata.publisher.forEach(publisher => {
                flacComments.push("ORGANIZATION=" + publisher);
            });

            trackMetadata.producer.forEach(producer => {
                flacComments.push("PRODUCER=" + producer);
            });

            trackMetadata.engineer.forEach(engineer => {
                flacComments.push("ENGINEER=" + engineer);
            });

            trackMetadata.writer.forEach(writer => {
                flacComments.push("WRITER=" + writer);
            });

            trackMetadata.author.forEach(author => {
                flacComments.push("AUTHOR=" + author);
            });

            trackMetadata.mixer.forEach(mixer => {
                flacComments.push("MIXER=" + mixer);
            }); */

            /* if (trackMetadata.unsynchronisedLyrics) {
                flacComments.push("LYRICS=" + trackMetadata.unsynchronisedLyrics);
            } */

            /* if (parseInt(trackMetadata.releaseYear) > 0) {
                flacComments.push("YEAR=" + trackMetadata.releaseYear);
            }

            if (parseInt(trackMetadata.releaseDate) > 0) {
                flacComments.push("DATE=" + trackMetadata.releaseDate);
            }

            if (parseInt(trackMetadata.bpm) > 0) {
                flacComments.push("BPM=" + trackMetadata.bpm);
            } */

            const reader = new PassThrough();
            reader.end(readFileSync(path));

            const writer = createWriteStream(path);
            const processor = new flacMetadata.Processor({ parseMetaDataBlocks: true });
            let vendor = "reference libFLAC 1.2.1 20070917";
            const coverBuffer = readFileSync(coverPath);

            let mdbVorbisComment: any;
            let mdbVorbisPicture: any;

            processor.on("preprocess", (mdb: any) => {
                console.log("preprocess");
                // Remove existing VORBIS_COMMENT and PICTURE blocks, if any.
                if (flacMetadata.Processor.MDB_TYPE_VORBIS_COMMENT === mdb.type) {
                    mdb.remove();
                } else if (coverBuffer && flacMetadata.Processor.MDB_TYPE_PICTURE === mdb.type) {
                    mdb.remove();
                }

                if (mdb.isLast) {
                    mdbVorbisComment = flacMetadata.data.MetaDataBlockVorbisComment.create(!coverBuffer, vendor, flacComments);

                    if (coverBuffer) {
                        mdbVorbisPicture = flacMetadata.data.MetaDataBlockPicture.create(true, 3, "image/jpeg", "", 1400, 1400, 24, 0, coverBuffer);
                    }

                    mdb.isLast = false;
                }
            });

            processor.on("postprocess", (mdb: any) => {
                console.log("postprocess");
                if (flacMetadata.Processor.MDB_TYPE_VORBIS_COMMENT === mdb.type && mdb.vendor !== null) {
                    vendor = mdb.vendor;
                }

                if (mdbVorbisComment) {
                    processor.push(mdbVorbisComment.publish());
                }

                if (mdbVorbisPicture) {
                    processor.push(mdbVorbisPicture.publish());
                }
            });

            processor.on("end", () => {
                resolve();
            });

            reader.pipe(processor).pipe(writer);
        });

    }
}
