#! /usr/bin/node
import inquirer from "inquirer";
import { Api } from "./api";
import { ConfigManager } from "./Config";
import { Downloader } from "./Downloader";

const { SZ_CONFIG_PATH = `${__dirname}/../config.json` } = process.env;

export const config = new ConfigManager(SZ_CONFIG_PATH);
export const api = new Api(config);

export const downloader = new Downloader(api, config);

(async () => {
    await config.load();

    const { link } = await inquirer.prompt<{ link: string }>(
        [
            {
                type: "input",
                name: "link",
                message: "Enter link to track/album/playlist:",
                validate(input) {
                    const parsedLink = downloader.parseLink(input);
                    return !!parsedLink[1] && !!parsedLink[2];
                },
            },
        ],
    );
    const parsedLink = downloader.parseLink(link);

    await downloader.search(parsedLink);
})();
