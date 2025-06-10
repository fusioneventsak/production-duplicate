// src/pages/CollageEditorPage.tsx - UPDATED: Left-side settings panel with improved styling
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings, Image, Shield } from 'lucide-react';
import { useCollageStore } from '../store/collageStore';
import { useSceneStore } from '../store/sceneStore';
import { ErrorBoundary } from 'react-error-boundary';
import Layout from '../components/layout/Layout';
import SceneSettings from '../components/collage/SceneSettings';
import CollageScene from '../components/three/CollageScene';
import PhotoUploader from '../components/collage/PhotoUploader';
import CollagePhotos from '../components/collage/CollagePhotos';

type Tab = 'settings' | 'photos';

// Error fallback component for 3D scene errors
function SceneErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="bg-red-900/30 backdrop-blur-sm rounded-lg border border-gray-500/50 p-6 flex flex-col items-center justify-center h-[calc(100vh-240px)]">
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
      <p className="mt-4 text-gray-400 text-sm">
        Tip: Try reducing the photo count in settings if the issue persists.
      </p>
    </div>
  );
}

const CollageEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentCollage, 
    photos, 
    fetchCollageById, 
    updateCollageSettings, 
    loading, 
    error, 
    setupRealtimeSubscription, 
    cleanupRealtimeSubscription,
    isRealtimeConnected,
    refreshPhotos
  } = useCollageStore();
  const { settings, updateSettings } = useSceneStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // SAFETY: Ensure photos is always an array
  const safePhotos = Array.isArray(photos) ? photos : [];

  // DEBUG: Log photos changes in editor
  useEffect(() => {
    console.log('🎨 EDITOR: Photos array changed!');
    console.log('🎨 Editor photo count:', safePhotos.length);
    console.log('🎨 Editor photo IDs:', safePhotos.map(p => p.id.slice(-4)));
  }, [safePhotos]);

  // DEBUG: Log realtime connection status
  useEffect(() => {
    console.log('🎨 EDITOR: Realtime connected:', isRealtimeConnected);
  }, [isRealtimeConnected]);

  // Fetch collage by ID - this will automatically setup realtime subscription
  useEffect(() => {
    if (id) {
      console.log('🎨 EDITOR: Fetching collage by ID:', id);
      fetchCollageById(id);
    }
    
    // Cleanup subscription when component unmounts
    return () => {
      console.log('🎨 EDITOR: Cleaning up realtime subscription on unmount');
      cleanupRealtimeSubscription();
    };
  }, [id, fetchCollageById, cleanupRealtimeSubscription]);

  // Update scene store when collage settings change
  useEffect(() => {
    if (currentCollage?.settings) {
      console.log('🎨 EDITOR: Updating scene store with collage settings');
      updateSettings(currentCollage.settings, false);
    }
  }, [currentCollage?.settings, updateSettings]);

  // Auto-save settings changes with debouncing
  const handleSettingsChange = async (newSettings: any) => {
    if (!currentCollage) return;

    // Update local scene store immediately for responsive UI
    updateSettings(newSettings, false);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaving(true);

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateCollageSettings(currentCollage.id, newSettings);
        console.log('✅ Settings auto-saved successfully');
      } catch (error) {
        console.error('❌ Failed to save settings:', error);
      } finally {
        setSaving(false);
      }
    }, 1000); // 1 second debounce
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Manual refresh function for when realtime fails
  const handleManualRefresh = async () => {
    if (currentCollage?.id) {
      console.log('🔄 EDITOR: Manual refresh triggered');
      await refreshPhotos(currentCollage.id);
    }
  };

  // Reset settings to defaults
  const handleResetSettings = () => {
    if (!currentCollage) return;
    
    const defaultSettings = {
      animationPattern: 'grid' as const,
      animationSpeed: 50,
      animationEnabled: true,
      photoCount: 50,
      backgroundColor: '#000000',
      backgroundGradient: false,
      backgroundGradientStart: '#000000',
      backgroundGradientEnd: '#1a1a1a',
      backgroundGradientAngle: 180,
      emptySlotColor: '#1A1A1A',
      cameraDistance: 25,
      cameraRotationEnabled: true,
      cameraRotationSpeed: 0.2,
      cameraHeight: 10,
      cameraEnabled: true,
      spotlightCount: 4,
      spotlightHeight: 30,
      spotlightDistance: 40,
      spotlightAngle: Math.PI / 4,
      spotlightWidth: 0.6,
      spotlightPenumbra: 0.4,
      ambientLightIntensity: 0.8,
      spotlightIntensity: 150.0,
      spotlightColor: '#ffffff',
      floorEnabled: true,
      floorColor: '#1A1A1A',
      floorOpacity: 0.8,
      floorSize: 200,
      floorReflectivity: 0.8,
      floorMetalness: 0.7,
      floorRoughness: 0.2,
      gridEnabled: true,
      gridColor: '#444444',
      gridSize: 200,
      gridDivisions: 30,
      gridOpacity: 1.0,
      photoSize: 4.0,
      photoRotation: true,
      photoSpacing: 0,
      wallHeight: 0,
      gridAspectRatio: 1.77778,
      photoBrightness: 1.0,
    };
    
    handleSettingsChange(defaultSettings);
  };

  if (loading && !currentCollage) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2 text-gray-400">Loading collage...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !currentCollage) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Collage Not Found</h2>
            <p className="text-gray-400 mb-6">
              The collage you're looking for doesn't exist or might have been removed.
            </p>
            <Link 
              to="/dashboard" 
              className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[1920px] mx-auto h-[calc(100vh-80px)] flex gap-4 p-4">
        {/* LEFT SIDEBAR - Maximized Settings Panel */}
        <div className="w-96 flex-shrink-0">
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg h-full flex flex-col">
            {/* Compact Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between mb-3">
                <Link 
                  to="/dashboard" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                  <span className="text-xs text-gray-400 font-mono">
                    {currentCollage.code}
                  </span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-400">{safePhotos.length} photos</span>
                </div>
              </div>
              
              <div className="text-center">
                <h1 className="text-lg font-bold text-white truncate">{currentCollage.name}</h1>
                {saving && (
                  <div className="mt-1 text-xs text-purple-400 flex items-center justify-center">
                    <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                )}
              </div>
            </div>

            {/* Minimal Tab Navigation */}
            <div className="px-4 py-3 border-b border-gray-700/50">
              <div className="flex space-x-1 bg-gray-800/50 rounded-md p-1">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 flex items-center justify-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Settings className="w-3 h-3 mr-1.5" />
                  Scene
                </button>
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`flex-1 flex items-center justify-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    activeTab === 'photos'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Image className="w-3 h-3 mr-1.5" />
                  Photos
                </button>
              </div>
            </div>

            {/* Maximized Content Area */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'settings' ? (
                <div className="p-4">
                  <SceneSettings
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                    onReset={handleResetSettings}
                  />
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <PhotoUploader />
                  <CollagePhotos 
                    collageId={currentCollage.id}
                    onManualRefresh={handleManualRefresh}
                  />
                </div>
              )}
            </div>

            {/* Compact Footer */}
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
              <div className="flex space-x-2">
                <Link
                  to={`/collage/${currentCollage.code}`}
                  className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-center rounded text-sm font-medium transition-colors"
                >
                  View Live
                </Link>
                <Link
                  to={`/collage/${currentCollage.code}/moderation`}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
                >
                  <Shield className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Main 3D Scene */}
        <div className="flex-1 relative">
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700/50 rounded-lg h-full overflow-hidden">
            <ErrorBoundary 
              FallbackComponent={SceneErrorFallback}
              resetKeys={[currentCollage.id, settings, safePhotos.length]}
            >
              <CollageScene 
                photos={safePhotos}
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CollageEditorPage;