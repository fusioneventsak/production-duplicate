// src/components/three/patterns/GridPattern.tsx - FIXED: True edge-to-edge solid wall
import { BasePattern, type PatternState, type Position } from './BasePattern';

export class GridPattern extends BasePattern {
  generatePositions(time: number): PatternState {
    const positions: Position[] = [];
    const rotations: [number, number, number][] = [];
    
    const totalPhotos = Math.min(this.settings.photoCount, 500);
    
    // Calculate grid dimensions with aspect ratio
    const aspectRatio = this.settings.gridAspectRatio || 1.0;
    const columns = Math.ceil(Math.sqrt(totalPhotos * aspectRatio));
    const rows = Math.ceil(totalPhotos / columns);
    
    const photoSize = this.settings.photoSize || 4.0;
    const spacingPercentage = this.settings.photoSpacing || 0; // 0 to 1 (0% to 100%)
    
    // FIXED: True edge-to-edge when spacing is 0, equal spacing when spacing > 0
    let horizontalSpacing, verticalSpacing;
    
    if (spacingPercentage === 0) {
      // SOLID WALL: Photos touch edge-to-edge with NO gaps or overlaps
      horizontalSpacing = photoSize * 0.562; // 56.2% = exact edge-to-edge for 16:9 photos
      verticalSpacing = photoSize;           // Full photo height = no vertical overlap
    } else {
      // SPACED WALL: Equal gaps between photos horizontally and vertically
      const gapSize = spacingPercentage * photoSize * 2; // Wide range: 0 to 200% of photo size
      
      // Apply IDENTICAL spacing calculation for both directions
      horizontalSpacing = photoSize + gapSize;  // photoSize + equal gap
      verticalSpacing = photoSize + gapSize;    // photoSize + equal gap (same calculation)
    }
    
    // Wall positioning
    const wallHeight = this.settings.wallHeight || 0;
    
    // Calculate total wall dimensions
    const totalWallWidth = (columns - 1) * horizontalSpacing;
    const totalWallHeight = (rows - 1) * verticalSpacing;
    
    // Animation settings
    const speed = this.settings.animationSpeed / 100;
    const animationTime = this.settings.animationEnabled ? time * speed : 0;
    
    // Generate positions for all photos
    for (let i = 0; i < totalPhotos; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      
      // Base position - centered wall
      const x = (col * horizontalSpacing) - (totalWallWidth / 2);
      const baseY = wallHeight + (row * verticalSpacing);
      
      let z = 0;
      let y = baseY;
      
      // Subtle animation when enabled (only when there's spacing)
      if (this.settings.animationEnabled && spacingPercentage > 0) {
        const waveIntensity = spacingPercentage * photoSize * 0.2; // Scale with spacing
        
        const waveX = Math.sin(animationTime * 0.5 + col * 0.3) * waveIntensity;
        const waveY = Math.cos(animationTime * 0.5 + row * 0.3) * waveIntensity;
        
        y += waveY;
        z += waveX;
        
        // Keep above minimum wall height
        y = Math.max(y, wallHeight);
      }
      
      positions.push([x, y, z]);
      
      // Rotation handling
      if (this.settings.photoRotation) {
        let rotationX = 0, rotationY = 0, rotationZ = 0;
        
        if (this.settings.animationEnabled && spacingPercentage > 0) {
          rotationY = Math.atan2(x, z + 10);
          rotationX = Math.sin(animationTime * 0.3 + col * 0.1) * 0.05;
          rotationZ = Math.cos(animationTime * 0.3 + row * 0.1) * 0.05;
        }
        
        rotations.push([rotationX, rotationY, rotationZ]);
      } else {
        rotations.push([0, 0, 0]);
      }
    }
    
    return { positions, rotations };
  }
}