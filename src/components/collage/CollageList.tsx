import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import { Palette, Image, Edit, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=400&h=600&fit=crop&crop=center', // group celebration
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
  const dustCloudRef = useRef<THREE.Points>(null);
  const clustersRef = useRef<THREE.Group>(null);
  
  // Fixed particle counts to prevent buffer size mismatches
  const MAIN_COUNT = 4000;
  const DUST_COUNT = 2500;
  const CLUSTER_COUNT = 8;
  const PARTICLES_PER_CLUSTER = 300;
  
  // Create realistic particle distribution with varying colors and sizes
  const particleData = useMemo(() => {
    // Main cloud particles (distributed in a galaxy-like spiral)
    const mainPositions = new Float32Array(MAIN_COUNT * 3);
    const mainColors = new Float32Array(MAIN_COUNT * 3);
    const mainSizes = new Float32Array(MAIN_COUNT);
    const mainVelocities = new Float32Array(MAIN_COUNT * 3);
    
    for (let i = 0; i < MAIN_COUNT; i++) {
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
        mainSizes[i] = 0.5 + Math.random() * 1.5;
      } else if (sizeRandom < 0.9) {
        // 20% small particles
        mainSizes[i] = 2 + Math.random() * 2;
      } else {
        // 10% larger particles (star clusters)
        mainSizes[i] = 4 + Math.random() * 3;
      }
    }
    
    // Dust cloud particles (very fine, close to photos)
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustColors = new Float32Array(DUST_COUNT * 3);
    const dustSizes = new Float32Array(DUST_COUNT);
    const dustVelocities = new Float32Array(DUST_COUNT * 3);
    
    for (let i = 0; i < DUST_COUNT; i++) {
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
      dustSizes[i] = 0.3 + Math.random() * 1.2;
    }
    
    // Create dense star clusters at various distances
    const clusterData = [];
    for (let c = 0; c < CLUSTER_COUNT; c++) {
      const clusterDistance = 30 + Math.random() * 100;
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterHeight = (Math.random() - 0.5) * 60 + 20;
      
      const clusterCenter = {
        x: Math.cos(clusterAngle) * clusterDistance,
        y: clusterHeight,
        z: Math.sin(clusterAngle) * clusterDistance
      };
      
      const clusterPositions = new Float32Array(PARTICLES_PER_CLUSTER * 3);
      const clusterColors = new Float32Array(PARTICLES_PER_CLUSTER * 3);
      const clusterSizes = new Float32Array(PARTICLES_PER_CLUSTER);
      const clusterVelocities = new Float32Array(PARTICLES_PER_CLUSTER * 3);
      
      for (let i = 0; i < PARTICLES_PER_CLUSTER; i++) {
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
        clusterSizes[i] = 0.8 + Math.random() * 2.5;
      }
      
      clusterData.push({
        positions: clusterPositions,
        colors: clusterColors,
        sizes: clusterSizes,
        velocities: clusterVelocities,
        center: clusterCenter
      });
    }
    
    return {
      main: {
        positions: mainPositions,
        colors: mainColors,
        sizes: mainSizes,
        velocities: mainVelocities,
        count: MAIN_COUNT
      },
      dust: {
        positions: dustPositions,
        colors: dustColors,
        sizes: dustSizes,
        velocities: dustVelocities,
        count: DUST_COUNT
      },
      clusters: clusterData
    };
  }, []); // Remove dependencies to prevent recreation

  // Update colors when theme changes
  React.useEffect(() => {
    if (!mainCloudRef.current || !dustCloudRef.current || !clustersRef.current) return;
    
    // Update main cloud colors
    const mainColors = mainCloudRef.current.geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < particleData.main.count; i++) {
      const baseColor = new THREE.Color(colorTheme.primary);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      
      const hueVariation = (Math.random() - 0.5) * 0.1;
      const saturationVariation = 0.8 + Math.random() * 0.4;
      const lightnessVariation = 0.3 + Math.random() * 0.7;
      
      const particleColor = new THREE.Color();
      particleColor.setHSL(
        (hsl.h + hueVariation + 1) % 1,
        Math.min(1, hsl.s * saturationVariation),
        Math.min(1, hsl.l * lightnessVariation)
      );
      
      mainColors[i * 3] = particleColor.r;
      mainColors[i * 3 + 1] = particleColor.g;
      mainColors[i * 3 + 2] = particleColor.b;
    }
    mainCloudRef.current.geometry.attributes.color.needsUpdate = true;
    
    // Update dust cloud colors
    const dustColors = dustCloudRef.current.geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < particleData.dust.count; i++) {
      const baseColor = new THREE.Color(colorTheme.secondary);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      
      const particleColor = new THREE.Color();
      particleColor.setHSL(
        (hsl.h + (Math.random() - 0.5) * 0.15 + 1) % 1,
        Math.min(1, hsl.s * (0.5 + Math.random() * 0.5)),
        Math.min(1, hsl.l * (0.4 + Math.random() * 0.6))
      );
      
      dustColors[i * 3] = particleColor.r;
      dustColors[i * 3 + 1] = particleColor.g;
      dustColors[i * 3 + 2] = particleColor.b;
    }
    dustCloudRef.current.geometry.attributes.color.needsUpdate = true;
    
    // Update cluster colors
    clustersRef.current.children.forEach((cluster, clusterIndex) => {
      if (cluster instanceof THREE.Points && clusterIndex < particleData.clusters.length) {
        const clusterColors = cluster.geometry.attributes.color.array as Float32Array;
        const clusterColorBase = [colorTheme.primary, colorTheme.secondary, colorTheme.accent][clusterIndex % 3];
        
        for (let i = 0; i < PARTICLES_PER_CLUSTER; i++) {
          const baseColor = new THREE.Color(clusterColorBase);
          const hsl = { h: 0, s: 0, l: 0 };
          baseColor.getHSL(hsl);
          
          const particleColor = new THREE.Color();
          particleColor.setHSL(
            (hsl.h + (Math.random() - 0.5) * 0.08 + 1) % 1,
            Math.min(1, hsl.s * (0.7 + Math.random() * 0.6)),
            Math.min(1, hsl.l * (0.5 + Math.random() * 0.5))
          );
          
          clusterColors[i * 3] = particleColor.r;
          clusterColors[i * 3 + 1] = particleColor.g;
          clusterColors[i * 3 + 2] = particleColor.b;
        }
        cluster.geometry.attributes.color.needsUpdate = true;
      }
    });
  }, [colorTheme, particleData]);

  // Advanced animation system with realistic stellar motion
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Animate main cloud with galactic rotation
    if (mainCloudRef.current) {
      const mainPositions = mainCloudRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleData.main.count; i++) {
        const i3 = i * 3;
        
        // Apply stellar velocities
        mainPositions[i3] += particleData.main.velocities[i3];
        mainPositions[i3 + 1] += particleData.main.velocities[i3 + 1];
        mainPositions[i3 + 2] += particleData.main.velocities[i3 + 2];
        
        // Add complex galactic motion patterns
        const x = mainPositions[i3];
        const z = mainPositions[i3 + 2];
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        
        // Galactic rotation - closer stars orbit faster (like real galaxies)
        const orbitalSpeed = distanceFromCenter > 0 ? 0.00008 / Math.sqrt(distanceFromCenter + 10) : 0;
        const angle = Math.atan2(z, x);
        const newAngle = angle + orbitalSpeed;
        
        // Apply subtle orbital motion
        mainPositions[i3] += Math.cos(newAngle) * orbitalSpeed * 0.1;
        mainPositions[i3 + 2] += Math.sin(newAngle) * orbitalSpeed * 0.1;
        
        // Add stellar parallax and depth motion
        const parallaxFreq = time * 0.02 + i * 0.001;
        mainPositions[i3] += Math.sin(parallaxFreq)