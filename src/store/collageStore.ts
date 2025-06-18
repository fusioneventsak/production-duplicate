import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Helper function for deep merging objects
function deepMerge(target: any, source: any): any {
  if (!source) return target;
  const output = { ...target };
  
  Object.keys(source).forEach(key => {
    if (source[key] instanceof Object) {
      if (key in target) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    } else {
      output[key] = source[key];
    }
  });
  
  return output;
}

// Helper function to get file URL
const getFileUrl = (bucket: string, path: string): string => {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

interface CollageStore {
  collages: Collage[];
  currentCollage: Collage | null;
  channel: RealtimeChannel | null;
  lastRefreshTime: number;
  pollingInterval: NodeJS.Timeout | null;
  updateCollageSettings: (collageId: string, settings: Partial<SceneSettings>) => Promise<void>;
  settings: any;
}

export interface SceneSettings {
  animationPattern?: string;
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
  floorEnabled?: boolean;
  gridEnabled?: boolean;
  ambientLightIntensity?: number;
  spotlightIntensity?: number;
  [key: string]: any;
}

export const useCollageStore = create<CollageStore>((set, get) => ({
  collages: [],
  currentCollage: null,
  channel: null,
  settings: {},
  lastRefreshTime: 0,
  pollingInterval: null,

  updateCollageSettings: async (collageId: string, settings: Partial<SceneSettings>) => {
    try {
      const currentCollage = get().currentCollage;
      if (!currentCollage) throw new Error('No current collage');

      const mergedSettings = deepMerge(currentCollage.settings || {}, settings);

      const { data, error } = await supabase
        .from('collage_settings')
        .update({ 
          collage_id: currentCollage.id,
          settings: mergedSettings
        });

      if (error) throw error;

      set(state => ({
        currentCollage: {
          ...state.currentCollage!,
          settings: mergedSettings
        }
      }));

    } catch (error) {
      console.error('❌ Update settings error:', error);
      throw error;
    }
  },
  
  // Add the rest of the store methods here
}));