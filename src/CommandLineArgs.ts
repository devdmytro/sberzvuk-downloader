import commandLineArgs from "command-line-args";
import commandLineUsage, { Section, OptionDefinition } from "command-line-usage";
import { IConfig } from "./Config";
import { DEFAULT_FOLDER } from "./const";

const cliArgsDefinitions: OptionDefinition[] = [
    { name: "help", alias: "h", type: Boolean, description: "Print this usage guide" },
    { name: "token", alias: "t", type: String, description: "Token for SberZvuk (x-auth-token header) (required)" },
    { name: "quality", alias: "q", type: String, description: "Audio quality (mid, high, flac) (required)" },
    { name: "path", alias: "p", type: String, description: `Download folder path\r\n(default: ${DEFAULT_FOLDER})` },
    { name: "threads", type: Number, description: "Number of simultaneous downloads (default: 1)" },
    { name: "cover-size", type: String, description: "Cover size (default: 1024x1024)" },
];

const cliArgsSections: Section[] = [
    {
        header: "A downloader utility for SberZvuk.",
        content: "Downloads a music track/artist/album from a provided URL.",
    },
    {
        header: "Options",
        optionList: cliArgsDefinitions,
    },
];

export interface CommandLineArgs extends Partial<IConfig> {
    urls?: string[]
}

export class CommandLineArgsManager {
    constructor() {
        this.load();
    }

    private args: CommandLineArgs = {};

    load = () => {
        const parsed = commandLineArgs(cliArgsDefinitions, { stopAtFirstUnknown: false, partial: true });
        const { _unknown: urls, ...args } = parsed;
        this.args = { urls };
        if ("help" in args) {
            console.log(commandLineUsage(cliArgsSections));
            return process.exit(0);
        }
        if ("cover-size" in args) this.args.coverSize = args["cover-size"];
        if ("token" in args) this.args.token = args.token;
        if ("quality" in args) this.args.quality = args.quality;
        if ("folder" in args) this.args.folder = args.folder;
        if ("threads" in args) this.args.folder = args.threads;
    };

    getArgs() {
        return this.args;
    }

    get<T extends keyof CommandLineArgs>(id: T): CommandLineArgs[T] {
        return this.args[id];
    }

    set<T extends keyof CommandLineArgs>(id: T, value: CommandLineArgs[T]) {
        this.args[id] = value;
    }
}
