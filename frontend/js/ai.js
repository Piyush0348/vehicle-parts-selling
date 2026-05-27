import API from "./api.js";

export default class AI {

    static async predict(mileage, year, serviceCount) {
        return await fetch(
            `${API.BASE}/ai/predict?mileage=${mileage}&year=${year}&serviceCount=${serviceCount}`
        ).then(res => res.json());
    }
}