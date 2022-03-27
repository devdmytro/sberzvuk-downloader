import axios from "axios";
import { ConfigManager } from "./Config";
import { BASE_URL } from "./const";

export class Api {
    api = axios.create({ baseURL: BASE_URL });

    constructor(
        config: ConfigManager,
    ) {
        this.api.interceptors.request.use(c => {
            const token = config.get("token");
            return { ...c, headers: { ...c.headers, "x-auth-token": token } };
        // @ts-ignore
        }, undefined, { synchronous: true });
    }

    get = this.api.get;

    post = this.api.post;

    patch = this.api.patch;

    delete = this.api.delete;
}
