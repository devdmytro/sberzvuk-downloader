import { existsSync, mkdirSync, promises } from "fs";
import { dirname, join } from "path";
import inquirer from "inquirer";
import { SZStreamQuality } from "./types";
import { DEFAULT_FOLDER } from "./const";

const { readFile, writeFile } = promises;

export interface IConfig {
    token: string
    threads: number
    quality: SZStreamQuality
    folder: string
    coverSize: string
}

export class ConfigManager {
    isLoaded = false;

    constructor(private file: string, private config: Partial<IConfig> = {} as IConfig) {
        try {
            mkdirSync(dirname(file), { recursive: true });
        } catch (e) {
            console.warn("Could not load config.");
        }

        setInterval(() => {
            void this.save();
        }, 1000);
    }

    async load() {
        const { file } = this;

        this.isLoaded = false;

        let config: IConfig;

        try {
            config = Object.assign({}, JSON.parse(await readFile(file, "utf8")), this.config);
        } catch (err) {
            config = {} as IConfig;
            if (!existsSync(file)) {
                writeFile(file, "{}", "utf8").catch(e => {
                    console.error("Missing permissions on the config file.", e);
                });
            } else {
                console.error("Config file could not be used, returning to default values...");
            }
        }

        if (typeof config.token !== "string" || !config.token.trim()) {
            const { token } = await inquirer.prompt<{ token: string }>([
                {
                    type: "input",
                    name: "token",
                    message: "SberZvuk token:",
                    validate: a => typeof a === "string" && !!a.trim(),
                },
            ]);
            config.token = token;
        }

        if (typeof config.folder !== "string" || !config.folder.trim())
            config.folder = DEFAULT_FOLDER;

        if (typeof config.quality !== "string" || !Object.values(SZStreamQuality).includes(config.quality)) {
            const { quality } = await inquirer.prompt<{ quality: SZStreamQuality }>([
                {

                    type: "list",
                    name: "quality",
                    message: "Select track quality:",
                    default: 1,
                    choices: [
                        { name: "MP3 128kbps", value: SZStreamQuality.Mid },
                        { name: "MP3 320kbps", value: SZStreamQuality.High },
                        { name: "FLAC", value: SZStreamQuality.Flac },
                    ],
                },
            ]);
            config.quality = quality;
        }

        if (typeof config.threads !== "number" || config.threads < 1)
            config.threads = 1;

        if (typeof config.coverSize !== "string" || !config.coverSize.trim())
            config.coverSize = "1024x1024";

        this.config = config;
        this.isLoaded = true;
    }

    get<T extends keyof IConfig>(id: T): Required<IConfig>[T] {
        const value = this.config[id];
        if (!value) {
            throw new Error("Couldn't get key " + id);
        }
        return value as Required<IConfig>[T];
    }

    set<T extends keyof IConfig>(id: T, value: IConfig[T]) {
        this.config[id] = value;
    }

    async save() {
        if (!this.isLoaded) return;

        try {
            await writeFile(join(this.file), JSON.stringify(this.config));
        } catch (e) {
            console.error(e);
        }
    }
}
