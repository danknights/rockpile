import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Feature, Photo } from '@/lib/types';
import { syncManager } from '@/services/sync-manager';

export function useFeature(featureId: string, initialData?: Feature) {
    const queryClient = useQueryClient();

    const { data: feature } = useQuery({
        queryKey: ['feature', featureId],
        initialData: initialData,
        // If we have data in the cache, trust it over the "initialData" passed from the map
        // (which is just raw vector tile data)
        initialDataUpdatedAt: initialData ? Date.now() : undefined,
        staleTime: Infinity, // Treat local data as always fresh for now
        gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
    });

    const addPhotoMutation = useMutation({
        mutationFn: async (photo: Photo) => {
            // In a real app, this would upload to server.
            // Here we just queue it.
            await syncManager.queueAction('UPLOAD_PHOTO', { featureId, photo });
            return photo;
        },
        onMutate: async (newPhoto) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['feature', featureId] });

            // Snapshot the previous value
            const previousFeature = queryClient.getQueryData<Feature>(['feature', featureId]);

            // Optimistically update to the new value
            if (previousFeature) {
                queryClient.setQueryData<Feature>(['feature', featureId], {
                    ...previousFeature,
                    photos: [...previousFeature.photos, newPhoto],
                    hasLocalEdits: true,
                });
            }

            return { previousFeature };
        },
        onError: (err, newPhoto, context) => {
            if (context?.previousFeature) {
                queryClient.setQueryData(['feature', featureId], context.previousFeature);
            }
        },
        onSettled: () => {
            // queryClient.invalidateQueries({ queryKey: ['feature', featureId] });
        },
    });

    const updateFeature = (updates: Partial<Feature>) => {
        queryClient.setQueryData<Feature>(['feature', featureId], (old) => {
            if (!old) return undefined;
            return { ...old, ...updates, hasLocalEdits: true };
        });
    };

    return {
        feature,
        addPhoto: addPhotoMutation.mutate,
        updateFeature,
    };
}
