// src/components/CollageScene.tsx - FIXED: Stable rendering during uploads
import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { type SceneSettings } from '../../store/sceneStore';
import { PatternFactory } from './patterns/PatternFactory';
import { addCacheBustToUrl } from '../../lib/supabase';
import { useCollageStore } from '../../store/collageStore';

type Photo = {
  id: string;
  url: string;
  collage_id?: string;
  created_at?: string;
};

type CollageSceneProps = {
  settings: SceneSettings;
  onSettingsChange?: (settings: Partial<SceneSettings>, debounce?: boolean) => void;
};

type PhotoWithPosition = Photo & {
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  displayIndex?: number;
  slotIndex: number;
};

// Adjusted smoothing values for float pattern
const POSITION_SMOOTHING = 0.1;
const ROTATION_SMOOTHING = 0.1;
const TELEPORT_THRESHOLD = 30;

// ENHANCED: Stable slot assignment system that preserves slots during uploads
class SlotManager {
  private slotAssignments = new Map<string, number>();
  private occupiedSlots = new Set<number>();
  private availableSlots: number[] = [];
  private totalSlots = 0;
  private lastAssignmentSnapshot = new Map<string, number>(); // For stability tracking

  constructor(totalSlots: number) {
    this.updateSlotCount(totalSlots);
  }

  updateSlotCount(newTotal: number) {
    if (newTotal === this.totalSlots) return;
    
    this.totalSlots = newTotal;
    
    for (const [photoId, slotIndex] of this.slotAssignments.entries()) {
      if (slotIndex >= newTotal) {
        this.slotAssignments.delete(photoId);
        this.occupiedSlots.delete(slotIndex);
      }
    }
    
    this.rebuildAvailableSlots();
  }

  private rebuildAvailableSlots() {
    this.availableSlots = [];
    for (let i = 0; i < this.totalSlots; i++) {
      if (!this.occupiedSlots.has(i)) {
        this.availableSlots.push(i);
      }
    }
    // Sort available slots to ensure consistent assignment order
    this.availableSlots.sort((a, b) => a - b);
  }

  // CRITICAL FIX: Only assign new slots to new photos, preserve existing assignments
  assignSlots(photos: Photo[]): Map<string, number> {
    const safePhotos = Array.isArray(photos) ? photos : [];
    
    // Create snapshot of current assignments for stability comparison
    const currentSnapshot = new Map(this.slotAssignments);
    
    // Remove assignments for photos that no longer exist
    const currentPhotoIds = new Set(safePhotos.map(p => p.id));
    for (const [photoId, slotIndex] of this.slotAssignments.entries()) {
      if (!currentPhotoIds.has(photoId)) {
        this.slotAssignments.delete(photoId);
        this.occupiedSlots.delete(slotIndex);
      }
    }

    // Rebuild available slots after cleanup
    this.rebuildAvailableSlots();

    // ONLY assign slots to NEW photos that don't have assignments yet
    for (const photo of safePhotos) {
      if (!this.slotAssignments.has(photo.id) && this.availableSlots.length > 0) {
        const newSlot = this.availableSlots.shift()!;
        this.slotAssignments.set(photo.id, newSlot);
        this.occupiedSlots.add(newSlot);
      }
    }

    // Check if assignments changed (for debugging)
    const assignmentsChanged = currentSnapshot.size !== this.slotAssignments.size ||
      Array.from(currentSnapshot.entries()).some(([id, slot]) => 
        this.slotAssignments.get(id) !== slot
      );

    if (assignmentsChanged) {
      console.log('🎯 SLOT MANAGER: Assignments updated');
      console.log('🎯 Before:', Array.from(currentSnapshot.entries()));
      console.log('🎯 After:', Array.from(this.slotAssignments.entries()));
    }

    this.lastAssignmentSnapshot = new Map(this.slotAssignments);
    return new Map(this.slotAssignments);
  }

  getStabilityStats() {
    return {
      totalSlots: this.totalSlots,
      assignedSlots: this.slotAssignments.size,
      availableSlots: this.availableSlots.length,
      occupiedSlots: this.occupiedSlots.size,
    };
  }
}

// Controls component
const Controls: React.FC<{ settings: SceneSettings }> = ({ settings }) => {
  const controlsRef = useRef<any>();

  return settings.controlsEnabled ? (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={200}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI - Math.PI / 6}
      enableDamping={true}
      dampingFactor={0.05}
    />
  ) : null;
};

// CRITICAL FIX: Animation Controller with stable updates
const AnimationController: React.FC<{
  settings: SceneSettings;
  photos: Photo[];
  onPositionsUpdate: (photos: PhotoWithPosition[]) => void;
}> = ({ settings, photos, onPositionsUpdate }) => {
  const slotManagerRef = useRef(new SlotManager(settings.photoCount));
  const lastPhotoCount = useRef(settings.photoCount);
  const lastPositionsRef = useRef<PhotoWithPosition[]>([]);
  
  // Track photo changes more granularly
  const currentPhotoIds = useMemo(() => 
    (photos || []).map(p => p.id).sort().join(','), 
    [photos]
  );
  
  const lastPhotoIds = useRef(currentPhotoIds);
  const animationFrameRef = useRef<number>();
  
  const updatePositions = useCallback((time: number = 0) => {
    const safePhotos = Array.isArray(photos) ? photos : [];

    // Get STABLE slot assignments - only new photos get new slots
    const slotAssignments = slotManagerRef.current.assignSlots(safePhotos);
    
    // Generate pattern positions
    const pattern = PatternFactory.createPattern(settings.animationPattern || 'grid', settings, safePhotos);
    const patternState = pattern.generatePositions(time);
    
    const photosWithPositions: PhotoWithPosition[] = [];
    
    // CRITICAL: Preserve existing photo positions, only add new photos to new slots
    for (const photo of safePhotos) {
      const slotIndex = slotAssignments.get(photo.id);
      if (slotIndex !== undefined && slotIndex < (settings.photoCount || 50)) {
        photosWithPositions.push({
          ...photo,
          targetPosition: patternState.positions[slotIndex] || [0, 0, 0],
          targetRotation: patternState.rotations?.[slotIndex] || [0, 0, 0],
          displayIndex: slotIndex,
          slotIndex,
        });
      }
    }
    
    // Add empty slots for remaining positions - STABLE ORDER
    for (let i = 0; i < (settings.photoCount || 50); i++) {
      const hasPhoto = photosWithPositions.some(p => p.slotIndex === i);
      if (!hasPhoto) {
        photosWithPositions.push({
          id: `placeholder-${i}`, // Stable ID for empty slots
          url: '',
          targetPosition: patternState.positions[i] || [0, 0, 0],
          targetRotation: patternState.rotations?.[i] || [0, 0, 0],
          displayIndex: i,
          slotIndex: i,
        });
      }
    }
    
    // CRITICAL: Always sort by slot index for consistent order
    photosWithPositions.sort((a, b) => a.slotIndex - b.slotIndex);
    
    // Only update if positions actually changed significantly
    const positionsChanged = photosWithPositions.length !== lastPositionsRef.current.length ||
      photosWithPositions.some((photo, index) => {
        const lastPhoto = lastPositionsRef.current[index];
        return !lastPhoto || 
               lastPhoto.id !== photo.id ||
               lastPhoto.targetPosition.some((pos, i) => Math.abs(pos - photo.targetPosition[i]) > 0.001);
      });

    if (positionsChanged) {
      lastPositionsRef.current = photosWithPositions;
      onPositionsUpdate(photosWithPositions);
    }
  }, [photos, settings, onPositionsUpdate]);

  // CRITICAL FIX: Only update immediately for photo count changes, not photo additions
  useEffect(() => {
    const photoCountChanged = settings.photoCount !== lastPhotoCount.current;
    
    if (photoCountChanged) {
      console.log('📊 PHOTO COUNT CHANGED: Force update');
      slotManagerRef.current.updateSlotCount(settings.photoCount);
      lastPhotoCount.current = settings.photoCount;
      updatePositions(0);
    }
  }, [settings.photoCount, updatePositions]);

  // ENHANCED: Handle photo changes more carefully - avoid immediate position updates
  useEffect(() => {
    if (currentPhotoIds !== lastPhotoIds.current) {
      console.log('📷 PHOTOS CHANGED: New upload detected');
      console.log('📷 Old IDs:', lastPhotoIds.current);
      console.log('📷 New IDs:', currentPhotoIds);
      
      // Don't force immediate position update - let animation frame handle it
      // This prevents jarring re-ordering during uploads
      lastPhotoIds.current = currentPhotoIds;
      
      // Cancel any pending animation frame and schedule a new one
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        updatePositions(0);
      });
    }
  }, [currentPhotoIds, updatePositions]);

  // Regular animation updates
  useFrame((state) => {
    const time = settings.animationEnabled ? 
      state.clock.elapsedTime * (settings.animationSpeed / 50) : 0;
    
    updatePositions(time);
  });

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return null;
};

// Background renderer
const BackgroundRenderer: React.FC<{ settings: SceneSettings }> = ({ settings }) => {
  const { scene, gl } = useThree();
  
  useEffect(() => {
    try {
      if (settings.backgroundGradient) {
        scene.background = null;
        gl.setClearColor('#000000', 0);
      } else {
        scene.background = new THREE.Color(settings.backgroundColor || '#000000');
        gl.setClearColor(settings.backgroundColor || '#000000', 1);
      }
    } catch (error) {
      console.error('Background render error:', error);
    }
  }, [
    scene, 
    gl, 
    settings.backgroundColor, 
    settings.backgroundGradient,
    settings.backgroundGradientStart,
    settings.backgroundGradientEnd,
    settings.backgroundGradientAngle
  ]);

  return null;
};

// ENHANCED: PhotoMesh with stable key and reduced re-renders
const PhotoMesh: React.FC<{
  photo: PhotoWithPosition;
  size: number;
  emptySlotColor: string;
  pattern: string;
  shouldFaceCamera: boolean;
  brightness: number;
}> = React.memo(({ photo, size, emptySlotColor, pattern, shouldFaceCamera, brightness }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isInitializedRef = useRef(false);
  const lastPositionRef = useRef<[number, number, number]>([0, 0, 0]);
  const currentPosition = useRef<THREE.Vector3>(new THREE.Vector3(...photo.targetPosition));
  const currentRotation = useRef<THREE.Euler>(new THREE.Euler(...photo.targetRotation));

  // Initialize position immediately to prevent jarring movements
  useEffect(() => {
    currentPosition.current.set(...photo.targetPosition);
    currentRotation.current.set(...photo.targetRotation);
  }, []);

  useEffect(() => {
    if (!photo.url) {
      setIsLoading(false);
      return;
    }

    const loader = new THREE.TextureLoader();
    setIsLoading(true);
    setHasError(false);

    const handleLoad = (loadedTexture: THREE.Texture) => {
      loadedTexture.minFilter = THREE.LinearFilter;
      loadedTexture.magFilter = THREE.LinearFilter;
      loadedTexture.format = THREE.RGBAFormat;
      loadedTexture.generateMipmaps = false;
      setTexture(loadedTexture);
      setIsLoading(false);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    const imageUrl = photo.url.includes('?') 
      ? `${photo.url}&t=${Date.now()}`
      : `${photo.url}?t=${Date.now()}`;

    loader.load(imageUrl, handleLoad, undefined, handleError);

    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [photo.url]);

  // Camera facing logic
  useFrame(() => {
    if (!meshRef.current || !shouldFaceCamera) return;

    const mesh = meshRef.current;
    const currentPositionArray = mesh.position.toArray() as [number, number, number];
    
    const positionChanged = currentPositionArray.some((coord, index) => 
      Math.abs(coord - lastPositionRef.current[index]) > 0.01
    );

    if (positionChanged || !isInitializedRef.current) {
      mesh.lookAt(camera.position);
      lastPositionRef.current = currentPositionArray;
      isInitializedRef.current = true;
    }
  });

  // ENHANCED: Smoother animation with better teleport detection
  useFrame(() => {
    if (!meshRef.current) return;

    const targetPosition = new THREE.Vector3(...photo.targetPosition);
    const targetRotation = new THREE.Euler(...photo.targetRotation);

    const distance = currentPosition.current.distanceTo(targetPosition);
    const isTeleport = distance > TELEPORT_THRESHOLD;

    if (isTeleport) {
      // Instant teleport for large movements
      currentPosition.current.copy(targetPosition);
      currentRotation.current.copy(targetRotation);
    } else {
      // Smooth interpolation for normal movement
      currentPosition.current.lerp(targetPosition, POSITION_SMOOTHING);
      currentRotation.current.x += (targetRotation.x - currentRotation.current.x) * ROTATION_SMOOTHING;
      currentRotation.current.y += (targetRotation.y - currentRotation.current.y) * ROTATION_SMOOTHING;
      currentRotation.current.z += (targetRotation.z - currentRotation.current.z) * ROTATION_SMOOTHING;
    }

    meshRef.current.position.copy(currentPosition.current);
    if (!shouldFaceCamera) {
      meshRef.current.rotation.copy(currentRotation.current);
    }
  });

  const material = useMemo(() => {
    if (texture) {
      const brightnessMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      
      brightnessMaterial.color.setScalar(brightness || 1.0);
      return brightnessMaterial;
    } else {
      // Empty slot material
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, emptySlotColor + 'CC');
      gradient.addColorStop(0.7, emptySlotColor + '66');
      gradient.addColorStop(1, emptySlotColor + '00');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      
      const emptyTexture = new THREE.CanvasTexture(canvas);
      emptyTexture.minFilter = THREE.LinearFilter;
      emptyTexture.magFilter = THREE.LinearFilter;
      
      return new THREE.MeshStandardMaterial({
        map: emptyTexture,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.1,
      });
    }
  }, [texture, emptySlotColor, brightness]);

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(size, size);
  }, [size]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if key props changed
  return (
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.photo.url === nextProps.photo.url &&
    prevProps.size === nextProps.size &&
    prevProps.emptySlotColor === nextProps.emptySlotColor &&
    prevProps.shouldFaceCamera === nextProps.shouldFaceCamera &&
    prevProps.brightness === nextProps.brightness &&
    prevProps.photo.targetPosition.every((pos, i) => 
      Math.abs(pos - nextProps.photo.targetPosition[i]) < 0.001
    )
  );
});

// Photo renderer with stable keys
const PhotoRenderer: React.FC<{ 
  photosWithPositions: PhotoWithPosition[]; 
  settings: SceneSettings;
}> = ({ photosWithPositions, settings }) => {
  const shouldFaceCamera = settings.animationPattern === 'float';
  
  return (
    <group>
      {photosWithPositions.map((photo) => (
        <PhotoMesh
          key={`${photo.id}-${photo.slotIndex}`} // CRITICAL: Stable key combining ID and slot
          photo={photo}
          size={settings.photoSize || 3}
          emptySlotColor={settings.emptySlotColor || '#333333'}
          pattern={settings.animationPattern || 'grid'}
          shouldFaceCamera={shouldFaceCamera}
          brightness={settings.photoBrightness || 1.0}
        />
      ))}
    </group>
  );
};

// Main CollageScene component
const CollageScene: React.FC<CollageSceneProps> = ({ settings, onSettingsChange }) => {
  const { photos } = useCollageStore();
  const [photosWithPositions, setPhotosWithPositions] = useState<PhotoWithPosition[]>([]);

  const safePhotos = Array.isArray(photos) ? photos : [];
  const safeSettings = { ...settings };

  console.log('🎬 COLLAGE SCENE RENDER:', {
    photoCount: safePhotos.length,
    settingsPhotoCount: safeSettings.photoCount,
    positionsCount: photosWithPositions.length
  });

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows={safeSettings.shadowsEnabled}
        camera={{ 
          position: [0, 0, 20], 
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true, 
          alpha: safeSettings.backgroundGradient || false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true
        }}
        onCreated={(state) => {
          if (safeSettings.backgroundGradient) {
            state.gl.setClearColor('#000000', 0);
          }
        }}
      >
        <BackgroundRenderer settings={safeSettings} />
        
        <AnimationController
          settings={safeSettings}
          photos={safePhotos}
          onPositionsUpdate={setPhotosWithPositions}
        />
        
        <PhotoRenderer 
          photosWithPositions={photosWithPositions}
          settings={safeSettings}
        />
        
        <ambientLight 
          intensity={safeSettings.ambientLightIntensity || 0.4} 
          color={safeSettings.ambientLightColor || '#ffffff'} 
        />
        
        <pointLight 
          position={[10, 10, 10]} 
          intensity={safeSettings.pointLightIntensity || 0.8}
          color={safeSettings.pointLightColor || '#ffffff'}
          castShadow={safeSettings.shadowsEnabled}
          shadow-mapSize={[1024, 1024]}
        />
        
        <Controls settings={safeSettings} />
      </Canvas>
    </div>
  );
};

export default CollageScene;