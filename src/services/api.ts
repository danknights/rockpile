import { Feature } from '@/lib/types';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock API Error
class ApiError extends Error {
    constructor(public message: string, public status: number) {
        super(message);
    }
}

export const api = {
    // CLIMBS
    getClimbs: async (): Promise<any[]> => {
        await delay(500);
        // Return empty array or mock data
        return [];
    },

    addClimb: async (climb: any): Promise<any> => {
        await delay(1000);
        // Simulate randomness or success
        console.log('API: Added climb', climb);
        return { ...climb, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
    },

    // PHOTOS
    uploadPhoto: async (photoData: Blob): Promise<string> => {
        await delay(2000);
        console.log('API: Uploaded photo');
        return `https://fake-url.com/photos/${Math.random().toString(36).substr(2, 9)}.jpg`;
    },

    // USER SETTINGS (Critical)
    updateSettings: async (settings: any): Promise<any> => {
        await delay(800);
        console.log('API: Updated settings', settings);
        return settings;
    },

    // DOWNLOADED AREAS
    downloadArea: async (areaId: string): Promise<any> => {
        await delay(3000);
        console.log('API: Downloaded area', areaId);
        return { id: areaId, data: 'mock-tile-data' };
    }
};
