// src/store/collageStore.ts - CLEAN VERSION (NO JSX/REACT COMPONENTS)
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  user_id: string;
  created_at: string;
  updated_at: string;
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

  // Fetch all collages for the current user
  fetchCollages: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('collages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ collages: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch collage by code (for public viewing)
  fetchCollageByCode: async (code: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('collages')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (error) throw error;
      
      set({ 
        currentCollage: data, 
        loading: false,
        lastRefreshTime: Date.now()
      });
      
      // Fetch photos for this collage
      await get().fetchPhotosByCollageId(data.id);
      
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false, currentCollage: null });
      return null;
    }
  },

  // Fetch collage by ID (for editing)
  fetchCollageById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('collages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      set({ 
        currentCollage: data, 
        loading: false,
        lastRefreshTime: Date.now()
      });
      
      // Fetch photos for this collage
      await get().fetchPhotosByCollageId(data.id);
      
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false, currentCollage: null });
      return null;
    }
  },

  // Create new collage
  createCollage: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate unique code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('collages')
        .insert({
          name,
          code,
          user_id: user.id,
          settings: {
            animationPattern: 'grid',
            photoCount: 50,
            animationSpeed: 50,
            backgroundColor: '#000000'
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      set({ currentCollage: data, loading: false });
      
      // Refresh collages list
      await get().fetchCollages();
      
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Update collage settings
  updateCollageSettings: async (collageId: string, settings: Partial<SceneSettings>) => {
    try {
      const { data, error } = await supabase
        .from('collages')
        .update({ 
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', collageId)
        .select()
        .single();

      if (error) throw error;
      
      set({ currentCollage: data });
      return data;
    } catch (error: any) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  },

  // Upload photo
  uploadPhoto: async (collageId: string, file: File) => {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `collages/${collageId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Save to database
      const { data, error } = await supabase
        .from('photos')
        .insert({
          collage_id: collageId,
          url: publicUrl
        })
        .select()
        .single();

      if (error) throw error;
      
      // Add to state
      get().addPhotoToState(data);
      
      return data;
    } catch (error: any) {
      console.error('Upload failed:', error);
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
      
      // Remove from state
      get().removePhotoFromState(photoId);
    } catch (error: any) {
      console.error('Delete failed:', error);
      throw error;
    }
  },

  // Fetch photos for a collage
  fetchPhotosByCollageId: async (collageId: string) => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      set({ 
        photos: data || [],
        lastRefreshTime: Date.now()
      });
    } catch (error: any) {
      console.error('Failed to fetch photos:', error);
      set({ error: error.message });
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