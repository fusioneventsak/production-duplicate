// src/pages/CollageViewerPage.tsx - Clean version with transparent header
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Share2, Upload, Edit, Maximize2, ChevronLeft, Camera } from 'lucide-react';
import { useCollageStore } from '../store/collageStore';
import { ErrorBoundary } from 'react-error-boundary';
import CollageScene from '../components/three/CollageScene';
import PhotoUploader from '../components/collage/PhotoUploader';

// Error fallback component for 3D scene errors
function SceneErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="bg-red-900/30 backdrop-blur-sm rounded-lg border border-red-500/50 p-6 flex flex-col items-center justify-center h-[calc(100vh-200px)]">
      <h3 className="text-xl font-bold text-white mb-2">Something went wrong rendering the scene</h3>
      <p className="text-red-200 mb-4 text-center max-w-md">
        There was an error loading the 3D scene. This could be due to WebGL issues or resource limitations.
      </p>
      <pre className="bg-black/50 p-3 rounded text-red-300 text-xs max-w-full overflow-auto mb-4 max-h-32">
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

const CollageViewerPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { 
    currentCollage, 
    photos, 
    fetchCollageByCode, 
    loading, 
    error, 
    isRealtimeConnected,
    refreshPhotos,
    cleanupRealtimeSubscription
  } = useCollageStore();
  
  // SAFETY: Ensure photos is always an array
  const safePhotos = Array.isArray(photos) ? photos : [];
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const navigate = useNavigate();

  // Normalize code to uppercase for consistent database lookup
  const normalizedCode = code?.toUpperCase();

  // Load collage on mount
  useEffect(() => {
    if (normalizedCode) {
      console.log('🔍 Fetching collage with code:', normalizedCode);
      fetchCollageByCode(normalizedCode);
    }
    
    return () => {
      console.log('🧹 Cleaning up realtime subscription');
      cleanupRealtimeSubscription();
    };
  }, [normalizedCode, fetchCollageByCode, cleanupRealtimeSubscription]);

  // Manual refresh for debugging
  const handleManualRefresh = useCallback(async () => {
    if (currentCollage?.id) {
      console.log('🔄 Manual refresh triggered');
      await refreshPhotos(currentCollage.id);
    }
  }, [currentCollage?.id, refreshPhotos]);

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setTimeout(() => setControlsVisible(false), 3000);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        setControlsVisible(true);
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  // Show/hide controls in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      const showControls = () => {
        setControlsVisible(true);
        setTimeout(() => setControlsVisible(false), 3000);
      };

      const handleMouseMove = () => showControls();
      const handleKeyPress = () => showControls();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('keydown', handleKeyPress);
      document.addEventListener('click', handleMouseMove);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('keydown', handleKeyPress);
        document.removeEventListener('click', handleMouseMove);
      };
    }
  }, [isFullscreen]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !currentCollage) {
    return (
      <div className="min-h-screen bg-black">
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2 text-gray-400">Loading collage...</p>
            <p className="text-gray-500 text-sm mt-1">
              Looking for: {normalizedCode}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentCollage) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Collage Not Found</h2>
            <p className="text-gray-400 mb-6">
              {error || `The collage "${normalizedCode}" doesn't exist or might have been removed.`}
            </p>
            <div className="space-x-4">
              <Link
                to="/join"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                Try Another Code
              </Link>
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 hover:text-white hover:border-gray-500"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Main 3D Scene */}
      <ErrorBoundary 
        FallbackComponent={SceneErrorFallback}
        resetKeys={[currentCollage.id, safePhotos.length]}
      >
        <CollageScene 
          photos={safePhotos}
          settings={currentCollage.settings}
          onSettingsChange={(newSettings) => {
            console.log('🎛️ Settings changed from viewer:', newSettings);
          }}
        />
      </ErrorBoundary>

      {/* Transparent Header - Only shown when controls are visible */}
      {controlsVisible && (
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="bg-black/40 backdrop-blur-sm border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Left side - Navigation & Title */}
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/join" 
                    className="text-gray-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                  <div>
                    <h1 className="text-lg font-semibold text-white">
                      {currentCollage.name}
                    </h1>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>Code: {currentCollage.code}</span>
                      <span>•</span>
                      <span>{safePhotos.length} photos</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                        <span>{isRealtimeConnected ? 'Live' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Actions */}
                <div className="flex items-center space-x-2">
                  {/* Photobooth Link */}
                  <Link
                    to={`/photobooth/${currentCollage.code}`}
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-purple-600/80 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors backdrop-blur-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Photobooth</span>
                  </Link>

                  {/* Upload Photos */}
                  <button
                    onClick={() => setShowUploader(!showUploader)}
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors backdrop-blur-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Upload</span>
                  </button>

                  {/* Share */}
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-600/80 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors backdrop-blur-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-gray-600/80 hover:bg-gray-600 text-white rounded-lg transition-colors backdrop-blur-sm"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Uploader Modal */}
      {showUploader && (
        <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Photos</h3>
              <button
                onClick={() => setShowUploader(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <PhotoUploader 
              collageId={currentCollage.id}
              onUploadComplete={() => {
                console.log('📸 Photo upload completed');
                if (!isRealtimeConnected) {
                  handleManualRefresh();
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Fullscreen hint */}
      {isFullscreen && controlsVisible && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg">
            Move mouse or press any key to show controls
          </div>
        </div>
      )}
    </div>
  );
};

export default CollageViewerPage;