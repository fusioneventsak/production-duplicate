import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { nanoid } from 'nanoid';
import { type RealtimeChannel } from '@supabase/supabase-js';

// Helper function to get file URL
const getFileUrl = (bucket: string, path: string): string => {
  return `${supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl}`;
};

// State
interface Photo {
  id: string;
  url: string;
  collage_id: string;
  created_at: string;
}

interface SceneSettings {
  photoCount?: number;
  photoSize?: number;
  emptySlotColor?: string;
  backgroundColor?: string;
  backgroundGradient?: boolean;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  backgroundGradientAngle?: number;
  animationPattern?: string;
  photoBrightness?: number;
}

interface Collage {
  id: string;
  name: string;
  code: string;
  created_at: string;
  settings: SceneSettings;
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
  fetchCollages: () => Promise<Collage[]>;
  fetchCollageByCode: (code: string) => Promise<Collage | null>;
  fetchCollageById: (id: string) => Promise<Collage | null>;
  createCollage: (name: string) => Promise<Collage | null>;
  updateCollageSettings: (collageId: string, settings: Partial<SceneSettings>) => Promise<any>;
  uploadPhoto: (collageId: string, file: File) => Promise<Photo | null>;
  deletePhoto: (photoId: string) => Promise<void>;
  fetchPhotosByCollageId: (collageId: string) => Promise<void>;
  refreshPhotos: (collageId: string) => Promise<void>;
  setupRealtimeSubscription: (collageId: string) => void;
  cleanupRealtimeSubscription: () => void;
  startPolling: (collageId: string) => void;
  stopPolling: () => void;
  addPhotoToState: (photo: Photo) => void;
  removePhotoFromState: (photoId: string) => void;
}

const defaultSettings: SceneSettings = {
  photoCount: 100,
  photoSize: 4.0,
  emptySlotColor: '#1A1A1A',
  backgroundColor: '#000000',
  backgroundGradient: false,
  backgroundGradientStart: '#000000',
  backgroundGradientEnd: '#000000',
  backgroundGradientAngle: 45,
  animationPattern: 'grid',
  photoBrightness: 1.0
};

export const useCollageStore = create<CollageStore>((set, get) => ({
  photos: [],
  currentCollage: null,
  loading: false,
  error: null,
  collages: [],
  realtimeChannel: null,
  isRealtimeConnected: false,
  lastRefreshTime: 0,
  pollingInterval: null,

  // Add photo to state
  addPhotoToState: (photo: Photo) => {
    set((state) => {
      const exists = state.photos.some(p => p.id === photo.id);
      if (exists) return state;
      
      return {
        photos: [...state.photos, photo],
        lastRefreshTime: Date.now()
      };
    });
  },

  // Remove photo from state
  removePhotoFromState: (photoId: string) => {
    console.log('🗑️ Removing photo from state:', photoId);
    set((state) => {
      return {
        photos: state.photos.filter(p => p.id !== photoId),
        lastRefreshTime: Date.now()
      };
    });
  },

  // Realtime subscription with error handling
  setupRealtimeSubscription: (collageId: string) => {
    // Clean up existing
    get().cleanupRealtimeSubscription();
    
    const channel = supabase
      .channel(`collage:${collageId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'photos',
        filter: `collage_id=eq.${collageId}`
      }, (payload) => {
        console.log('📥 Realtime: New photo', payload);
        get().addPhotoToState(payload.new as Photo);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'photos',
        filter: `collage_id=eq.${collageId}`
      }, (payload) => {
        console.log('🗑️ Realtime: Deleted photo', payload);
        get().removePhotoFromState(payload.old.id);
      })
      .subscribe((status) => {
        console.log('🔌 Realtime status:', status);
        set({ isRealtimeConnected: status === 'SUBSCRIBED' });
      });
    
    set({ realtimeChannel: channel });
    
    // Start polling as fallback after 5s if not connected
    setTimeout(() => {
      if (!get().isRealtimeConnected) {
        console.log('⚠️ Realtime not connected after 5s, starting polling');
        get().startPolling(collageId);
      }
    }, 5000);
  },

  // Cleanup subscription
  cleanupRealtimeSubscription: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      channel.unsubscribe();
      set({ realtimeChannel: null, isRealtimeConnected: false });
    }
  },

  // Polling fallback
  startPolling: (collageId: string) => {
    get().stopPolling();
    
    const interval = setInterval(() => {
      if (!get().isRealtimeConnected) {
        get().refreshPhotos(collageId);
      }
    }, 3000);
    
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    if (get().pollingInterval) {
      clearInterval(get().pollingInterval);
      set({ pollingInterval: null });
    }
  },

  fetchCollages: async (): Promise<Collage[]> => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('collages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const collages = data as Collage[];
      set({ collages, loading: false });
      return collages;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return [];
    }
  },

  fetchCollageByCode: async (code: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('collages')
        .select('*')
        .eq('code', code)
        .single();

      if (error) throw error;
      set({ currentCollage: data as Collage, loading: false });
      return data as Collage;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  fetchCollageById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('collages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      set({ currentCollage: data as Collage, loading: false });
      return data as Collage;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  createCollage: async (name: string) => {
    set({ loading: true, error: null });
    try {
      // Generate a code that matches the required format (4 or 8 uppercase alphanumeric characters)
      const code = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, '0');
      
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .insert([{ name, code }])
        .select()
        .single();

      if (collageError) throw collageError;

      const collageWithSettings = {
        ...collage,
        settings: defaultSettings
      };

      set({ 
        currentCollage: collageWithSettings as Collage,
        loading: false 
      });
      
      return collageWithSettings as Collage;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  updateCollageSettings: async (collageId: string, settings: Partial<SceneSettings>) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('collage_settings')
        .upsert({ 
          collage_id: collageId,
          settings: settings
        })
        .select()
        .single();

      if (error) throw error;
      set({ loading: false });
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchPhotosByCollageId: async (collageId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ photos: data as Photo[], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  refreshPhotos: async (collageId: string) => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId)
        .gt('created_at', new Date(get().lastRefreshTime).toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        data.forEach(photo => get().addPhotoToState(photo as Photo));
      }
    } catch (error) {
      console.error('Failed to refresh photos:', error);
    }
  },

  // Upload photo with error handling
  uploadPhoto: async (collageId: string, file: File) => {
    try {
      console.log('📤 Starting photo upload:', file.name);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${nanoid()}.${fileExt}`;
      const filePath = `${collageId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const photoUrl = getFileUrl('photos', filePath);
      
      const { data: photo, error: insertError } = await supabase
        .from('photos')
        .insert([{
          collage_id: collageId,
          url: photoUrl
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      console.log('✅ Upload complete:', photo);
      return photo as Photo;
      
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  },

  // Delete photo with error handling
  deletePhoto: async (photoId: string) => {
    try {
      console.log('🗑️ Starting photo deletion:', photoId);
      
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);
      
      if (error) throw error;
      
      console.log('✅ Photo deleted:', photoId);
      
    } catch (error: any) {
      console.error('❌ Delete photo error:', error);
      throw error;
    }
  }
}));