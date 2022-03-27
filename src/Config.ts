import { existsSync, mkdirSync, promises } from "fs";
import { dirname, join } from "path";
import inquirer from "inquirer";
import { SZStreamQuality } from "./types";

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

    private config = {} as IConfig;

    constructor(private file: string) {
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

        let config = {} as IConfig;

        try {
            config = JSON.parse(await readFile(file, "utf8"));
        } catch (err) {
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
            config.folder = `${__dirname}/Downloads`;

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

    get<T extends keyof IConfig>(id: T): IConfig[T] {
        return this.config[id];
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
