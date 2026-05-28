import API from "./api.js";

export default class AI {

    static async predict(mileage, year, lastServiceMonths, engineHealth, batteryHealth) {
        const params = new URLSearchParams({
            mileage,
            year,
            lastServiceMonths,
            engineHealth,
            batteryHealth
        });

        return await fetch(`${API.BASE}/ai/predict?${params.toString()}`)
            .then(res => res.json());
    }
}