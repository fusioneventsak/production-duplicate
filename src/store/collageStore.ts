// src/store/collageStore.ts - FIXED: Handle missing collages properly
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { nanoid } from 'nanoid';
import { RealtimeChannel } from '@supabase/supabase-js';

// Helper function to get file URL
const getFileUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// Helper for deep merging objects
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

// Default scene settings
const defaultSettings = {
  animationPattern: 'grid_wall',
  photoCount: 100,
  animationSpeed: 50,
  cameraDistance: 15,
  cameraHeight: 8,
  cameraRotationSpeed: 20,
  photoSize: 1.0,
  photoBrightness: 1.0,
  backgroundColor: '#000000',
  backgroundGradient: true,
  backgroundGradientStart: '#1a1a2e',
  backgroundGradientEnd: '#16213e',
  backgroundGradientAngle: 45,
  floorColor: '#111111',
  showFloor: true,
  showGrid: true,
  ambientLightIntensity: 0.4,
  spotlightIntensity: 0.8,
  patterns: {
    grid_wall: { enabled: true },
    float: { enabled: false },
    wave: { enabled: false },
    spiral: { enabled: false }
  }
};

export interface Photo {
  id: string;
  collage_id: string;
  url: string;
  created_at: string;
}

export interface Collage {
  id: string;
  name: string;
  code: string;
  created_at: string;
  settings: any;
}

export interface SceneSettings {
  animationPattern?: string;
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
  updateCollageName: (collageId: string, name: string) => Promise<any>;
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
  lastRefreshTime: 0,
  pollingInterval: null,

  // Add photo to state - ENHANCED
  addPhotoToState: (photo: Photo) => {
    set((state) => {
      const exists = state.photos.some(p => p.id === photo.id);
      if (exists) {
        console.log('🔄 Photo already exists in state:', photo.id);
        return state;
      }
      
      console.log('✅ Adding photo to state:', photo.id);
      // Add new photo at the beginning (most recent first)
      return {
        photos: [photo, ...state.photos],
        lastRefreshTime: Date.now()
      };
    });
  },

  // Remove photo from state - ENHANCED
  removePhotoFromState: (photoId: string) => {
    console.log('🗑️ Removing photo from state:', photoId);
    set((state) => {
      const beforeCount = state.photos.length;
      const newPhotos = state.photos.filter(p => p.id !== photoId);
      const afterCount = newPhotos.length;
      
      console.log(`🗑️ Photos: ${beforeCount} -> ${afterCount}`);
      
      if (beforeCount === afterCount) {
        console.log('⚠️ Photo not found in state for removal:', photoId);
      }
      
      return {
        photos: newPhotos,
        lastRefreshTime: Date.now()
      };
    });
  },

  // Enhanced realtime subscription with better error handling
  setupRealtimeSubscription: (collageId: string) => {
    // Clean up existing
    get().cleanupRealtimeSubscription();

    console.log('🚀 Setting up realtime for collage:', collageId);

    const channel = supabase
      .channel(`photos_${collageId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photos',
          filter: `collage_id=eq.${collageId}`
        },
        (payload) => {
          console.log('🔔 Realtime event:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            console.log('➕ REALTIME INSERT:', payload.new.id);
            get().addPhotoToState(payload.new as Photo);
          } 
          else if (payload.eventType === 'DELETE' && payload.old) {
            console.log('🗑️ REALTIME DELETE:', payload.old.id);
            get().removePhotoFromState(payload.old.id);
          }
          else if (payload.eventType === 'UPDATE' && payload.new) {
            console.log('📝 REALTIME UPDATE:', payload.new.id);
            // Handle photo updates if needed
            set((state) => ({
              photos: state.photos.map(p => 
                p.id === payload.new.id ? payload.new as Photo : p
              ),
              lastRefreshTime: Date.now()
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime status:', status);
        set({ isRealtimeConnected: status === 'SUBSCRIBED' });
        
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('🔄 Realtime disconnected, starting polling fallback...');
          get().startPolling(collageId);
        } else if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected, stopping polling...');
          get().stopPolling();
        }
      });

    set({ realtimeChannel: channel });
  },

  cleanupRealtimeSubscription: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      console.log('🧹 Cleaning up realtime subscription');
      channel.unsubscribe();
      set({ realtimeChannel: null, isRealtimeConnected: false });
    }
    get().stopPolling();
  },

  // Polling fallback when realtime fails
  startPolling: (collageId: string) => {
    get().stopPolling(); // Clear any existing polling
    
    console.log('🔄 Starting polling fallback for collage:', collageId);
    const interval = setInterval(() => {
      console.log('📡 Polling for photo updates...');
      get().refreshPhotos(collageId);
    }, 3000); // Poll every 3 seconds
    
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const interval = get().pollingInterval;
    if (interval) {
      console.log('⏹️ Stopping polling');
      clearInterval(interval);
      set({ pollingInterval: null });
    }
  },

  refreshPhotos: async (collageId: string) => {
    try {
      await get().fetchPhotosByCollageId(collageId);
    } catch (error) {
      console.error('❌ Failed to refresh photos:', error);
    }
  },

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

  // FIXED: fetchCollageByCode - Handle missing collages properly
  fetchCollageByCode: async (code: string) => {
    set({ loading: true, error: null });
    try {
      console.log('🔍 Fetching collage by code:', code);

      // FIXED: Use .maybeSingle() instead of .single() to handle 0 rows
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .select('*')
        .eq('code', code)
        .maybeSingle(); // CHANGED: This returns null instead of throwing error when no rows found

      if (collageError) {
        console.error('❌ Collage fetch error:', collageError);
        throw collageError;
      }

      if (!collage) {
        // FIXED: Handle when collage doesn't exist
        console.log('❌ No collage found with code:', code);
        set({ 
          error: `No collage found with code "${code}". Please check the code and try again.`,
          loading: false,
          currentCollage: null 
        });
        return null;
      }

      console.log('✅ Found collage:', collage.id, collage.name);

      // Fetch settings - also use maybeSingle for consistency
      const { data: settings } = await supabase
        .from('collage_settings')
        .select('settings')
        .eq('collage_id', collage.id)
        .maybeSingle(); // CHANGED: Use maybeSingle here too

      const collageWithSettings = {
        ...collage,
        settings: settings?.settings ? deepMerge(defaultSettings, settings.settings) : defaultSettings
      } as Collage;

      set({ currentCollage: collageWithSettings, loading: false, error: null });
      
      // Fetch photos and setup subscription
      await get().fetchPhotosByCollageId(collage.id);
      get().setupRealtimeSubscription(collage.id);
      
      console.log('✅ Successfully loaded collage:', collage.name);
      return collageWithSettings;
    } catch (error: any) {
      console.error('❌ fetchCollageByCode error:', error);
      set({ 
        error: error.message || 'Failed to load collage', 
        loading: false,
        currentCollage: null 
      });
      return null;
    }
  },

  // FIXED: fetchCollageById - Handle missing collages properly
  fetchCollageById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      console.log('🔍 Fetching collage by ID:', id);

      // FIXED: Use .maybeSingle() instead of .single()
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // CHANGED: This returns null instead of throwing error when no rows found

      if (collageError) {
        console.error('❌ Collage fetch error:', collageError);
        throw collageError;
      }

      if (!collage) {
        // FIXED: Handle when collage doesn't exist
        console.log('❌ No collage found with ID:', id);
        set({ 
          error: `No collage found with ID "${id}".`,
          loading: false,
          currentCollage: null 
        });
        return null;
      }

      console.log('✅ Found collage:', collage.id, collage.name);

      // Fetch settings - also use maybeSingle for consistency
      const { data: settings } = await supabase
        .from('collage_settings')
        .select('settings')
        .eq('collage_id', id)
        .maybeSingle(); // CHANGED: Use maybeSingle here too

      const collageWithSettings = {
        ...collage,
        settings: settings?.settings ? deepMerge(defaultSettings, settings.settings) : defaultSettings
      } as Collage;

      set({ currentCollage: collageWithSettings, loading: false, error: null });
      
      // Fetch photos and setup subscription
      await get().fetchPhotosByCollageId(id);
      get().setupRealtimeSubscription(id);
      
      console.log('✅ Successfully loaded collage:', collage.name);
      return collageWithSettings;
    } catch (error: any) {
      console.error('❌ fetchCollageById error:', error);
      set({ 
        error: error.message || 'Failed to load collage', 
        loading: false,
        currentCollage: null 
      });
      return null;
    }
  },

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

  // NEW: Update collage name
  updateCollageName: async (collageId: string, name: string) => {
    try {
      console.log('📝 Updating collage name:', collageId, name);

      const { data, error } = await supabase
        .from('collages')
        .update({ name })
        .eq('id', collageId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set((state) => ({
        currentCollage: state.currentCollage ? {
          ...state.currentCollage,
          name: name
        } : null,
        collages: state.collages.map(collage => 
          collage.id === collageId ? { ...collage, name } : collage
        )
      }));

      console.log('✅ Collage name updated successfully');
      return data;
    } catch (error: any) {
      console.error('❌ Failed to update collage name:', error);
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
      const fileName = `${collageId}/${nanoid()}.${fileExt}`;

      console.log('📤 Uploading to storage:', fileName);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ File uploaded to storage:', uploadData.path);

      // Get public URL
      const publicUrl = getFileUrl('photos', uploadData.path);
      console.log('🔗 Public URL:', publicUrl);

      // Insert photo record
      const { data: photo, error: dbError } = await supabase
        .from('photos')
        .insert([{
          collage_id: collageId,
          url: publicUrl
        }])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database insert error:', dbError);
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('photos').remove([uploadData.path]);
        throw dbError;
      }

      console.log('✅ Photo record created:', photo.id);
      console.log('🔔 Realtime should now broadcast this to all clients');
      
      return photo as Photo;
      
    } catch (error: any) {
      console.error('❌ Upload photo error:', error);
      throw error;
    }
  },

  // Enhanced delete with better error handling
  deletePhoto: async (photoId: string) => {
    try {
      console.log('🗑️ Starting photo deletion:', photoId);
      
      // First, get the photo to find the storage path
      const { data: photo, error: fetchError } = await supabase
        .from('photos')
        .select('url')
        .eq('id', photoId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching photo for deletion:', fetchError);
        throw fetchError;
      }

      // Extract storage path from URL
      const url = new URL(photo.url);
      const pathParts = url.pathname.split('/');
      const storagePathIndex = pathParts.findIndex(part => part === 'photos');
      
      if (storagePathIndex === -1) {
        throw new Error('Invalid photo URL format');
      }
      
      const storagePath = pathParts.slice(storagePathIndex + 1).join('/');
      console.log('🗑️ Storage path:', storagePath);

      // Delete from database first
      const { error: deleteDbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (deleteDbError) {
        console.error('❌ Database delete error:', deleteDbError);
        throw deleteDbError;
      }

      console.log('✅ Photo record deleted from database');

      // Delete from storage
      const { error: deleteStorageError } = await supabase.storage
        .from('photos')
        .remove([storagePath]);

      if (deleteStorageError) {
        console.warn('⚠️ Storage delete error (non-fatal):', deleteStorageError);
        // Don't throw here as the database record is already deleted
      } else {
        console.log('✅ Photo file deleted from storage');
      }

      console.log('✅ Photo deletion completed:', photoId);
      
    } catch (error: any) {
      console.error('❌ Delete photo error:', error);
      throw error;
    }
  }
}));