// src/components/three/CollageScene.tsx - FIXED: Stable rendering during uploads
import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { type SceneSettings } from '../../store/sceneStore';
import { PatternFactory } from './patterns/PatternFactory';
import { addCacheBustToUrl } from '../../lib/supabase';

type Photo = {
  id: string;
  url: string;
  collage_id?: string;
  created_at?: string;
};

type CollageSceneProps = {
  photos: Photo[];
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
  private lastAssignmentSnapshot = new Map<string, number>();

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

    return new Map(this.slotAssignments);
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

// Enhanced PhotoMesh component for volumetric lighting
const VolumetricSpotlight: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  color: string;
  intensity: number;
  angle: number;
  distance: number;
  penumbra: number;
}> = ({ position, target, color, intensity, angle, distance, penumbra }) => {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.position.set(...target);
    }
  }, [target]);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <group>
      <spotLight
        ref={lightRef}
        position={position}
        color={color}
        intensity={intensity}
        angle={angle}
        distance={distance}
        penumbra={penumbra}
        castShadow={true}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={distance}
        shadow-camera-fov={angle * 180 / Math.PI}
      />
      <primitive object={targetRef.current} />
    </group>
  );
};

// Dynamic lighting system
const DynamicLightingSystem: React.FC<{ settings: SceneSettings }> = ({ settings }) => {
  const lights = useMemo(() => {
    const lightCount = Math.min(settings.spotlightCount || 1, 4);
    const lightArray = [];
    
    for (let i = 0; i < lightCount; i++) {
      const angle = (i / lightCount) * Math.PI * 2;
      const radius = 15 + Math.sin(i * 2.3) * 5;
      const height = 10 + Math.cos(i * 1.7) * 5;
      const intensityVariation = 0.8 + Math.sin(i * 3.1) * 0.2;
      
      lightArray.push({
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
        intensityVariation,
      });
    }
    
    return lightArray;
  }, [settings.spotlightCount]);

  return (
    <group>
      {lights.map((light, index) => {
        const adjustedAngle = Math.max(0.1, Math.min(Math.PI / 3, (settings.spotlightAngle || 30) * Math.PI / 180));
        
        return (
          <group key={index}>
            <VolumetricSpotlight
              position={light.position}
              target={light.target}
              angle={adjustedAngle}
              color={settings.spotlightColor || '#ffffff'}
              intensity={(settings.spotlightIntensity || 1) * light.intensityVariation}
              distance={settings.spotlightDistance || 50}
              penumbra={settings.spotlightPenumbra || 0.5}
            />
          </group>
        );
      })}
    </group>
  );
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
      
      // Apply brightness by modifying the material color - only for photos with textures
      brightnessMaterial.color.setScalar(brightness || 1.0);
      
      return brightnessMaterial;
    } else {
      // Empty slot material - NOT affected by brightness setting
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      // Fill with background color
      ctx.fillStyle = emptySlotColor || '#1A1A1A';
      ctx.fillRect(0, 0, 512, 512);
      
      // Add pattern
      if (pattern === 'grid') {
        ctx.strokeStyle = '#ffffff20';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 512; i += 64) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 512);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(512, i);
          ctx.stroke();
        }
      }
      
      const emptyTexture = new THREE.CanvasTexture(canvas);
      return new THREE.MeshStandardMaterial({
        map: emptyTexture,
        transparent: false,
        opacity: 1.0, // Fully opaque empty slots
        side: THREE.DoubleSide,
        color: 0xffffff, // Fixed white color for empty slots, not affected by brightness
      });
    }
  }, [texture, emptySlotColor, pattern, brightness]);

  return (
    <mesh
      ref={meshRef}
      material={material}
      castShadow
      receiveShadow
    >
      {/* Add a very slight bevel to the plane for better light response */}
      <planeGeometry args={[(size || 4.0) * (9/16), size || 4.0]} />
    </mesh>
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

// Floor component
const Floor: React.FC<{ settings: SceneSettings }> = ({ settings }) => {
  if (!settings.floorEnabled) return null;

  const floorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: settings.floorColor,
      transparent: settings.floorOpacity < 1,
      opacity: settings.floorOpacity,
      metalness: Math.min(settings.floorMetalness || 0.5, 0.9),
      roughness: Math.max(settings.floorRoughness || 0.5, 0.1),
      side: THREE.DoubleSide,
      envMapIntensity: 0.5,
    });
  }, [settings.floorColor, settings.floorOpacity, settings.floorMetalness, settings.floorRoughness]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -10, 0]}
      receiveShadow
    >
      <planeGeometry args={[100, 100]} />
      <primitive object={floorMaterial} attach="material" />
    </mesh>
  );
};

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
const CollageScene: React.FC<CollageSceneProps> = ({ photos, settings, onSettingsChange }) => {
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
        
        <Floor settings={safeSettings} />
        
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
        
        <DynamicLightingSystem settings={safeSettings} />
        
        <Controls settings={safeSettings} />
      </Canvas>
    </div>
  );
};

export default CollageScene;