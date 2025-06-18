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
  collages: Collage[];
  currentCollage: Collage | null;
  photos: Photo[];
  loading: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;
  isRealtimeConnected: boolean;
  lastRefreshTime: number;
  pollingInterval: NodeJS.Timeout | null;
  
  fetchCollages: () => Promise<void>;
  fetchCollageById: (id: string) => Promise<void>;
  fetchCollageByCode: (code: string) => Promise<Collage | null>;
  createCollage: (name: string) => Promise<Collage | null>;
  deleteCollage: (id: string) => Promise<void>;
  updateCollageName: (id: string, name: string) => Promise<void>;
  uploadPhoto: (collageId: string, file: File) => Promise<Photo>;
  deletePhoto: (id: string) => Promise<void>;
  fetchPhotosByCollageId: (collageId: string) => Promise<void>;
  refreshPhotos: (collageId: string) => Promise<void>;
  setupRealtimeSubscription: (collageId: string) => void;
  cleanupRealtimeSubscription: () => void;
  addPhotoToState: (photo: Photo) => void;
  removePhotoFromState: (photoId: string) => void;
  startPolling: (collageId: string) => void;
  stopPolling: () => void;
  updateCollageSettings: (collageId: string, settings: Partial<SceneSettings>) => Promise<any>;
}

export const useCollageStore = create<CollageStore>((set, get) => ({
  collages: [],
  currentCollage: null,
  photos: [],
  loading: false,
  error: null,
  realtimeChannel: null,
  isRealtimeConnected: false,
  lastRefreshTime: 0,
  pollingInterval: null,

  // Add photo to state
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

  // Remove photo from state
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

  fetchCollages: async () => {
    set({ loading: true, error: null });
    try {
      // Try to use the RPC function first
      try {
        const { data, error } = await supabase
          .rpc('get_collages_with_photo_count');
        
        if (error) throw error;
        
        const collagesWithCounts = data.map((collage: any) => ({
          ...collage,
          createdAt: collage.created_at,
          photoCount: collage.photo_count || 0
        }));
        
        set({ collages: collagesWithCounts as Collage[], loading: false });
        return;
      } catch (rpcError: any) {
        console.warn('RPC method failed, falling back to manual fetch:', rpcError.message);
        
        // Fallback to manual fetch if RPC fails
        const { data: collages, error: collagesError } = await supabase
          .from('collages')
          .select('*')
          .order('created_at', { ascending: false });

        if (collagesError) throw collagesError;
        
        // Fetch photo counts for each collage
        const collageIds = collages.map((c: any) => c.id);
        
        // Get counts for each collage
        const countPromises = collageIds.map(async (id: string) => {
          const { count, error } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('collage_id', id);
            
          return { id, count: count || 0, error };
        });
        
        const counts = await Promise.all(countPromises);
        
        // Create a map of collage_id to count
        const countMap: Record<string, number> = {};
        counts.forEach(item => {
          if (!item.error) {
            countMap[item.id] = item.count;
          }
        });
        
        // Map the collages with their counts
        const collagesWithCounts = collages.map((collage: any) => ({
          ...collage,
          createdAt: collage.created_at,
          photoCount: countMap[collage.id] || 0
        }));
        
        set({ collages: collagesWithCounts as Collage[], loading: false });
      }
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

  deleteCollage: async (collageId: string) => {
    try {
      console.log('🗑️ Starting collage deletion:', collageId);
      
      // Delete photos from storage
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId);
      
      if (photosError) throw photosError;
      
      // Delete each photo file from storage
      for (const photo of photos) {
        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove([photo.path]);
          
        if (storageError) {
          console.error('Failed to delete photo file:', photo.path, storageError);
        }
      }
      
      // Delete collage from database
      const { error: deleteError } = await supabase
        .from('collages')
        .delete()
        .eq('id', collageId);
        
      if (deleteError) throw deleteError;
      
      // Update local state
      set(state => ({
        collages: state.collages.filter(c => c.id !== collageId),
        currentCollage: state.currentCollage?.id === collageId ? null : state.currentCollage
      }));
      
      console.log('✅ Collage deleted successfully:', collageId);
    } catch (error: any) {
      console.error('Failed to delete collage:', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateCollageName: async (collageId: string, name: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('collages')
        .update({ name })
        .eq('id', collageId);
        
      if (error) throw error;
      
      set(state => ({
        collages: state.collages.map(c => 
          c.id === collageId ? { ...c, name } : c
        ),
        currentCollage: state.currentCollage?.id === collageId 
          ? { ...state.currentCollage, name } 
          : state.currentCollage
      }));
      
      return true;
      
    } catch (error: any) {
      set({ error: error.message });
      throw error;
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
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Realtime failed, falling back to polling');
          set({ isRealtimeConnected: false });
          get().startPolling(collageId);
        } else if (status === 'CLOSED') {
          console.log('🔌 Realtime connection closed');
          set({ isRealtimeConnected: false });
        }
      });

    set({ realtimeChannel: channel });

    // Fallback to polling after 5 seconds if realtime doesn't connect
    setTimeout(() => {
      if (!get().isRealtimeConnected) {
        console.log('⏰ Realtime timeout, starting polling fallback');
        get().startPolling(collageId);
      }
    }, 5000);
  },
  
  cleanupRealtimeSubscription: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      console.log('🧹 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      set({ realtimeChannel: null, isRealtimeConnected: false });
    }
    get().stopPolling();
  },
  
  startPolling: (collageId: string) => {
    get().stopPolling();
    
    console.log('🔄 Starting polling for collage:', collageId);
    
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('photos')
          .select('*')
          .eq('collage_id', collageId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const currentPhotoIds = get().photos.map(p => p.id).sort().join(',');
        const newPhotoIds = (data || []).map(p => p.id).sort().join(',');
        
        if (currentPhotoIds !== newPhotoIds) {
          console.log('📡 Polling detected changes, updating state');
          set({ 
            photos: data as Photo[], 
            lastRefreshTime: Date.now() 
          });
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
      console.log('🛑 Stopping polling');
      clearInterval(interval);
      set({ pollingInterval: null });
    }
  }
}));