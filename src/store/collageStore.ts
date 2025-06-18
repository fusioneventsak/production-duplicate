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
  animationPattern: 'grid',
  animationSpeed: 50,
  animationEnabled: true,
  photoCount: 100,
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
  photoRotation: true,
  photoTilt: 0,
  photoDepth: 0.1,
  shadowsEnabled: true,
  shadowQuality: 'medium',
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
  user_id?: string;
  created_at?: string;
  createdAt?: string;
  photoCount?: number;
  settings: any;
}

export interface SceneSettings {
  animationPattern?: string;
  patterns?: any;
  photoCount?: number;
  animationSpeed?: number;
  cameraDistance?: number;
  cameraHeight?: number;
  cameraRotationEnabled?: boolean;
  cameraRotationSpeed?: number;
  photoSize?: number;
  photoBrightness?: number;
  backgroundColor?: string;
  backgroundGradient?: boolean;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  backgroundGradientAngle?: number;
  emptySlotColor?: string;
  cameraEnabled?: boolean;
  spotlightCount?: number;
  spotlightHeight?: number;
  spotlightDistance?: number;
  spotlightAngle?: number;
  spotlightWidth?: number;
  spotlightPenumbra?: number;
  ambientLightIntensity?: number;
  spotlightIntensity?: number;
  spotlightColor?: string;
  floorEnabled?: boolean;
  floorColor?: string;
  floorOpacity?: number;
  floorSize?: number;
  floorReflectivity?: number;
  floorMetalness?: number;
  floorRoughness?: number;
  gridEnabled?: boolean;
  gridColor?: string;
  gridSize?: number;
  gridDivisions?: number;
  gridOpacity?: number;
  photoSpacing?: number;
  wallHeight?: number;
  gridAspectRatio?: number;
  photoRotation?: boolean;
  [key: string]: any;
};

// Store interface
interface CollageStore {
  currentCollage: Collage | null;
  photos: Photo[];
  loading: boolean;
  error: string | null;
  lastRefreshTime: number;
  realtimeSubscription: RealtimeChannel | null;
  fetchCollageById: (id: string) => Promise<void>;
  fetchPhotosByCollageId: (collageId: string) => Promise<void>;
  createCollage: (name: string) => Promise<Collage>;
  uploadPhoto: (collageId: string, file: File) => Promise<Photo>;
  deletePhoto: (photoId: string) => Promise<void>;
  refreshPhotos: (collageId: string) => Promise<void>;
  setupRealtimeSubscription: (collageId: string) => void;
  cleanup: () => void;
}

export const useCollageStore = create<CollageStore>((set, get) => ({
  currentCollage: null,
  photos: [],
  loading: false,
  error: null,
  lastRefreshTime: 0,
  realtimeSubscription: null,

  // Fetch collage by ID
  fetchCollageById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      console.log('🎨 EDITOR: Loading collage:', id);
      
      try {
        const { data: collage, error: collageError } = await supabase
          .from('collages')
          .select('*')
          .eq('id', id)
          .single();

        if (collageError) throw collageError;

        const { data: settings, error: settingsError } = await supabase
          .from('collage_settings')
          .select('settings')
          .eq('collage_id', id)
          .single();

        if (settingsError) {
          console.warn('Settings not found, creating default settings');
          
          // Create default settings if they don't exist
          const { data: newSettings, error: createError } = await supabase
            .from('collage_settings')
            .insert([{ 
              collage_id: id, 
              settings: defaultSettings 
            }])
            .select()
            .single();
            
          if (createError) throw createError;
          
          const collageWithSettings = {
            ...collage,
            settings: defaultSettings
          } as Collage;
          
          set({ currentCollage: collageWithSettings, loading: false });
          
          // Fetch photos and setup subscription
          await get().fetchPhotosByCollageId(id);
          get().setupRealtimeSubscription(id);
          
          return;
        }

        const collageWithSettings = {
          ...collage,
          settings: settings?.settings ? deepMerge(defaultSettings, settings.settings) : defaultSettings
        } as Collage;

        set({ currentCollage: collageWithSettings, loading: false });
        
        // Fetch photos and setup subscription
        await get().fetchPhotosByCollageId(id);
        get().setupRealtimeSubscription(id);
        
        return;
      } catch (error: any) {
        console.error('Failed to fetch collage:', error);
        throw error;
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Setup realtime subscription
  setupRealtimeSubscription: (collageId: string) => {
    const currentSub = get().realtimeSubscription;
    if (currentSub) {
      currentSub.unsubscribe();
    }

    const subscription = supabase
      .channel(`collage:${collageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'photos',
        filter: `collage_id=eq.${collageId}`
      }, () => {
        get().refreshPhotos(collageId);
      })
      .subscribe();

    set({ realtimeSubscription: subscription });
  },

  // Cleanup subscription
  cleanup: () => {
    const subscription = get().realtimeSubscription;
    if (subscription) {
      subscription.unsubscribe();
      set({ realtimeSubscription: null });
    }
  },

  // Fetch photos by collage ID
  fetchPhotosByCollageId: async (collageId: string) => {
    try {
      console.log('📸 Fetching photos for collage:', collageId);
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('📸 Fetched photos:', data?.length || 0);
      set({ 
        photos: data as Photo[], 
        loading: false,
        lastRefreshTime: Date.now() 
      });
      
    } catch (error: any) {
      console.error('❌ Fetch photos error:', error);
      throw error;
    }
  },

  // Create new collage
  createCollage: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const code = nanoid(4).toUpperCase();
      
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .insert([{ name, code }])
        .select()
        .single();

      if (collageError) throw collageError;

      // Settings will be created automatically via trigger
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
        settings: settings.settings
      } as Collage;

      set({ currentCollage: collageWithSettings, loading: false });
      return collageWithSettings;
      
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Refresh photos
  refreshPhotos: async (collageId: string) => {
    try {
      console.log('🔄 Refreshing photos for collage:', collageId);
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('📸 Refreshed photos count:', data?.length || 0);
      set({ 
        loading: false,
        photos: data as Photo[], 
        error: null,
        lastRefreshTime: Date.now()
      });
      
    } catch (error: any) {
      console.error('❌ Refresh photos error:', error);
      throw error;
    }
  },

  // Enhanced upload with better error handling
  uploadPhoto: async (collageId: string, file: File) => {
    try {
      console.log('📤 Starting photo upload for collage:', collageId);
      
      // Validation
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${collageId}/${nanoid()}.${fileExt || 'jpg'}`;

      console.log('📤 Uploading to storage:', fileName);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ File uploaded successfully:', uploadData.path);

      // Get public URL
      const publicUrl = getFileUrl('photos', uploadData.path);
      console.log('🔗 Public URL:', publicUrl);

      try {
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
      } catch (dbError) {
        console.error('❌ Database insert error:', dbError);
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('photos').remove([uploadData.path]);
        throw dbError;
      }
      
    } catch (error: any) {
      console.error('❌ Upload photo error:', error);
      throw error;
    }
  },

  // Enhanced delete with better error handling
  deletePhoto: async (photoId: string) => {
    try {
      console.log('🗑️ Starting photo deletion for ID:', photoId);
      
      // First, get the photo to find the storage path
      const { data: photo, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching photo for deletion:', fetchError);
        throw fetchError;
      }
      
      if (!photo || !photo.url) {
        console.error('❌ Photo not found or URL is missing');
        throw new Error('Photo not found or URL is missing');
      }

      try {
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
      } catch (storageError) {
        console.warn('⚠️ Error parsing storage path:', storageError);
        // Continue with database deletion even if storage deletion fails
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
      console.log('🔔 Realtime should now broadcast deletion to all clients');
      
    } catch (error: any) {
      console.error('❌ Delete photo error:', error);
      throw error;
    }
  }
}));

export { defaultSettings };