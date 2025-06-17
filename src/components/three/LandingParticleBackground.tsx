import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';

// Particle color themes - matches HeroScene themes
export const PARTICLE_THEMES = [
  { name: 'Purple Magic', primary: '#8b5cf6', secondary: '#a855f7', accent: '#c084fc' },
  { name: 'Ocean Breeze', primary: '#06b6d4', secondary: '#0891b2', accent: '#67e8f9' },
  { name: 'Sunset Glow', primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' },
  { name: 'Forest Dream', primary: '#10b981', secondary: '#059669', accent: '#34d399' },
  { name: 'Rose Petals', primary: '#ec4899', secondary: '#db2777', accent: '#f9a8d4' },
  { name: 'Electric Blue', primary: '#3b82f6', secondary: '#2563eb', accent: '#93c5fd' },
  { name: 'Cosmic Red', primary: '#ef4444', secondary: '#dc2626', accent: '#fca5a5' }
];

// Enhanced particle system for landing page background
interface SubtleParticleSystemProps {
  colorTheme: typeof PARTICLE_THEMES[0];
}

const SubtleParticleSystem: React.FC<SubtleParticleSystemProps> = ({ colorTheme }) => {
  const mainParticlesRef = useRef<THREE.Points>(null);
  const dustParticlesRef = useRef<THREE.Points>(null);
  
  // Increased particle counts for better visibility
  const MAIN_COUNT = 1200;
  const DUST_COUNT = 600;
  
  // Create enhanced particle distribution
  const particleData = useMemo(() => {
    // Main particles - distributed across a large area
    const mainPositions = new Float32Array(MAIN_COUNT * 3);
    const mainColors = new Float32Array(MAIN_COUNT * 3);
    const mainSizes = new Float32Array(MAIN_COUNT);
    const mainVelocities = new Float32Array(MAIN_COUNT * 3);
    
    for (let i = 0; i < MAIN_COUNT; i++) {
      // Spread particles across a very wide area to cover the entire page
      mainPositions[i * 3] = (Math.random() - 0.5) * 100; // x - reduced spread to keep in view
      mainPositions[i * 3 + 1] = (Math.random() - 0.5) * 60; // y - reduced height
      mainPositions[i * 3 + 2] = (Math.random() - 0.5) * 60; // z - reduced depth
      
      // Very slow movement
      mainVelocities[i * 3] = (Math.random() - 0.5) * 0.005;
      mainVelocities[i * 3 + 1] = Math.random() * 0.008 + 0.002; // gentle upward drift
      mainVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
      
      // Larger sizes for better visibility
      mainSizes[i] = Math.random() * 2.0 + 0.5;
    }
    
    // Dust particles - even more numerous for ambient effect
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustColors = new Float32Array(DUST_COUNT * 3);
    const dustSizes = new Float32Array(DUST_COUNT);
    const dustVelocities = new Float32Array(DUST_COUNT * 3);
    
    for (let i = 0; i < DUST_COUNT; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 80;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      
      dustVelocities[i * 3] = (Math.random() - 0.5) * 0.003;
      dustVelocities[i * 3 + 1] = Math.random() * 0.005 + 0.001;
      dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
      
      // Larger dust particles
      dustSizes[i] = Math.random() * 1.0 + 0.3;
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
        Math.min(1, hsl.l * (0.5 + Math.random() * 0.6))
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
        Math.min(1, hsl.s * (0.4 + Math.random() * 0.5)),
        Math.min(1, hsl.l * (0.3 + Math.random() * 0.5))
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
        const floatFreq = time * 0.015 + i * 0.001;
        mainPositions[i3] += Math.sin(floatFreq) * 0.001;
        mainPositions[i3 + 1] += Math.cos(floatFreq * 0.7) * 0.0008;
        mainPositions[i3 + 2] += Math.sin(floatFreq * 1.3) * 0.001;
        
        // Reset particles that drift too far up (smaller reset zone)
        if (mainPositions[i3 + 1] > 40) {
          mainPositions[i3 + 1] = -40;
          mainPositions[i3] = (Math.random() - 0.5) * 100;
          mainPositions[i3 + 2] = (Math.random() - 0.5) * 60;
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
        
        // Add subtle floating motion
        const floatFreq = time * 0.012 + i * 0.002;
        dustPositions[i3] += Math.sin(floatFreq) * 0.0008;
        dustPositions[i3 + 1] += Math.cos(floatFreq * 0.9) * 0.0005;
        dustPositions[i3 + 2] += Math.sin(floatFreq * 1.1) * 0.0008;
        
        // Reset dust particles that drift too far
        if (dustPositions[i3 + 1] > 30) {
          dustPositions[i3 + 1] = -30;
          dustPositions[i3] = (Math.random() - 0.5) * 80;
          dustPositions[i3 + 2] = (Math.random() - 0.5) * 40;
        }
      }
      
      dustParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Main particles - more visible */}
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
              gl_PointSize = size * (300.0 / -mvPosition.z); // Much larger size multiplier
              gl_Position = projectionMatrix * mvPosition;
              
              // Distance-based opacity - more visible
              float distance = length(mvPosition.xyz);
              vOpacity = 1.0 - smoothstep(10.0, 50.0, distance); // Closer range
            }
          `}
          fragmentShader={`
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
              float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
              if (distanceToCenter > 0.5) discard;
              
              // Soft falloff
              float alpha = 1.0 - (distanceToCenter * 2.0);
              alpha = smoothstep(0.0, 1.0, alpha);
              
              // Much higher opacity for visibility
              gl_FragColor = vec4(vColor, alpha * vOpacity * 0.8);
            }
          `}
        />
      </points>
      
      {/* Dust particles - more ambient */}
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
              gl_PointSize = size * (200.0 / -mvPosition.z); // Larger dust particles
              gl_Position = projectionMatrix * mvPosition;
              
              // Distance-based opacity for dust
              float distance = length(mvPosition.xyz);
              vOpacity = 1.0 - smoothstep(8.0, 40.0, distance); // Closer range
            }
          `}
          fragmentShader={`
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
              float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
              if (distanceToCenter > 0.5) discard;
              
              // Soft falloff for dust
              float alpha = 1.0 - (distanceToCenter * 2.0);
              alpha = smoothstep(0.0, 1.0, alpha);
              
              // Higher opacity for dust visibility
              gl_FragColor = vec4(vColor, alpha * vOpacity * 0.6);
            }
          `}
        />
      </points>
      
      {/* Test: Add some simple visible particles to verify system works */}
      <group>
        {Array.from({ length: 50 }, (_, i) => (
          <mesh key={i} position={[
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
          ]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial 
              color={colorTheme.primary} 
              transparent 
              opacity={0.6}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Main particle background component - FIXED POSITIONING
interface LandingParticleBackgroundProps {
  particleTheme: typeof PARTICLE_THEMES[0];
}

export const LandingParticleBackground: React.FC<LandingParticleBackgroundProps> = ({ particleTheme }) => {
  return (
    <div 
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ 
        zIndex: 2, // Changed to ensure it's above background but below content
        pointerEvents: 'none',
        touchAction: 'none'
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        style={{ 
          background: 'transparent',
          pointerEvents: 'none',
          width: '100%',
          height: '100%'
        }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          // Debug: Log that canvas was created
          console.log('🎨 LandingParticleBackground Canvas created');
        }}
        frameloop="always"
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <SubtleParticleSystem colorTheme={particleTheme} />
          {/* Subtle ambient lighting for particles */}
          <ambientLight intensity={0.1} />
          <pointLight position={[10, 10, 10]} intensity={0.05} />
        </Suspense>
      </Canvas>
    </div>
  );
};