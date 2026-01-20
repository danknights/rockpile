import { Network } from '@capacitor/network';
import { storage, STORAGE_KEYS } from './storage';
import { api } from './api';
import { queryClient } from '@/lib/query-client';

interface QueuedMutation {
    id: string;
    type: 'ADD_CLIMB' | 'UPLOAD_PHOTO' | 'UPDATE_COMMENT';
    payload: any;
    timestamp: number;
}

class SyncManager {
    private isOnline: boolean = true;
    private isSyncing: boolean = false;

    constructor() {
        this.init();
    }

    private async init() {
        if (typeof window === 'undefined') return;

        const status = await Network.getStatus();
        this.isOnline = status.connected;

        Network.addListener('networkStatusChange', (status) => {
            this.isOnline = status.connected;
            if (this.isOnline) {
                this.processQueue();
            }
        });

        // Initial check
        if (this.isOnline) {
            this.processQueue();
        }
    }

    async queueAction(type: QueuedMutation['type'], payload: any) {
        const mutation: QueuedMutation = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            payload,
            timestamp: Date.now(),
        };

        const queue = (await storage.get<QueuedMutation[]>(STORAGE_KEYS.OFFLINE_QUEUE)) || [];
        queue.push(mutation);
        await storage.set(STORAGE_KEYS.OFFLINE_QUEUE, queue);

        // If online, try to process immediately (background sync)
        if (this.isOnline) {
            this.processQueue();
        }
    }

    private async processQueue() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const queue = (await storage.get<QueuedMutation[]>(STORAGE_KEYS.OFFLINE_QUEUE)) || [];
            if (queue.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`SyncManager: Processing ${queue.length} items...`);

            const remainingQueue: QueuedMutation[] = [];

            for (const item of queue) {
                try {
                    await this.executeAction(item);
                } catch (error) {
                    console.error('SyncManager: Failed to process item', item, error);
                    // Keep in queue if it's a network error, otherwise maybe discard or move to "failed" list
                    // For now, simplistically keep it to retry
                    remainingQueue.push(item);
                }
            }

            await storage.set(STORAGE_KEYS.OFFLINE_QUEUE, remainingQueue);

            // Invalidate queries to refresh UI
            queryClient.invalidateQueries();

        } catch (err) {
            console.error('SyncManager: Error processing queue', err);
        } finally {
            this.isSyncing = false;
        }
    }

    private async executeAction(item: QueuedMutation) {
        switch (item.type) {
            case 'ADD_CLIMB':
                await api.addClimb(item.payload);
                break;
            case 'UPLOAD_PHOTO':
                await api.uploadPhoto(item.payload); // Payload needs to be handled carefully (serialization of Blob?)
                break;
            // Add other cases
        }
    }
}

export const syncManager = new SyncManager();
