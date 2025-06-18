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
  spotlightIntensity: 0.8
};

export interface Photo {
  id: string;
  collage_id: string;
  url: string;
  created_at: string;
  storage_path?: string;
}

export interface Collage {
  id: string;
  name: string;
  code: string;
  created_at: string;
  createdAt?: string;
  settings: any;
  photoCount?: number;
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

// Store interface
interface CollageStore {
  collages: Collage[];
  currentCollage: Collage | null;
  photos: Photo[];
  loading: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;
  
  fetchCollages: () => Promise<void>;
  fetchCollageById: (id: string) => Promise<void>;
  createCollage: (name: string) => Promise<Collage | null>;
  deleteCollage: (id: string) => Promise<void>;
  updateCollageName: (id: string, name: string) => Promise<void>;
  uploadPhoto: (collageId: string, file: File) => Promise<Photo>;
  deletePhoto: (id: string) => Promise<void>;
  fetchPhotosByCollageId: (collageId: string) => Promise<void>;
  refreshPhotos: (collageId: string) => Promise<void>;
  setupRealtimeSubscription: (collageId: string) => void;
  cleanupRealtimeSubscription: () => void;
}

export const useCollageStore = create<CollageStore>((set, get) => ({
  collages: [],
  currentCollage: null,
  photos: [],
  loading: false,
  error: null,
  realtimeChannel: null,

  fetchCollages: async () => {
    set({ loading: true, error: null });
    try {
      // Fetch collages
      const { data: collages, error: collagesError } = await supabase
        .from('collages')
        .select('*')
        .order('created_at', { ascending: false });

      if (collagesError) throw collagesError;
      
      // Fetch photo counts for each collage
      const collageIds = collages.map(c => c.id);
      const { data: photoCounts, error: countsError } = await supabase
        .from('photos')
        .select('collage_id, count')
        .in('collage_id', collageIds)
        .count();
      
      if (countsError) throw countsError;
      
      // Create a map of collage_id to count
      const countMap: Record<string, number> = {};
      photoCounts.forEach((item: any) => {
        countMap[item.collage_id] = item.count;
      });
      
      // Map the collages with their counts
      const collagesWithCounts = collages.map((collage: any) => ({
        ...collage,
        createdAt: collage.created_at,
        photoCount: countMap[collage.id] || 0
      }));
      
      set({ collages: collagesWithCounts as Collage[], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createCollage: async (name: string) => {
    try {
      const code = nanoid(6);
      // Convert to uppercase for better readability
      const upperCode = code.toUpperCase();
      
      const { data, error } = await supabase
        .from('collages')
        .insert({ name, code: upperCode })
        .select()
        .single();

      if (error) throw error;
      
      // Add to local state
      set(state => ({
        collages: [data, ...state.collages]
      }));
      
      return data;
    } catch (error: any) {
      set({ error: error.message });
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
        settings: settings?.settings || defaultSettings
      };

      set({ currentCollage: collageWithSettings as Collage, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteCollage: async (collageId: string) => {
    try {
      console.log('🗑️ Starting collage deletion:', collageId);
      
      // Delete the collage (cascade will handle photos and settings)
      const { error } = await supabase
        .from('collages')
        .delete()
        .eq('id', collageId);
        
      if (error) throw error;
      
      // Update local state by removing the deleted collage
      set((state) => ({
        collages: state.collages.filter((c) => c.id !== collageId),
        // If the current collage is the one being deleted, clear it
        currentCollage: state.currentCollage?.id === collageId ? null : state.currentCollage
      }));
      
      console.log('✅ Collage deleted successfully:', collageId);
      
    } catch (error: any) {
      console.error('❌ Delete collage error:', error.message);
      throw error;
    }
  },

  updateCollageName: async (collageId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('collages')
        .update({ name })
        .eq('id', collageId);
        
      if (error) throw error;
      
      // Update both the collages list and currentCollage if it's the same one
      set((state) => ({
        collages: state.collages.map((c) => 
          c.id === collageId ? { ...c, name } : c
        ),
        currentCollage: state.currentCollage?.id === collageId 
          ? { ...state.currentCollage, name }
          : state.currentCollage
      }));
      
    } catch (error: any) {
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
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${collageId}/${nanoid()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) throw uploadError;

      console.log('✅ File uploaded to storage:', uploadData.path);
      
      // Get public URL
      const publicUrl = getFileUrl('photos', uploadData.path);
      console.log('🔗 Public URL:', publicUrl);
      
      // Create photo record
      const { data, error: dbError } = await supabase
        .from('photos')
        .insert({
          collage_id: collageId,
          url: publicUrl,
          storage_path: uploadData.path
        })
        .select()
        .single();
        
      if (dbError) throw dbError;
      
      console.log('✅ Photo record created:', data.id);
      console.log('🔔 Realtime should now broadcast new photo to all clients');
      
      return data;
      
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
        .select('url, storage_path')
        .eq('id', photoId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching photo for deletion:', fetchError);
        throw fetchError;
      }

      // If we have a storage path, delete from storage
      if (photo.storage_path) {
        console.log('🗑️ Deleting from storage:', photo.storage_path);

        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove([photo.storage_path]);

        if (storageError) {
          console.warn('⚠️ Storage deletion warning:', storageError);
          // Don't throw here - continue with database deletion
        }
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
      
      // Also remove from local state for immediate UI update
      set((state) => ({
        photos: state.photos.filter((p) => p.id !== photoId)
      }));
      
    } catch (error: any) {
      console.error('❌ Delete photo error:', error);
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
      set({ photos: data as Photo[] });
      
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
      set({ photos: data as Photo[], error: null });
      
    } catch (error: any) {
      console.error('❌ Refresh photos error:', error);
      set({ error: error.message });
      throw error;
    }
  },
  
  setupRealtimeSubscription: (collageId: string) => {
    // Implement this
  },
  
  cleanupRealtimeSubscription: () => {
    // Implement this
  }
}));