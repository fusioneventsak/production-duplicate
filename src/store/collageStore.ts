// src/store/collageStore.ts - CORRECTED VERSION (NO JSX)
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { nanoid } from 'nanoid';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Helper function for deep merging objects
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Default settings
const defaultSettings = {
  animationPattern: 'grid',
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
  spotlightAngle: Math.PI / 6,
  spotlightIntensity: 2,
  spotlightColor: '#ffffff',
  ambientLightIntensity: 0.4,
  ambientLightColor: '#404040',
  floorEnabled: true,
  floorSize: 200,
  floorColor: '#1A1A1A',
  floorOpacity: 1,
  floorMetalness: 0.5,
  floorRoughness: 0.5,
  gridEnabled: false,
  gridSize: 100,
  gridDivisions: 20,
  gridColor: '#404040',
  gridOpacity: 0.5,
  photoSize: 4.0,
  photoBrightness: 1.0,
  photoSpacing: 1.2,
  photoRotation: 0,
  photoTilt: 0,
  photoDepth: 0.1,
  shadowsEnabled: true,
  shadowQuality: 'medium' as const,
  fogEnabled: false,
  fogColor: '#000000',
  fogNear: 50,
  fogFar: 200,
  postProcessingEnabled: false,
  bloomEnabled: false,
  bloomStrength: 0.5,
  bloomRadius: 0.4,
  bloomThreshold: 0.9,
};

// Types
export interface Photo {
  id: string;
  url: string;
  collage_id: string;
  created_at: string;
  approved?: boolean;
  moderated?: boolean;
}

export interface Collage {
  id: string;
  name: string;
  code: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
  settings?: SceneSettings;
}

export interface SceneSettings {
  animationPattern: string;
  patterns?: any;
  photoCount?: number;
  animationSpeed?: number;
  cameraDistance?: number;
  cameraHeight?: number;
  cameraRotationSpeed?: number;
  photoSize?: number;
  photoBrightness?: number;
  backgroundColor?: string;
  backgroundGradient?: boolean;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  backgroundGradientAngle?: number;
  floorColor?: string;
  showFloor?: boolean;
  showGrid?: boolean;
  ambientLightIntensity?: number;
  spotlightIntensity?: number;
  [key: string]: any;
}

interface CollageStore {
  // State
  photos: Photo[];
  currentCollage: Collage | null;
  loading: boolean;
  error: string | null;
  collages: Collage[];
  realtimeChannel: RealtimeChannel | null;
  isRealtimeConnected: boolean;
  lastRefreshTime: number;
  pollingInterval: NodeJS.Timeout | null;

  // Actions
  fetchCollages: () => Promise<void>;
  fetchCollageByCode: (code: string) => Promise<Collage | null>;
  fetchCollageById: (id: string) => Promise<Collage | null>;
  createCollage: (name: string) => Promise<Collage | null>;
  updateCollageSettings: (collageId: string, settings: Partial<SceneSettings>) => Promise<any>;
  uploadPhoto: (collageId: string, file: File) => Promise<Photo | null>;
  deletePhoto: (photoId: string) => Promise<void>;
  fetchPhotosByCollageId: (collageId: string) => Promise<void>;
  refreshPhotos: (collageId: string) => Promise<void>;
  
  // Real-time subscription methods
  setupRealtimeSubscription: (collageId: string) => void;
  cleanupRealtimeSubscription: () => void;
  
  // Internal methods
  addPhotoToState: (photo: Photo) => void;
  removePhotoFromState: (photoId: string) => void;
  startPolling: (collageId: string) => void;
  stopPolling: () => void;
}

export const useCollageStore = create<CollageStore>((set, get) => ({
  // Initial state
  photos: [],
  currentCollage: null,
  loading: false,
  error: null,
  collages: [],
  realtimeChannel: null,
  isRealtimeConnected: false,
  lastRefreshTime: Date.now(),
  pollingInterval: null,

  // Fetch photos for a collage
  fetchPhotosByCollageId: async (collageId: string) => {
    try {
      console.log('📸 Fetching photos for collage:', collageId);
      
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📸 Fetched photos:', data?.length || 0);
      set({ 
        photos: data as Photo[], 
        lastRefreshTime: Date.now() 
      });
      
    } catch (error: any) {
      console.error('❌ Fetch photos error:', error);
      set({ error: error.message });
      throw error;
    }
  },

  // Fetch all collages (no user filter for now)
  fetchCollages: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('collages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ collages: data as Collage[], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch collage by code with settings
  fetchCollageByCode: async (code: string) => {
    set({ loading: true, error: null });
    try {
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .select('*')
        .eq('code', code)
        .single();

      if (collageError) throw collageError;

      // Try to fetch settings from separate table
      const { data: settings } = await supabase
        .from('collage_settings')
        .select('settings')
        .eq('collage_id', collage.id)
        .single();

      const collageWithSettings = {
        ...collage,
        settings: settings?.settings ? deepMerge(defaultSettings, settings.settings) : defaultSettings
      } as Collage;

      set({ currentCollage: collageWithSettings, loading: false });
      
      // Fetch photos and setup subscription
      await get().fetchPhotosByCollageId(collage.id);
      get().setupRealtimeSubscription(collage.id);
      
      return collageWithSettings;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Fetch collage by ID with settings
  fetchCollageById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .select('*')
        .eq('id', id)
        .single();

      if (collageError) throw collageError;

      // Try to fetch settings from separate table
      const { data: settings } = await supabase
        .from('collage_settings')
        .select('settings')
        .eq('collage_id', id)
        .single();

      const collageWithSettings = {
        ...collage,
        settings: settings?.settings ? deepMerge(defaultSettings, settings.settings) : defaultSettings
      } as Collage;

      set({ currentCollage: collageWithSettings, loading: false });
      
      // Fetch photos and setup subscription
      await get().fetchPhotosByCollageId(id);
      get().setupRealtimeSubscription(id);
      
      return collageWithSettings;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Create new collage
  createCollage: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const code = nanoid(8).toUpperCase();
      
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .insert([{ name, code }])
        .select()
        .single();

      if (collageError) throw collageError;

      // Create settings in separate table
      const { data: settings, error: settingsError } = await supabase
        .from('collage_settings')
        .insert([{ 
          collage_id: collage.id, 
          settings: defaultSettings 
        }])
        .select()
        .single();

      if (settingsError) throw settingsError;

      const collageWithSettings = {
        ...collage,
        settings: defaultSettings
      } as Collage;

      set((state) => ({
        collages: [collageWithSettings, ...state.collages],
        loading: false
      }));

      return collageWithSettings;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Update collage settings
  updateCollageSettings: async (collageId: string, settings: Partial<SceneSettings>) => {
    try {
      const currentCollage = get().currentCollage;
      if (!currentCollage) throw new Error('No current collage');

      const mergedSettings = deepMerge(currentCollage.settings, settings);

      const { data, error } = await supabase
        .from('collage_settings')
        .update({ settings: mergedSettings })
        .eq('collage_id', collageId)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        currentCollage: state.currentCollage ? {
          ...state.currentCollage,
          settings: mergedSettings
        } : null
      }));

      return data;
    } catch (error: any) {
      console.error('Failed to update collage settings:', error.message);
      throw error;
    }
  },

  // Enhanced upload with better error handling
  uploadPhoto: async (collageId: string, file: File) => {
    try {
      console.log('📤 Starting photo upload:', file.name);
      
      // Validation
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only images are supported.');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${collageId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // Save to database
      const { data: photoData, error: dbError } = await supabase
        .from('photos')
        .insert({
          collage_id: collageId,
          url: publicUrl
        })
        .select()
        .single();

      if (dbError) throw dbError;

      console.log('✅ Photo uploaded successfully:', photoData);
      
      // Add to state if realtime isn't working
      if (!get().isRealtimeConnected) {
        get().addPhotoToState(photoData);
      }

      return photoData;
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  },

  // Delete photo
  deletePhoto: async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;
      
      // Remove from state if realtime isn't working
      if (!get().isRealtimeConnected) {
        get().removePhotoFromState(photoId);
      }
    } catch (error: any) {
      console.error('Delete failed:', error);
      throw error;
    }
  },

  // Refresh photos (manual refresh)
  refreshPhotos: async (collageId: string) => {
    console.log('🔄 Manually refreshing photos for collage:', collageId);
    await get().fetchPhotosByCollageId(collageId);
  },

  // Setup realtime subscription
  setupRealtimeSubscription: (collageId: string) => {
    const { realtimeChannel } = get();
    
    // Cleanup existing channel
    if (realtimeChannel) {
      get().cleanupRealtimeSubscription();
    }

    console.log('🔴 Setting up realtime subscription for collage:', collageId);
    
    const channel = supabase
      .channel(`collage-${collageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photos',
          filter: `collage_id=eq.${collageId}`
        },
        (payload) => {
          console.log('📸 Realtime photo event:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            get().addPhotoToState(payload.new as Photo);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            get().removePhotoFromState(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);
        set({ isRealtimeConnected: status === 'SUBSCRIBED' });
        
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          // Fallback to polling
          get().startPolling(collageId);
        } else if (status === 'SUBSCRIBED') {
          // Stop polling if realtime is working
          get().stopPolling();
        }
      });

    set({ realtimeChannel: channel });
  },

  // Cleanup realtime subscription
  cleanupRealtimeSubscription: () => {
    const { realtimeChannel, pollingInterval } = get();
    
    if (realtimeChannel) {
      console.log('🔴 Cleaning up realtime subscription');
      realtimeChannel.unsubscribe();
      set({ realtimeChannel: null, isRealtimeConnected: false });
    }
    
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  // Add photo to state
  addPhotoToState: (photo: Photo) => {
    set((state) => {
      const existingPhoto = state.photos.find(p => p.id === photo.id);
      if (existingPhoto) return state;
      
      return {
        photos: [photo, ...state.photos],
        lastRefreshTime: Date.now()
      };
    });
  },

  // Remove photo from state
  removePhotoFromState: (photoId: string) => {
    set((state) => ({
      photos: state.photos.filter(p => p.id !== photoId),
      lastRefreshTime: Date.now()
    }));
  },

  // Start polling fallback
  startPolling: (collageId: string) => {
    const { pollingInterval } = get();
    
    if (pollingInterval) return; // Already polling
    
    console.log('⏰ Starting polling fallback for collage:', collageId);
    
    const interval = setInterval(() => {
      get().refreshPhotos(collageId);
    }, 5000); // Poll every 5 seconds
    
    set({ pollingInterval: interval });
  },

  // Stop polling
  stopPolling: () => {
    const { pollingInterval } = get();
    
    if (pollingInterval) {
      console.log('⏰ Stopping polling');
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  }
}));