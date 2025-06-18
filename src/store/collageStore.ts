import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { nanoid } from 'nanoid';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Helper function to get file URL
const getFileUrl = (bucket: string, path: string): string => {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

// Core actions
interface CollageStore {
  collages: Collage[];
  currentCollage: Collage | null;
  photos: Photo[];
  loading: boolean;
  error: Error | null;
  isRealtimeConnected: boolean;
  realtimeChannel: RealtimeChannel | null;
  lastRefreshTime: number;
  pollingInterval: NodeJS.Timeout | null;

  // Core actions
  fetchCollages: () => Promise<void>;
  fetchCollageByCode: (code: string) => Promise<Collage | null>;
  fetchCollageById: (id: string) => Promise<Collage | null>;
  createCollage: (name: string) => Promise<Collage>;
  updateCollageSettings: (settings: Partial<CollageSettings>) => Promise<void>;
  uploadPhoto: (collageId: string, file: File) => Promise<void>;
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
  collages: [],
  currentCollage: null,
  photos: [],
  loading: false,
  error: null,
  isRealtimeConnected: false,
  realtimeChannel: null,
  lastRefreshTime: 0,
  pollingInterval: null,

  // Add photo to state - ENHANCED
  addPhotoToState: (photo: Photo) => {
    set((state) => {
      const exists = state.photos.some((p) => p.id === photo.id);
      if (exists) {
        console.log('🔄 Photo already exists in state:', photo.id);
        return state;
      }
      
      console.log('➕ Adding new photo to state:', photo.id);
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
      const newPhotos = state.photos.filter((p) => p.id !== photoId);
      const afterCount = newPhotos.length;
      
      console.log(`🗑️ Photos: ${beforeCount} -> ${afterCount}`);
      
      return {
        photos: newPhotos,
        lastRefreshTime: Date.now()
      };
    });
  },

  // Set up realtime subscription - ENHANCED
  setupRealtimeSubscription: (collageId: string) => {
    // Cleanup existing subscription if any
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
                p.id === payload.new.id ? { ...p, ...payload.new } : p
              ),
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
          // Stop polling since realtime is working
          get().stopPolling();
        } else {
          console.log('⚠️ Realtime not connected, falling back to polling');
          set({ isRealtimeConnected: false });
          // Start polling as fallback
          get().startPolling(collageId);
        }
      });

    set({ realtimeChannel: channel });
  },

  // Cleanup realtime subscription
  cleanupRealtimeSubscription: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      console.log('🧹 Cleaning up realtime subscription');
      channel.unsubscribe();
      set({ realtimeChannel: null, isRealtimeConnected: false });
    }
  },

  // Start polling as fallback
  startPolling: (collageId: string) => {
    console.log('🔄 Starting polling for collage:', collageId);
    
    // Clear any existing interval
    get().stopPolling();
    
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('photos') 
          .select('*')
          .eq('collage_id', collageId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const lastRefresh = get().lastRefreshTime;
          const hasChanges = data.some(photo => {
            const existingPhoto = get().photos.find(p => p.id === photo.id);
            return !existingPhoto || new Date(photo.created_at) > new Date(lastRefresh);
          });

          if (hasChanges) {
            console.log('🔄 Poll detected changes, updating state');
            set({ photos: data, lastRefreshTime: Date.now() });
          }
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

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
      console.log('🔄 Refreshing photos for collage:', collageId);
      
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        set({ photos: data, lastRefreshTime: Date.now() });
      }
    } catch (error) {
      console.error('❌ Refresh photos error:', error);
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

      if (data) {
        set({ photos: data, lastRefreshTime: Date.now() });
      }
    } catch (error) {
      console.error('❌ Fetch photos error:', error);
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

      set({ collages: data || [], loading: false });
    } catch (error: any) {
      console.error('❌ Fetch collages error:', error);
      set({ error, loading: false });
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
      
      return collageWithSettings;
    } catch (error: any) {
      console.error('❌ Fetch collage by code error:', error);
      set({ error, loading: false });
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
        .eq('collage_id', collage.id)
        .single();

      const collageWithSettings = {
        ...collage,
        settings: settings?.settings ? deepMerge(defaultSettings, settings.settings) : defaultSettings
      } as Collage; 

      set({ currentCollage: collageWithSettings, loading: false });
      
      return collageWithSettings;
    } catch (error: any) {
      console.error('❌ Fetch collage by ID error:', error);
      set({ error, loading: false });
      return null;
    }
  },

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

      const { error: settingsError } = await supabase
        .from('collage_settings')
        .insert([{
          collage_id: collage.id,
          settings: defaultSettings
        }]);

      if (settingsError) throw settingsError;

      const collageWithSettings = {
        ...collage,
        settings: defaultSettings
      } as Collage; 

      set((state) => ({
        collages: [collageWithSettings, ...state.collages],
        currentCollage: collageWithSettings,
        loading: false
      }));

      return collageWithSettings;
    } catch (error: any) {
      console.error('❌ Create collage error:', error);
      set({ error, loading: false });
      throw error;
    }
  },

  updateCollageSettings: async (settings: Partial<CollageSettings>) => {
    try {
      const currentCollage = get().currentCollage;
      if (!currentCollage) throw new Error('No current collage');

      const mergedSettings = deepMerge(currentCollage.settings, settings); 

      const { data, error } = await supabase
        .from('collage_settings')
        .upsert({
          collage_id: currentCollage.id,
          settings: mergedSettings
        });

      if (error) throw error;

      set((state) => ({
        currentCollage: {
          ...state.currentCollage!,
          settings: mergedSettings
        }
      }));
    } catch (error: any) {
      console.error('❌ Update settings error:', error);
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

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${collageId}/${nanoid()}.${fileExt}`;
      
      console.log('📤 Uploading to storage:', fileName);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw uploadError;
      } 

      console.log('✅ File uploaded to storage:', uploadData.path);

      // Get public URL
      const publicUrl = getFileUrl('photos', uploadData.path);
      console.log('🔗 Public URL:', publicUrl);

      // Create database record
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
        throw dbError;
      }

      console.log('✅ Photo record created:', photo.id);
      console.log('🔔 Realtime should now broadcast insertion to all clients');

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
        console.error('❌ Fetch photo error:', fetchError);
        throw fetchError;
      }

      // Extract storage path from URL
      const url = new URL(photo.url);
      const pathParts = url.pathname.split('/');
      const storagePath = pathParts.slice(-2).join('/'); // Get collage_id/filename 

      console.log('🗑️ Deleting from storage:', storagePath);

      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('photos')
        .remove([storagePath]);

      if (storageError) {
        console.error('❌ Storage delete error:', storageError);
        throw storageError;
      }

      console.log('✅ Storage file deleted');

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete() 
        .eq('id', photoId);

      if (dbError) {
        console.error('❌ Database delete error:', dbError);
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