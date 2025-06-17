import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';

// Particle color themes - matches HeroScene themes
const PARTICLE_THEMES = [
  { name: 'Purple Magic', primary: '#8b5cf6', secondary: '#a855f7', accent: '#c084fc' },
  { name: 'Ocean Breeze', primary: '#06b6d4', secondary: '#0891b2', accent: '#67e8f9' },
  { name: 'Sunset Glow', primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' },
  { name: 'Forest Dream', primary: '#10b981', secondary: '#059669', accent: '#34d399' },
  { name: 'Rose Petals', primary: '#ec4899', secondary: '#db2777', accent: '#f9a8d4' },
  { name: 'Electric Blue', primary: '#3b82f6', secondary: '#2563eb', accent: '#93c5fd' },
  { name: 'Cosmic Red', primary: '#ef4444', secondary: '#dc2626', accent: '#fca5a5' }
];

// Subtle particle system for landing page background
interface SubtleParticleSystemProps {
  colorTheme: typeof PARTICLE_THEMES[0];
}

const SubtleParticleSystem: React.FC<SubtleParticleSystemProps> = ({ colorTheme }) => {
  const mainParticlesRef = useRef<THREE.Points>(null);
  const dustParticlesRef = useRef<THREE.Points>(null);
  
  // Reduced particle counts for subtle effect
  const MAIN_COUNT = 800;
  const DUST_COUNT = 400;
  
  // Create subtle particle distribution
  const particleData = useMemo(() => {
    // Main particles - distributed across a large area
    const mainPositions = new Float32Array(MAIN_COUNT * 3);
    const mainColors = new Float32Array(MAIN_COUNT * 3);
    const mainSizes = new Float32Array(MAIN_COUNT);
    const mainVelocities = new Float32Array(MAIN_COUNT * 3);
    
    for (let i = 0; i < MAIN_COUNT; i++) {
      // Spread particles across a wide area
      mainPositions[i * 3] = (Math.random() - 0.5) * 200; // x
      mainPositions[i * 3 + 1] = Math.random() * 100 - 20; // y (some below viewport)
      mainPositions[i * 3 + 2] = (Math.random() - 0.5) * 100; // z
      
      // Very slow movement
      mainVelocities[i * 3] = (Math.random() - 0.5) * 0.001;
      mainVelocities[i * 3 + 1] = Math.random() * 0.002 + 0.0005; // gentle upward drift
      mainVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
      
      // Small, subtle sizes
      mainSizes[i] = Math.random() * 0.8 + 0.2;
    }
    
    // Dust particles - even more subtle
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustColors = new Float32Array(DUST_COUNT * 3);
    const dustSizes = new Float32Array(DUST_COUNT);
    const dustVelocities = new Float32Array(DUST_COUNT * 3);
    
    for (let i = 0; i < DUST_COUNT; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 150;
      dustPositions[i * 3 + 1] = Math.random() * 80 - 10;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      
      dustVelocities[i * 3] = (Math.random() - 0.5) * 0.0005;
      dustVelocities[i * 3 + 1] = Math.random() * 0.001 + 0.0002;
      dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.0005;
      
      // Very small dust particles
      dustSizes[i] = Math.random() * 0.4 + 0.1;
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
      }
    };
  }, []);

  // Update colors when theme changes
  useEffect(() => {
    if (!mainParticlesRef.current || !dustParticlesRef.current) return;
    
    // Update main particles colors
    const mainColors = mainParticlesRef.current.geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < particleData.main.count; i++) {
      const baseColor = new THREE.Color(colorTheme.primary);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      
      const particleColor = new THREE.Color();
      particleColor.setHSL(
        (hsl.h + (Math.random() - 0.5) * 0.1 + 1) % 1,
        Math.min(1, hsl.s * (0.6 + Math.random() * 0.4)),
        Math.min(1, hsl.l * (0.4 + Math.random() * 0.6))
      );
      
      mainColors[i * 3] = particleColor.r;
      mainColors[i * 3 + 1] = particleColor.g;
      mainColors[i * 3 + 2] = particleColor.b;
    }
    mainParticlesRef.current.geometry.attributes.color.needsUpdate = true;
    
    // Update dust particles colors
    const dustColors = dustParticlesRef.current.geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < particleData.dust.count; i++) {
      const baseColor = new THREE.Color(colorTheme.secondary);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      
      const particleColor = new THREE.Color();
      particleColor.setHSL(
        (hsl.h + (Math.random() - 0.5) * 0.15 + 1) % 1,
        Math.min(1, hsl.s * (0.3 + Math.random() * 0.5)),
        Math.min(1, hsl.l * (0.2 + Math.random() * 0.4))
      );
      
      dustColors[i * 3] = particleColor.r;
      dustColors[i * 3 + 1] = particleColor.g;
      dustColors[i * 3 + 2] = particleColor.b;
    }
    dustParticlesRef.current.geometry.attributes.color.needsUpdate = true;
  }, [colorTheme, particleData]);

  // Subtle animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Animate main particles
    if (mainParticlesRef.current) {
      const mainPositions = mainParticlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleData.main.count; i++) {
        const i3 = i * 3;
        
        // Apply velocities
        mainPositions[i3] += particleData.main.velocities[i3];
        mainPositions[i3 + 1] += particleData.main.velocities[i3 + 1];
        mainPositions[i3 + 2] += particleData.main.velocities[i3 + 2];
        
        // Add gentle floating motion
        const floatFreq = time * 0.01 + i * 0.001;
        mainPositions[i3] += Math.sin(floatFreq) * 0.0005;
        mainPositions[i3 + 1] += Math.cos(floatFreq * 0.7) * 0.0003;
        mainPositions[i3 + 2] += Math.sin(floatFreq * 1.3) * 0.0005;
        
        // Reset particles that drift too far up
        if (mainPositions[i3 + 1] > 80) {
          mainPositions[i3 + 1] = -20;
          mainPositions[i3] = (Math.random() - 0.5) * 200;
          mainPositions[i3 + 2] = (Math.random() - 0.5) * 100;
        }
      }
      
      mainParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Animate dust particles
    if (dustParticlesRef.current) {
      const dustPositions = dustParticlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleData.dust.count; i++) {
        const i3 = i * 3;
        
        // Apply velocities
        dustPositions[i3] += particleData.dust.velocities[i3];
        dustPositions[i3 + 1] += particleData.dust.velocities[i3 + 1];
        dustPositions[i3 + 2] += particleData.dust.velocities[i3 + 2];
        
        // Add very subtle floating motion
        const floatFreq = time * 0.008 + i * 0.002;
        dustPositions[i3] += Math.sin(floatFreq) * 0.0003;
        dustPositions[i3 + 1] += Math.cos(floatFreq * 0.9) * 0.0002;
        dustPositions[i3 + 2] += Math.sin(floatFreq * 1.1) * 0.0003;
        
        // Reset dust particles that drift too far
        if (dustPositions[i3 + 1] > 70) {
          dustPositions[i3 + 1] = -15;
          dustPositions[i3] = (Math.random() - 0.5) * 150;
          dustPositions[i3 + 2] = (Math.random() - 0.5) * 80;
        }
      }
      
      dustParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Main particles - subtle and sparse */}
      <points ref={mainParticlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particleData.main.positions}
            count={particleData.main.count}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={particleData.main.colors}
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
        <shaderMaterial
          transparent
          vertexColors
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexShader={`
            attribute float size;
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (100.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
              
              // Distance-based opacity - very subtle
              float distance = length(mvPosition.xyz);
              vOpacity = 1.0 - smoothstep(20.0, 80.0, distance);
            }
          `}
          fragmentShader={`
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
              float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
              if (distanceToCenter > 0.5) discard;
              
              // Very soft falloff
              float alpha = 1.0 - (distanceToCenter * 2.0);
              alpha = smoothstep(0.0, 1.0, alpha);
              
              // Very low opacity for subtlety
              gl_FragColor = vec4(vColor, alpha * vOpacity * 0.15);
            }
          `}
        />
      </points>
      
      {/* Dust particles - even more subtle */}
      <points ref={dustParticlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particleData.dust.positions}
            count={particleData.dust.count}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={particleData.dust.colors}
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
        <shaderMaterial
          transparent
          vertexColors
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexShader={`
            attribute float size;
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (80.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
              
              // Distance-based opacity for dust
              float distance = length(mvPosition.xyz);
              vOpacity = 1.0 - smoothstep(15.0, 60.0, distance);
            }
          `}
          fragmentShader={`
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
              float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
              if (distanceToCenter > 0.5) discard;
              
              // Very soft falloff for dust
              float alpha = 1.0 - (distanceToCenter * 2.0);
              alpha = smoothstep(0.0, 1.0, alpha);
              
              // Extremely low opacity for dust
              gl_FragColor = vec4(vColor, alpha * vOpacity * 0.08);
            }
          `}
        />
      </points>
    </group>
  );
};

// Simple background gradient
const SubtleGradientBackground: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const gradientMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color('#000000') },
        colorMid: { value: new THREE.Color('#1a0a2e') },
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
          if (vUv.y > 0.7) {
            color = colorTop;
          } else if (vUv.y > 0.3) {
            float factor = (vUv.y - 0.3) / 0.4;
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
      <sphereGeometry args={[200, 32, 32]} />
    </mesh>
  );
};

// Main particle background component
interface LandingParticleBackgroundProps {
  particleTheme: typeof PARTICLE_THEMES[0];
}

const LandingParticleBackground: React.FC<LandingParticleBackgroundProps> = ({ particleTheme }) => {
  return (
    <div 
      className="fixed inset-0 w-full h-full -z-10"
      style={{ 
        pointerEvents: 'none',
        touchAction: 'none'
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        style={{ 
          background: 'transparent',
          pointerEvents: 'none'
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.8;
        }}
        frameloop="always"
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <SubtleGradientBackground />
          <SubtleParticleSystem colorTheme={particleTheme} />
          <fog attach="fog" args={['#0a0a0a', 30, 120]} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export { LandingParticleBackground, PARTICLE_THEMES };