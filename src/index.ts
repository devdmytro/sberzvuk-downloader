#! /usr/bin/node
import inquirer from "inquirer";
import { CommandLineArgsManager } from "./CommandLineArgs";
import { Api } from "./api";
import { ConfigManager } from "./Config";
import { Downloader } from "./Downloader";

const { SZ_CONFIG_PATH = `${__dirname}/../config.json` } = process.env;

export const args = new CommandLineArgsManager();
const { urls, ...cliConfig } = args.getArgs();

export const config = new ConfigManager(SZ_CONFIG_PATH, cliConfig);
export const api = new Api(config);

export const downloader = new Downloader(api, config);

(async () => {
    await config.load();

    if (urls?.length) {
        for (const url of urls)
            await downloader.search(downloader.parseLink(url));
        return process.exit(0);
    }

    const { url } = await inquirer.prompt<{ url: string }>(
        [
            {
                type: "input",
                name: "url",
                message: "Enter link to track/album/playlist:",
                validate(input) {
                    const parsedURL = downloader.parseLink(input);
                    return !!parsedURL[1] && !!parsedURL[2];
                },
            },
        ],
    );
    const parsedURL = downloader.parseLink(url);

    await downloader.search(parsedURL);
})();
