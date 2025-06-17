import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import { Palette } from 'lucide-react';

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

// 100 Fun party and event photos - groups celebrating, dancing, parties, events, photobooths, selfies (vertical format)
const DEMO_PHOTOS = [
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=600&fit=crop&crop=center', // group celebration
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop&crop=center', // party dancing
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=600&fit=crop&crop=center', // concert crowd
  'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=400&h=600&fit=crop&crop=center', // group selfie
  'https://images.unsplash.com/photo-1574391884720-bbc049ec09ad?w=400&h=600&fit=crop&crop=center', // party celebration
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop&crop=center', // nightlife party
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center', // concert audience
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=600&fit=crop&crop=center', // group celebration
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=600&fit=crop&crop=center', // party fun
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&h=600&fit=crop&crop=center', // group celebration
  'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=600&fit=crop&crop=center', // party dancing
  'https://images.unsplash.com/photo-1520637836862-4d197d17c13a?w=400&h=600&fit=crop&crop=center', // nightclub party
  'https://images.unsplash.com/photo-1492447166138-50c3889fccb1?w=400&h=600&fit=crop&crop=center', // friends celebrating
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&h=600&fit=crop&crop=center', // group party
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=600&fit=crop&crop=center', // celebration cheers
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=600&fit=crop&crop=center', // party dancing
  'https://images.unsplash.com/photo-1516307365426-bea591f05011?w=400&h=600&fit=crop&crop=center', // concert party
  'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=600&fit=crop&crop=center', // group celebration
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=600&fit=crop&crop=center', // party crowd
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=600&fit=crop&crop=center', // celebration event
  'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop&crop=center', // birthday party
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop&crop=center', // party celebration
  'https://images.unsplash.com/photo-1485872299829-c673f5194813?w=400&h=600&fit=crop&crop=center', // group fun
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=600&fit=crop&crop=center', // celebration party
  'https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=400&h=600&fit=crop&crop=center', // nightlife party
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=600&fit=crop&crop=center', // party celebration
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=400&h=600&fit=crop&crop=center', // group celebration
  'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=400&h=600&fit=crop&crop=center', // birthday party
  'https://images.unsplash.com/photo-1519214605650-76a613ee3245?w=400&h=600&fit=crop&crop=center', // wedding celebration
  'https://images.unsplash.com/photo-1524159179951-0145ebc03e42?w=400&h=600&fit=crop&crop=center', // party fun
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=600&fit=crop&crop=center', // concert lights
  'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=600&fit=crop&crop=center', // party celebration
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=600&fit=crop&crop=center', // people cheering
  'https://images.unsplash.com/photo-1564865878688-9a244444042a?w=400&h=600&fit=crop&crop=center', // group selfie
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=600&fit=crop&crop=center', // food party
  'https://images.unsplash.com/photo-1567446537708-ac4aa75c9c28?w=400&h=600&fit=crop&crop=center', // group celebration
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=600&fit=crop&crop=center', // graduation party
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=600&fit=crop&crop=center', // business celebration
  'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?w=400&h=600&fit=crop&crop=center', // outdoor party
  'https://images.unsplash.com/photo-1496843916299-590492c751f4?w=400&h=600&fit=crop&crop=center', // festival crowd
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=600&fit=crop&crop=center', // wedding party
  'https://images.unsplash.com/photo-1583394838340-0c5c0d6d7d5b?w=400&h=600&fit=crop&crop=center', // party celebration
  'https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=400&h=600&fit=crop&crop=center', // group selfie
  'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&h=600&fit=crop&crop=center', // celebration
  'https://images.unsplash.com/photo-1520986734961-6a681fdd0c9f?w=400&h=600&fit=crop&crop=center', // party friends
  'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=400&h=600&fit=crop&crop=center', // group celebration
  'https://images.unsplash.com/photo-1589652717406-1c69efaf1ff8?w=400&h=600&fit=crop&crop=center', // party celebration
  'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400&h=600&fit=crop&crop=center', // group selfie
  'https://images.unsplash.com/photo-1592650450938-4d8b4b8c7c3b?w=400&h=600&fit=crop&crop=center', // celebration
  'https://images.unsplash.com/photo-1594736797933-d0401ba5f9e4?w=400&h=600&fit=crop&crop=center', // party fun
  // Additional 50 party photos to reach 100 total
  'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=400&h=600&fit=crop&crop=center', // group celebration
  'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=600&fit=crop&crop=center', // party dancing
];

// Fun comments that might appear on photos in a real collage
const PHOTO_COMMENTS = [
  "This is so much fun! 🎉",
  "Best night ever! ✨",
  "Squad goals! 💖",
  "Making memories! 📸",
  "Party vibes! 🕺",
  "Love this moment! ❤️",
  "Can't stop laughing! 😂",
  "Epic celebration! 🎊",
  "Good times! 🌟",
  "So happy right now! 😊",
  "Unforgettable! 🙌",
  "Living our best life! 💃"
];

// Particle color themes
const PARTICLE_THEMES = [
  { name: 'Purple Magic', primary: '#8b5cf6', secondary: '#a855f7', accent: '#c084fc' },
  { name: 'Ocean Breeze', primary: '#06b6d4', secondary: '#0891b2', accent: '#67e8f9' },
  { name: 'Sunset Glow', primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' },
  { name: 'Forest Dream', primary: '#10b981', secondary: '#059669', accent: '#34d399' },
  { name: 'Rose Petals', primary: '#ec4899', secondary: '#db2777', accent: '#f9a8d4' },
  { name: 'Electric Blue', primary: '#3b82f6', secondary: '#2563eb', accent: '#93c5fd' },
  { name: 'Cosmic Red', primary: '#ef4444', secondary: '#dc2626', accent: '#fca5a5' }
];

interface PhotoProps {
  position: [number, number, number];
  rotation: [number, number, number];
  imageUrl: string;
  index: number;
}

const FloatingPhoto: React.FC<PhotoProps> = ({ position, rotation, imageUrl, index }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  
  // Randomly decide if this photo should have a comment (about 40% chance)
  const hasComment = React.useMemo(() => Math.random() < 0.4, []);
  const comment = React.useMemo(() => 
    hasComment ? PHOTO_COMMENTS[index % PHOTO_COMMENTS.length] : null, 
    [hasComment, index]
  );
  
  // Load texture with error handling - only show if successfully loaded
  React.useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.anisotropy = 16;
        setTexture(loadedTexture);
        setIsLoaded(true);
      },
      undefined,
      (error) => {
        console.warn('Failed to load texture:', imageUrl, error);
        setIsLoaded(false);
      }
    );
  }, [imageUrl]);

  // Create text texture for comments
  const textTexture = React.useMemo(() => {
    if (!comment) return null;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    canvas.width = 512;
    canvas.height = 128;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.beginPath();
    context.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 15);
    context.fill();
    
    context.fillStyle = 'white';
    context.font = 'bold 28px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(comment, canvas.width / 2, canvas.height / 2);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [comment]);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const floatOffset = Math.sin(time * 0.5 + index * 0.5) * 0.3;
    
    groupRef.current.lookAt(state.camera.position);
    
    const rotationOffset = Math.sin(time * 0.3 + index * 0.3) * 0.05;
    groupRef.current.rotation.z += rotationOffset;
    
    groupRef.current.position.y = position[1] + floatOffset;
  });

  if (!isLoaded || !texture) {
    return null;
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[1.4, 2.1]} />
        <meshStandardMaterial 
          map={texture}
          transparent
          side={THREE.DoubleSide}
          metalness={0}
          roughness={0.2}
          envMapIntensity={1.0}
          emissive="#ffffff"
          emissiveIntensity={0.25}
          emissiveMap={texture}
          toneMapped={false}
        />
      </mesh>
      
      {comment && textTexture && (
        <mesh position={[0, -1.2, 0.01]}>
          <planeGeometry args={[1.4, 0.35]} />
          <meshBasicMaterial 
            map={textTexture} 
            transparent 
            alphaTest={0.1}
          />
        </mesh>
      )}
    </group>
  );
};

// Enhanced Milky Way Particle System with asymmetric clusters
interface MilkyWayParticleSystemProps {
  colorTheme: typeof PARTICLE_THEMES[0];
  photoPositions: Array<{ position: [number, number, number] }>;
}

const MilkyWayParticleSystem: React.FC<MilkyWayParticleSystemProps> = ({ colorTheme, photoPositions }) => {
  const mainCloudRef = useRef<THREE.Points>(null);
  const glowCloudRef = useRef<THREE.Points>(null);
  const dustCloudRef = useRef<THREE.Points>(null);
  const clustersRef = useRef<THREE.Group>(null);
  
  // Create realistic particle distribution with clusters
  const particleData = useMemo(() => {
    const mainCount = 3500; // Increased for denser, more realistic look
    const dustCount = 2000; // More dust particles
    const clusterCount = 12; // More clusters
    const particlesPerCluster = 200;
    
    // Main cloud particles (distributed in a galaxy-like spiral)
    const mainPositions = new Float32Array(mainCount * 3);
    const mainVelocities = new Float32Array(mainCount * 3);
    const mainSizes = new Float32Array(mainCount);
    const mainBrightness = new Float32Array(mainCount);
    
    for (let i = 0; i < mainCount; i++) {
      // Create multiple spiral arms like the Milky Way
      const armIndex = Math.floor(Math.random() * 4); // 4 spiral arms
      const armAngle = (armIndex * Math.PI / 2) + (Math.random() - 0.5) * 0.5;
      const distanceFromCenter = Math.pow(Math.random(), 0.5) * 80; // Power distribution for realistic density
      const spiralTightness = 0.2;
      const angle = armAngle + (distanceFromCenter * spiralTightness);
      
      // Add noise and scatter
      const noise = (Math.random() - 0.5) * (8 + distanceFromCenter * 0.1);
      const heightNoise = (Math.random() - 0.5) * (2 + distanceFromCenter * 0.05);
      
      mainPositions[i * 3] = Math.cos(angle) * distanceFromCenter + noise;
      mainPositions[i * 3 + 1] = heightNoise + Math.sin(angle * 0.1) * (distanceFromCenter * 0.02);
      mainPositions[i * 3 + 2] = Math.sin(angle) * distanceFromCenter + noise;
      
      // Very subtle movement for realism
      mainVelocities[i * 3] = (Math.random() - 0.5) * 0.002;
      mainVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
      mainVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
      
      // Realistic size distribution - most particles very small, few large
      const sizeRandom = Math.random();
      if (sizeRandom < 0.7) {
        // 70% tiny particles
        mainSizes[i] = 0.1 + Math.random() * 0.3;
      } else if (sizeRandom < 0.9) {
        // 20% small particles
        mainSizes[i] = 0.4 + Math.random() * 0.4;
      } else {
        // 10% larger particles (star clusters)
        mainSizes[i] = 0.8 + Math.random() * 0.6;
      }
      
      // Brightness varies with size and distance
      const distanceFactor = Math.max(0.1, 1 - (distanceFromCenter * 0.008));
      mainBrightness[i] = distanceFactor * (0.3 + mainSizes[i] * 0.7);
    }
    
    // Dust cloud particles (very fine, close to photos)
    const dustPositions = new Float32Array(dustCount * 3);
    const dustVelocities = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);
    
    for (let i = 0; i < dustCount; i++) {
      // Concentrate around photo area with exponential falloff
      const radius = Math.pow(Math.random(), 2) * 50 + 10;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 30 + 15;
      
      dustPositions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 15;
      dustPositions[i * 3 + 1] = height;
      dustPositions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 15;
      
      dustVelocities[i * 3] = (Math.random() - 0.5) * 0.003;
      dustVelocities[i * 3 + 1] = Math.random() * 0.002 + 0.001;
      dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
      
      // Very fine dust particles
      dustSizes[i] = 0.05 + Math.random() * 0.15;
    }
    
    // Create dense star clusters at various distances
    const clusterData = [];
    for (let c = 0; c < clusterCount; c++) {
      const clusterDistance = 30 + Math.random() * 100;
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterHeight = (Math.random() - 0.5) * 60 + 20;
      
      const clusterCenter = {
        x: Math.cos(clusterAngle) * clusterDistance,
        y: clusterHeight,
        z: Math.sin(clusterAngle) * clusterDistance
      };
      
      const clusterPositions = new Float32Array(particlesPerCluster * 3);
      const clusterVelocities = new Float32Array(particlesPerCluster * 3);
      const clusterSizes = new Float32Array(particlesPerCluster);
      
      for (let i = 0; i < particlesPerCluster; i++) {
        // Dense spherical distribution
        const phi = Math.random() * Math.PI * 2;
        const cosTheta = Math.random() * 2 - 1;
        const u = Math.random();
        const clusterRadius = Math.pow(u, 1/3) * (3 + Math.random() * 4); // Cubic root for sphere
        
        const theta = Math.acos(cosTheta);
        const r = clusterRadius;
        
        clusterPositions[i * 3] = clusterCenter.x + r * Math.sin(theta) * Math.cos(phi);
        clusterPositions[i * 3 + 1] = clusterCenter.y + r * Math.cos(theta);
        clusterPositions[i * 3 + 2] = clusterCenter.z + r * Math.sin(theta) * Math.sin(phi);
        
        clusterVelocities[i * 3] = (Math.random() - 0.5) * 0.001;
        clusterVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
        clusterVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
        
        // Varied sizes within cluster
        clusterSizes[i] = 0.2 + Math.random() * 0.5;
      }
      
      clusterData.push({
        positions: clusterPositions,
        velocities: clusterVelocities,
        sizes: clusterSizes,
        center: clusterCenter
      });
    }
    
    return {
      main: {
        positions: mainPositions,
        velocities: mainVelocities,
        sizes: mainSizes,
        brightness: mainBrightness,
        count: mainCount
      },
      dust: {
        positions: dustPositions,
        velocities: dustVelocities,
        sizes: dustSizes,
        count: dustCount
      },
      clusters: clusterData
    };
  }, [photoPositions]);

  // Advanced animation system
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Animate main cloud
    if (mainCloudRef.current && glowCloudRef.current) {
      const mainPositions = mainCloudRef.current.geometry.attributes.position.array as Float32Array;
      const glowPositions = glowCloudRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleData.main.count; i++) {
        const i3 = i * 3;
        
        // Apply velocities
        mainPositions[i3] += particleData.main.velocities[i3];
        mainPositions[i3 + 1] += particleData.main.velocities[i3 + 1];
        mainPositions[i3 + 2] += particleData.main.velocities[i3 + 2];
        
        // Add complex wave motion for realism
        const waveFreq = time * 0.1 + i * 0.01;
        mainPositions[i3] += Math.sin(waveFreq) * 0.002;
        mainPositions[i3 + 1] += Math.cos(waveFreq * 0.7) * 0.001;
        mainPositions[i3 + 2] += Math.sin(waveFreq * 1.3) * 0.002;
        
        // Copy to glow
        glowPositions[i3] = mainPositions[i3];
        glowPositions[i3 + 1] = mainPositions[i3 + 1];
        glowPositions[i3 + 2] = mainPositions[i3 + 2];
      }
      
      mainCloudRef.current.geometry.attributes.position.needsUpdate = true;
      glowCloudRef.current.geometry.attributes.position.needsUpdate = true;
      
      // Slow rotation of entire cloud
      mainCloudRef.current.rotation.y = time * 0.005;
      glowCloudRef.current.rotation.y = time * 0.005;
    }
    
    // Animate dust cloud
    if (dustCloudRef.current) {
      const dustPositions = dustCloudRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleData.dust.count; i++) {
        const i3 = i * 3;
        
        dustPositions[i3] += particleData.dust.velocities[i3];
        dustPositions[i3 + 1] += particleData.dust.velocities[i3 + 1];
        dustPositions[i3 + 2] += particleData.dust.velocities[i3 + 2];
        
        // Reset dust particles that drift too far
        if (dustPositions[i3 + 1] > 50) {
          dustPositions[i3 + 1] = 0;
          dustPositions[i3] = (Math.random() - 0.5) * 60;
          dustPositions[i3 + 2] = (Math.random() - 0.5) * 60;
        }
      }
      
      dustCloudRef.current.geometry.attributes.position.needsUpdate = true;
      dustCloudRef.current.rotation.y = time * 0.008;
    }
    
    // Animate clusters
    if (clustersRef.current) {
      clustersRef.current.children.forEach((cluster, clusterIndex) => {
        if (cluster instanceof THREE.Points) {
          const positions = cluster.geometry.attributes.position.array as Float32Array;
          const velocities = particleData.clusters[clusterIndex].velocities;
          
          for (let i = 0; i < particleData.clusters[clusterIndex].positions.length / 3; i++) {
            const i3 = i * 3;
            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];
            
            // Add subtle cluster movement
            const clusterWave = time * 0.05 + clusterIndex;
            positions[i3] += Math.sin(clusterWave) * 0.001;
            positions[i3 + 1] += Math.cos(clusterWave * 0.8) * 0.0005;
            positions[i3 + 2] += Math.sin(clusterWave * 1.2) * 0.001;
          }
          
          cluster.geometry.attributes.position.needsUpdate = true;
        }
      });
    }
  });

  return (
    <group>
      {/* Main Milky Way Cloud */}
      <points ref={mainCloudRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particleData.main.positions}
            count={particleData.main.count}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            array={particleData.main.sizes}
            count={particleData.main.count}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          color={colorTheme.primary}
          size={0.4}
          transparent
          opacity={0.6}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Glow layer for main cloud */}
      <points ref={glowCloudRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particleData.main.positions}
            count={particleData.main.count}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={colorTheme.accent}
          size={0.8}
          transparent
          opacity={0.2}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Dust Cloud */}
      <points ref={dustCloudRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particleData.dust.positions}
            count={particleData.dust.count}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            array={particleData.dust.sizes}
            count={particleData.dust.count}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          color={colorTheme.secondary}
          size={0.3}
          transparent
          opacity={0.4}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Asymmetric Clusters */}
      <group ref={clustersRef}>
        {particleData.clusters.map((cluster, index) => (
          <points key={index}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={cluster.positions}
                count={cluster.positions.length / 3}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-size"
                array={cluster.sizes}
                count={cluster.sizes.length}
                itemSize={1}
              />
            </bufferGeometry>
            <pointsMaterial
              color={index % 2 === 0 ? colorTheme.primary : colorTheme.accent}
              size={0.5}
              transparent
              opacity={0.7}
              sizeAttenuation
              blending={THREE.AdditiveBlending}
            />
          </points>
        ))}
      </group>
    </group>
  );
};

// Solid reflective floor component beneath the grid
const ReflectiveFloor: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.05, 0]}>
      <planeGeometry args={[35, 35]} />
      <meshStandardMaterial 
        color="#0f0f23"
        metalness={0.9}
        roughness={0.1}
        envMapIntensity={1.0}
      />
    </mesh>
  );
};

// Floor component with reflective material - same size as grid
const Floor: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[35, 35]} />
      <meshStandardMaterial 
        color="#1a1a2e"
        metalness={0.8}
        roughness={0.2}
        envMapIntensity={0.9}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
};

// Grid component - neon green, same size as floor
const Grid: React.FC = () => {
  const gridHelper = useMemo(() => {
    const helper = new THREE.GridHelper(35, 35, '#00ff41', '#00cc33');
    helper.position.y = -2.99;
    
    const material = helper.material as THREE.LineBasicMaterial;
    material.transparent = true;
    material.opacity = 0.8;
    
    return helper;
  }, []);

  return <primitive object={gridHelper} />;
};

// Background gradient component - blacker top, royal purple
const GradientBackground: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const gradientMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color('#000000') },
        colorMid: { value: new THREE.Color('#4c1d95') },
        colorBottom: { value: new THREE.Color('#000000') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorMid;
        uniform vec3 colorBottom;
        varying vec2 vUv;
        void main() {
          vec3 color;
          if (vUv.y > 0.6) {
            color = colorTop;
          } else if (vUv.y > 0.3) {
            float factor = (vUv.y - 0.3) / 0.3;
            color = mix(colorMid, colorTop, factor);
          } else {
            float factor = vUv.y / 0.3;
            color = mix(colorBottom, colorMid, factor);
          }
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }, []);

  return (
    <mesh ref={meshRef} material={gradientMaterial}>
      <sphereGeometry args={[50, 32, 32]} />
    </mesh>
  );
};

// Smart auto-rotating camera with continuous smooth rotation
const SmartCameraControls: React.FC = () => {
  const controlsRef = useRef<any>();
  const { camera } = useThree();
  const isUserInteracting = useRef(false);
  const lastInteractionTime = useRef(0);
  const continuousRotation = useRef({ theta: 0, phi: Math.PI / 2.5, radius: 15 });
  const rotationSpeed = useRef(0.0001); // Base rotation speed
  const isMobile = useIsMobile();

  useFrame((state) => {
    if (!controlsRef.current) return;
    
    const currentTime = Date.now();
    const timeSinceInteraction = currentTime - lastInteractionTime.current;
    
    // Always rotate, but slow down during interaction
    const shouldAutoRotate = !isUserInteracting.current || timeSinceInteraction > 500;
    
    if (shouldAutoRotate || isMobile) {
      // Update the continuous rotation
      continuousRotation.current.theta += rotationSpeed.current;
      
      // Add subtle height variation
      const time = currentTime * 0.0001;
      const heightVariation = Math.sin(time * 2) * 0.8;
      
      // Apply the rotation to camera position
      const { theta, phi, radius } = continuousRotation.current;
      
      camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = radius * Math.cos(phi) + heightVariation;
      camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
      
      camera.lookAt(0, 0, 0);
    }
    
    controlsRef.current.update();
  });

  React.useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    
    const handleStart = () => {
      if (!isMobile) {
        isUserInteracting.current = true;
        lastInteractionTime.current = Date.now();
        rotationSpeed.current = 0.00003; // Slow down during interaction
      }
    };

    const handleEnd = () => {
      if (!isMobile) {
        isUserInteracting.current = false;
        lastInteractionTime.current = Date.now();
        
        // Update continuous rotation to match current camera position
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        continuousRotation.current = {
          theta: spherical.theta,
          phi: spherical.phi,
          radius: spherical.radius
        };
        
        // Resume normal rotation speed
        setTimeout(() => {
          rotationSpeed.current = 0.0001;
        }, 1000);
      }
    };

    const handleChange = () => {
      if (!isMobile && isUserInteracting.current) {
        lastInteractionTime.current = Date.now();
      }
    };

    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);
    controls.addEventListener('change', handleChange);

    return () => {
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('end', handleEnd);
      controls.removeEventListener('change', handleChange);
    };
  }, [isMobile, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      enableRotate={!isMobile}
      rotateSpeed={0.6}
      zoomSpeed={0.4}
      minDistance={8}
      maxDistance={30}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI - Math.PI / 8}
      enableDamping={true}
      dampingFactor={0.1}
      autoRotate={false}
      touches={{
        ONE: isMobile ? THREE.TOUCH.NONE : THREE.TOUCH.ROTATE,
        TWO: isMobile ? THREE.TOUCH.NONE : THREE.TOUCH.DOLLY_PAN
      }}
    />
  );
};

// Scene component that brings everything together - ONLY 3D objects
const Scene: React.FC<{ particleTheme: typeof PARTICLE_THEMES[0] }> = ({ particleTheme }) => {
  // Generate photo positions for 100 photos covering the entire floor plane
  const photoPositions = useMemo(() => {
    const positions: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      imageUrl: string;
    }> = [];

    // Floor is 35x35 units, we want to cover it evenly
    // Let's create a 10x10 grid to get exactly 100 photos
    const gridSize = 10;
    const floorSize = 30; // Slightly smaller than floor to have margin
    const spacing = floorSize / (gridSize - 1); // Even spacing
    
    let photoIndex = 0;
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Calculate position to center the grid on the floor
        const x = (col - (gridSize - 1) / 2) * spacing;
        const z = (row - (gridSize - 1) / 2) * spacing;
        
        // Add small random offset for organic feel (but keep photos in their grid positions)
        const xOffset = (Math.random() - 0.5) * 0.5;
        const zOffset = (Math.random() - 0.5) * 0.5;
        
        // Vary height in a wave pattern across the grid
        const baseHeight = 1.5;
        const waveHeight = Math.sin(row * 0.3) * Math.cos(col * 0.3) * 1.5;
        const randomHeight = Math.random() * 0.8;
        const y = baseHeight + waveHeight + randomHeight;
        
        // Random rotations for natural look
        const rotationX = (Math.random() - 0.5) * 0.3;
        const rotationY = (Math.random() - 0.5) * 0.6;
        const rotationZ = (Math.random() - 0.5) * 0.2;
        
        // Cycle through party photos
        const imageUrl = DEMO_PHOTOS[photoIndex % DEMO_PHOTOS.length];
        photoIndex++;
        
        positions.push({
          position: [x + xOffset, y, z + zOffset] as [number, number, number],
          rotation: [rotationX, rotationY, rotationZ] as [number, number, number],
          imageUrl: imageUrl,
        });
      }
    }
    
    console.log(`Generated ${positions.length} photo positions in ${gridSize}x${gridSize} grid`);
    return positions;
  }, []);

  return (
    <>
      {/* Gradient Background Sphere */}
      <GradientBackground />
      
      {/* ENHANCED LIGHTING SETUP - Complete coverage with no dark spots */}
      
      {/* Strong ambient light base - ensures minimum brightness everywhere */}
      <ambientLight intensity={0.4} color="#ffffff" />
      
      {/* Key Light - Main directional light from above */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.5}
        color="#ffffff"
        castShadow={false}
      />
      
      {/* Fill Light - Opposite side to key light */}
      <directionalLight
        position={[-5, 8, -5]}
        intensity={0.4}
        color="#ffffff"
        castShadow={false}
      />
      
      {/* Rim Light - Back lighting for depth */}
      <directionalLight
        position={[0, 12, -8]}
        intensity={0.3}
        color="#ffffff"
        castShadow={false}
      />
      
      {/* Bottom Fill Lights - Eliminate shadows underneath */}
      <directionalLight
        position={[5, 2, 5]}
        intensity={0.25}
        color="#ffffff"
        castShadow={false}
      />
      
      <directionalLight
        position={[-5, 2, -5]}
        intensity={0.25}
        color="#ffffff"
        castShadow={false}
      />
      
      {/* Side Lights - Ensure no dark sides */}
      <directionalLight
        position={[10, 5, 0]}
        intensity={0.2}
        color="#ffffff"
        castShadow={false}
      />
      
      <directionalLight
        position={[-10, 5, 0]}
        intensity={0.2}
        color="#ffffff"
        castShadow={false}
      />
      
      {/* Front Lights - Illuminate photos facing camera */}
      <directionalLight
        position={[0, 5, 10]}
        intensity={0.25}
        color="#ffffff"
        castShadow={false}
      />
      
      {/* Point Lights for localized brightness boost */}
      <pointLight 
        position={[0, 6, 0]} 
        intensity={0.3} 
        color="#ffffff" 
        distance={20}
        decay={2}
      />
      
      <pointLight 
        position={[0, 1, 6]} 
        intensity={0.2} 
        color="#ffffff" 
        distance={15}
        decay={2}
      />
      
      {/* Additional ring of lights around the scene */}
      <pointLight position={[8, 4, 0]} intensity={0.2} color="#ffffff" distance={12} />
      <pointLight position={[-8, 4, 0]} intensity={0.2} color="#ffffff" distance={12} />
      <pointLight position={[0, 4, 8]} intensity={0.2} color="#ffffff" distance={12} />
      <pointLight position={[0, 4, -8]} intensity={0.2} color="#ffffff" distance={12} />
      
      {/* Purple accent lights for atmosphere (reduced intensity) */}
      <spotLight
        position={[-8, 12, -8]}
        angle={Math.PI / 4}
        penumbra={0.8}
        intensity={0.3}
        color="#8b5cf6"
        castShadow={false}
      />
      
      <spotLight
        position={[8, 10, -8]}
        angle={Math.PI / 4}
        penumbra={0.8}
        intensity={0.25}
        color="#a855f7"
        castShadow={false}
      />
      
      {/* Smart Camera Controls */}
      <SmartCameraControls />
      
      <ReflectiveFloor />
      <Floor />
      <Grid />
      
      {/* Milky Way Particle System */}
      <MilkyWayParticleSystem colorTheme={particleTheme} photoPositions={photoPositions} />
      
      {/* Floating Photos */}
      {photoPositions.map((photo, index) => (
        <FloatingPhoto
          key={index}
          position={photo.position}
          rotation={photo.rotation}
          imageUrl={photo.imageUrl}
          index={index}
        />
      ))}
      
      {/* Enhanced fog for more dramatic atmosphere */}
      <fog attach="fog" args={['#1a0a2e', 15, 35]} />
    </>
  );
};

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-black/40">
        <div className="text-center text-white/60">
          <div className="w-16 h-16 border-2 border-purple-500/30 rounded-full mx-auto mb-4"></div>
          <p>3D Scene Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const LoadingFallback: React.FC = () => (
  <mesh>
    <sphereGeometry args={[0.1, 8, 8]} />
    <meshBasicMaterial color="#8b5cf6" />
  </mesh>
);

const HeroScene: React.FC = () => {
  // State for particle theme - moved to main component
  const [particleTheme, setParticleTheme] = React.useState(PARTICLE_THEMES[0]);

  return (
    <ErrorBoundary>
      {/* Particle Theme Controls - positioned OUTSIDE Canvas */}
      <div className="fixed top-4 right-4 z-50">
        <div className="relative">
          <button
            onClick={() => {
              const currentIndex = PARTICLE_THEMES.findIndex(theme => theme.name === particleTheme.name);
              const nextIndex = (currentIndex + 1) % PARTICLE_THEMES.length;
              setParticleTheme(PARTICLE_THEMES[nextIndex]);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg text-white hover:bg-black/30 transition-all duration-200 shadow-lg"
            aria-label="Change particle colors"
          >
            <Palette size={20} />
            <span className="hidden sm:inline">{particleTheme.name}</span>
          </button>
        </div>
      </div>

      {/* CRITICAL: Fixed mobile scrolling by ensuring proper touch handling */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ 
          // Allow mobile scrolling by preventing canvas from capturing touch events
          touchAction: 'pan-y',
          // Conditionally enable pointer events based on screen size
          pointerEvents: typeof window !== 'undefined' && window.innerWidth < 768 ? 'none' : 'auto'
        }}
      >
        <Canvas
          camera={{ position: [15, 5, 15], fov: 45 }}
          shadows={false}
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
          }}
          style={{ background: 'transparent' }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = false;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.2;
          }}
          // Prevent canvas from interfering with touch scrolling
          onPointerMissed={(e) => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              e.stopPropagation();
            }
          }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Scene particleTheme={particleTheme} />
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
};

export default HeroScene;