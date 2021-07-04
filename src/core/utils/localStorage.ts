import {MapOptions} from "../store/types/mapOptions";
import {AppStoreEntries} from "../store/types/appStore";

export class LocalStorage {
    private constructor() {}

    static getMapOptions(): MapOptions | null {
        const optionsString = localStorage.getItem(AppStoreEntries.mapOptions.toString());
        if (optionsString === null) {
            return null;
        }
        return JSON.parse(optionsString);
    }

    static setMapOptions(options: MapOptions) {
        localStorage.setItem(AppStoreEntries.mapOptions.toString(), JSON.stringify(options));
    }
}
