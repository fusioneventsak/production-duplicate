// src/components/collage/CollagePhotos.tsx
import React, { useEffect } from 'react';
import { useCollageStore } from '../../store/collageStore';
import PhotoUploader from './PhotoUploader'; // FIXED: Changed from named import to default import

interface CollagePhotosProps {
  collageId: string;
}

export const CollagePhotos: React.FC<CollagePhotosProps> = ({ collageId }) => {
  const { 
    photos, 
    loading, 
    error, 
    fetchPhotosByCollageId, 
    setupRealtimeSubscription,
    cleanupRealtimeSubscription,
    deletePhoto,
    isRealtimeConnected 
  } = useCollageStore();

  useEffect(() => {
    if (collageId) {
      // Fetch initial photos
      fetchPhotosByCollageId(collageId);

      // Setup real-time subscription for this collage
      setupRealtimeSubscription(collageId);

      // Cleanup subscription on unmount or collageId change
      return () => {
        cleanupRealtimeSubscription();
      };
    }
  }, [collageId, fetchPhotosByCollageId, setupRealtimeSubscription, cleanupRealtimeSubscription]);

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await deletePhoto(photoId);
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading photos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error loading photos: {error}</p>
        <button 
          onClick={() => fetchPhotosByCollageId(collageId)}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Photos ({photos.length})</h3>
        <div className="flex items-center space-x-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              isRealtimeConnected ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            title={isRealtimeConnected ? 'Real-time connected' : 'Using polling fallback'}
          />
          <span className="text-xs text-gray-500">
            {isRealtimeConnected ? 'Live' : 'Polling'}
          </span>
        </div>
      </div>

      {/* Photo Uploader */}
      <PhotoUploader collageId={collageId} />

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No photos uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.url}
                alt="Collage photo"
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};