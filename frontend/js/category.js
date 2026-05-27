import API from "./api.js";

export default class Category {

    static async getAll() {
        return await API.get("/categories");
    }

    static async create(name) {
        return await API.post("/categories", { name });
    }
}