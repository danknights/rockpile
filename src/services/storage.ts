import { get, set, del, keys } from 'idb-keyval';

export const storage = {
    get: async <T>(key: string): Promise<T | undefined> => {
        return await get<T>(key);
    },

    set: async <T>(key: string, value: T): Promise<void> => {
        await set(key, value);
    },

    remove: async (key: string): Promise<void> => {
        await del(key);
    },

    getAllKeys: async (): Promise<IDBValidKey[]> => {
        return await keys();
    }
};

export const STORAGE_KEYS = {
    OFFLINE_QUEUE: 'offline-queue',
    APP_CACHE: 'app-cache',
    USER_SETTINGS: 'user-settings',
    DOWNLOADED_AREAS: 'downloaded-areas',
};
