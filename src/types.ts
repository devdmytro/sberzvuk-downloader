export enum SZStreamQuality {
    Mid = "mid",
    High = "high",
    Flac = "flac",
}

export interface SZTrack {
    id: number
    title: string
    artist_names: string[]
    release_title: string
    position: number
    genres: string[]
    image: { src: string }
    highest_quality: SZStreamQuality
}
