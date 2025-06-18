import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { nanoid } from 'nanoid';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Helper function to get file URL
const getFileUrl = (bucket: string, path: string): string => {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

// Store interface
interface CollageStore {
  loading: boolean;
  error: string | null;
  collages: Collage[];
  currentCollage: Collage | null;
  photos: Photo[];
  realtimeChannel: RealtimeChannel | null;
  
  // Collage methods
  fetchCollages: () => Promise<void>;
  createCollage: (name: string) => Promise<Collage | null>;
  fetchCollageById: (id: string) => Promise<Collage | null>;
  updateCollageSettings: (collageId: string, settings: Partial<SceneSettings>) => Promise<void>;
  
  // Photo methods
  uploadPhoto: (collageId: string, file: File) => Promise<Photo>;
  deletePhoto: (photoId: string) => Promise<void>;
  fetchPhotosByCollageId: (collageId: string) => Promise<void>;
  refreshPhotos: (collageId: string) => Promise<void>;
  
  // New methods for collage management
  deleteCollage: (collageId: string) => Promise<boolean>;
  updateCollageName: (collageId: string, name: string) => Promise<Collage | null>;
  
  // Real-time subscription methods
  setupRealtimeSubscription: (collageId: string) => void;
  cleanupRealtimeSubscription: () => void;
}

export const useCollageStore = create<CollageStore>((set, get) => ({
  loading: false,
  error: null,
  collages: [],
  currentCollage: null,
  photos: [],
  realtimeChannel: null,

  fetchCollages: async () => {
    set({ loading: true, error: null });
    try {
      // Fetch collages with photo counts
      const { data, error } = await supabase.rpc('get_collages_with_photo_count');

      if (error) throw error;
      
      // Map the result to match our Collage type with photoCount
      const collagesWithCounts = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        user_id: item.user_id,
        created_at: item.created_at,
        createdAt: item.created_at,
        photoCount: item.photo_count || 0
      }));
      
      set({ collages: collagesWithCounts as Collage[], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createCollage: async (name: string) => {
    try {
      const code = nanoid(6);
      const { data, error } = await supabase
        .from('collages')
        .insert({ name, code })
        .select()
        .single();

      if (error) throw error;
      return data as Collage;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },
  
  // Delete a collage and all its associated data
  deleteCollage: async (collageId: string) => {
    try {
      console.log('🗑️ Deleting collage:', collageId);
      
      // Delete the collage (cascade will handle photos and settings)
      const { error } = await supabase
        .from('collages')
        .delete()
        .eq('id', collageId);

      if (error) throw error;
      
      // Update local state by removing the deleted collage
      set((state) => ({
        collages: state.collages.filter(c => c.id !== collageId),
        // If the current collage is the one being deleted, clear it
        currentCollage: state.currentCollage?.id === collageId ? null : state.currentCollage
      }));
      
      console.log('✅ Collage deleted successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Delete collage error:', error);
      throw error;
    }
  },
  
  // Update collage name
  updateCollageName: async (collageId: string, name: string) => {
    try {
      console.log('✏️ Updating collage name:', collageId, name);
      
      const { data, error } = await supabase
        .from('collages')
        .update({ name })
        .eq('id', collageId)
        .select()
        .single();

      if (error) throw error;
      
      // Update both the collages list and currentCollage if it's the same one
      set((state) => ({
        collages: state.collages.map(c => 
          c.id === collageId ? { ...c, name } : c
        ),
        currentCollage: state.currentCollage?.id === collageId 
          ? { ...state.currentCollage, name } 
          : state.currentCollage
      }));
      
      console.log('✅ Collage name updated successfully');
      return data as Collage;
    } catch (error: any) {
      console.error('❌ Update collage name error:', error);
      throw error;
    }
  },

  updateCollageSettings: async (collageId: string, settings: Partial<SceneSettings>) => {
    try {
      const currentCollage = get().currentCollage;
      if (!currentCollage) return;

      const { error } = await supabase
        .from('collage_settings')
        .upsert({
          collage_id: collageId,
          ...settings
        });

      if (error) throw error;

      set(state => ({
        currentCollage: {
          ...state.currentCollage!,
          settings: {
            ...state.currentCollage!.settings,
            ...settings
          }
        }
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  uploadPhoto: async (collageId: string, file: File) => {
    try {
      console.log('📤 Starting photo upload:', file.name);
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${collageId}/${nanoid()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const url = getFileUrl('photos', filePath);
      
      // Create photo record
      const { data, error: dbError } = await supabase
        .from('photos')
        .insert({
          collage_id: collageId,
          url,
          storage_path: filePath
        })
        .select()
        .single();
        
      if (dbError) throw dbError;
      
      // Update local state
      set(state => ({
        photos: [...state.photos, data]
      }));
      
      console.log('✅ Photo uploaded successfully:', url);
      console.log('🔔 Realtime should now broadcast new photo to all clients');
      
      return data as Photo;
      
    } catch (error: any) {
      console.error('❌ Upload photo error:', error.message || error);
      throw error;
    }
  },

  deletePhoto: async (photoId: string) => {
    try {
      console.log('🗑️ Starting photo deletion:', photoId);
      
      // Get photo storage path
      const { data: photo, error: fetchError } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('id', photoId)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([photo.storage_path]);
        
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);
        
      if (dbError) throw dbError;
      
      console.log('✅ Photo deleted successfully:', photoId);
      console.log('🔔 Realtime should now broadcast deletion to all clients');
      
      // Also remove from local state for immediate UI update
      set(state => ({
        photos: state.photos.filter(p => p.id !== photoId)
      }));
      
    } catch (error: any) {
      console.error('❌ Delete photo error:', error.message || error);
      throw error;
    }
  }
}));