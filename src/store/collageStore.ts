import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Default scene settings
const defaultSettings = {
  animationPattern: 'grid',
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
  floorEnabled: true,
  gridEnabled: true,
  ambientLightIntensity: 0.4,
  spotlightIntensity: 0.8
};

// Helper function for deep merging objects
function deepMerge(target: any, source: any): any {
  if (!source) return target;
  const output = { ...target };
  if (target && typeof target === 'object' && source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (source[key] instanceof Object) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

// Helper function to get file URL
const getFileUrl = (bucket: string, path: string): string => {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
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

interface CollageStore {
  collages: Collage[];
  currentCollage: Collage | null;
  photos: Photo[];
  loading: boolean;
  error: string | null;
  channel: RealtimeChannel | null;
  isRealtimeConnected: boolean;
  lastRefreshTime: number;
  pollingInterval: NodeJS.Timeout | null;
  fetchCollages: () => Promise<void>;
  fetchCollageByCode: (code: string) => Promise<Collage | null>;
  fetchCollageById: (id: string) => Promise<Collage | null>;
  createCollage: (name: string) => Promise<Collage | null>;
  updateCollageSettings: (collageId: string, settings: Partial<SceneSettings>) => Promise<void>;
  uploadPhoto: (collageId: string, file: File) => Promise<Photo | null>;
  deletePhoto: (photoId: string) => Promise<void>;
  fetchPhotosByCollageId: (collageId: string) => Promise<void>;
  refreshPhotos: (collageId: string) => Promise<void>;
  setupRealtimeSubscription: (collageId: string) => void;
  cleanupRealtimeSubscription: () => void;
}

export interface SceneSettings {
  animationPattern: string;
  photoCount: number;
  animationSpeed: number;
  cameraDistance: number;
  cameraHeight: number;
  cameraRotationSpeed: number;
  photoSize: number;
  photoBrightness: number;
  backgroundColor: string;
  backgroundGradient: boolean;
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  backgroundGradientAngle: number;
  floorColor: string;
  floorEnabled: boolean;
  gridEnabled: boolean;
  ambientLightIntensity: number;
  spotlightIntensity: number;
}

export const useCollageStore = create<CollageStore>((set, get) => ({
  collages: [],
  currentCollage: null,
  photos: [],
  loading: false,
  error: null,
  channel: null,
  isRealtimeConnected: false,
  lastRefreshTime: 0,
  pollingInterval: null,

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

  fetchCollageByCode: async (code: string) => {
    set({ loading: true, error: null });
    try {
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .select('*')
        .eq('code', code)
        .single();

      if (collageError) throw collageError;

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

  fetchCollageById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .select('*')
        .eq('id', id)
        .single();

      if (collageError) throw collageError;

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
      if (!currentCollage) throw new Error('No collage selected');

      const mergedSettings = deepMerge(currentCollage.settings, settings);

      const { data, error } = await supabase
        .from('collage_settings')
        .update({ 
          settings: mergedSettings
        })
        .eq('collage_id', collageId)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        currentCollage: { ...state.currentCollage!, settings: mergedSettings }
      }));
    } catch (error: any) {
      throw error;
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

  refreshPhotos: async (collageId: string) => {
    try {
      console.log('🔄 Refreshing photos for collage:', collageId);
      
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📸 Refreshed photos count:', data?.length || 0);
      set({ 
        photos: data as Photo[], 
        error: null,
        lastRefreshTime: Date.now()
      });
      
    } catch (error: any) {
      console.error('❌ Refresh photos error:', error);
      set({ error: error.message });
      throw error;
    }
  },

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
      
      return photo as Photo;
      
    } catch (error: any) {
      console.error('❌ Upload photo error:', error);
      throw error;
    }
  },

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
      const storagePath = pathParts.slice(-2).join('/'); // Get collage_id/filename

      console.log('🗑️ Deleting from storage:', storagePath);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([storagePath]);

      if (storageError) {
        console.warn('⚠️ Storage deletion warning:', storageError);
        // Don't throw here - continue with database deletion
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        console.error('❌ Database deletion error:', dbError);
        throw dbError;
      }

      console.log('✅ Photo deleted successfully:', photoId);
      
    } catch (error: any) {
      console.error('❌ Delete photo error:', error);
      throw error;
    }
  },
  
  setupRealtimeSubscription: (collageId: string) => {
    // Clean up existing subscription
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
            set(state => ({ 
              photos: [payload.new as Photo, ...state.photos],
              lastRefreshTime: Date.now()
            }));
          } 
          else if (payload.eventType === 'DELETE' && payload.old) {
            console.log('🗑️ REALTIME DELETE:', payload.old.id);
            set(state => ({
              photos: state.photos.filter(p => p.id !== payload.old.id),
              lastRefreshTime: Date.now()
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected successfully');
          set({ isRealtimeConnected: true });
        } else {
          console.log('❌ Realtime connection issue:', status);
          set({ isRealtimeConnected: false });
        }
      });

    set({ channel });
  },

  cleanupRealtimeSubscription: () => {
    const channel = get().channel;
    if (channel) {
      console.log('🧹 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      set({ channel: null, isRealtimeConnected: false });
    }
  }
}));