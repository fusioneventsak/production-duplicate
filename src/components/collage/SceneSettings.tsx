// src/components/collage/SceneSettings.tsx - ENHANCED with all grid and camera controls
import React from 'react';
import { 
  Palette, 
  Camera, 
  Lightbulb, 
  Square, 
  Grid,
  Move3D,
  RotateCcw,
  MousePointer,
  Smartphone
} from 'lucide-react';
import { SceneSettings } from '../../store/sceneStore';

type SceneSettingsProps = {
  settings: SceneSettings;
  onSettingsChange: (settings: Partial<SceneSettings>, debounce?: boolean) => void;
};

const SceneSettingsComponent: React.FC<SceneSettingsProps> = ({ 
  settings, 
  onSettingsChange 
}) => {
  return (
    <div className="space-y-6">
      {/* Camera Controls */}
      <div>
        <h4 className="flex items-center text-sm font-medium text-gray-200 mb-3">
          <Camera className="h-4 w-4 mr-2" />
          Camera Controls
        </h4>
        
        <div className="space-y-4">
          {/* Enable Camera Controls */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.cameraEnabled !== false}
              onChange={(e) => onSettingsChange({ 
                cameraEnabled: e.target.checked 
              })}
              className="mr-2 bg-gray-800 border-gray-700"
            />
            <label className="text-sm text-gray-300 flex items-center">
              <MousePointer className="h-3 w-3 mr-1" />
              Enable Mouse/Touch Controls
            </label>
          </div>

          {/* Camera Auto Rotation */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.cameraRotationEnabled}
              onChange={(e) => onSettingsChange({ 
                cameraRotationEnabled: e.target.checked 
              })}
              className="mr-2 bg-gray-800 border-gray-700"
            />
            <label className="text-sm text-gray-300 flex items-center">
              <RotateCcw className="h-3 w-3 mr-1" />
              Auto Rotation
            </label>
          </div>

          {settings.cameraRotationEnabled && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Rotation Speed
                <span className="ml-2 text-xs text-gray-400">{settings.cameraRotationSpeed?.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={settings.cameraRotationSpeed || 0.5}
                onChange={(e) => onSettingsChange({ 
                  cameraRotationSpeed: parseFloat(e.target.value) 
                }, true)}
                className="w-full bg-gray-800"
              />
            </div>
          )}

          {/* Camera Distance */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Camera Distance
              <span className="ml-2 text-xs text-gray-400">{Math.round(settings.cameraDistance || 25)} units</span>
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={settings.cameraDistance || 25}
              onChange={(e) => onSettingsChange({ 
                cameraDistance: parseFloat(e.target.value) 
              }, true)}
              className="w-full bg-gray-800"
            />
          </div>

          {/* Camera Height */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Camera Height
              <span className="ml-2 text-xs text-gray-400">{Math.round(settings.cameraHeight || 10)} units</span>
            </label>
            <input
              type="range"
              min="-20"
              max="50"
              step="2"
              value={settings.cameraHeight || 10}
              onChange={(e) => onSettingsChange({ 
                cameraHeight: parseFloat(e.target.value) 
              }, true)}
              className="w-full bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Floor Settings */}
      <div>
        <h4 className="flex items-center text-sm font-medium text-gray-200 mb-3">
          <Square className="h-4 w-4 mr-2" />
          Floor
        </h4>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.floorEnabled}
              onChange={(e) => onSettingsChange({ 
                floorEnabled: e.target.checked 
              })}
              className="mr-2 bg-gray-800 border-gray-700"
            />
            <label className="text-sm text-gray-300">
              Show Floor
            </label>
          </div>

          {settings.floorEnabled && (
            <>
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Floor Size
                  <span className="ml-2 text-xs text-gray-400">{Math.round(settings.floorSize || 200)} units</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={settings.floorSize || 200}
                  onChange={(e) => onSettingsChange({ floorSize: parseFloat(e.target.value) }, true)}
                  className="w-full bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Floor Color
                </label>
                <input
                  type="color"
                  value={settings.floorColor || '#1A1A1A'}
                  onChange={(e) => onSettingsChange({ 
                    floorColor: e.target.value 
                  }, true)}
                  className="w-full h-8 rounded cursor-pointer bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Floor Opacity
                  <span className="ml-2 text-xs text-gray-400">{Math.round((settings.floorOpacity || 1) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.floorOpacity || 1}
                  onChange={(e) => onSettingsChange({ 
                    floorOpacity: parseFloat(e.target.value) 
                  }, true)}
                  className="w-full bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Floor Metalness
                  <span className="ml-2 text-xs text-gray-400">{Math.round((settings.floorMetalness || 0.5) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.floorMetalness || 0.5}
                  onChange={(e) => onSettingsChange({ 
                    floorMetalness: parseFloat(e.target.value) 
                  }, true)}
                  className="w-full bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Floor Roughness
                  <span className="ml-2 text-xs text-gray-400">{Math.round((settings.floorRoughness || 0.5) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.floorRoughness || 0.5}
                  onChange={(e) => onSettingsChange({ 
                    floorRoughness: parseFloat(e.target.value) 
                  }, true)}
                  className="w-full bg-gray-800"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid Settings */}
      <div>
        <h4 className="flex items-center text-sm font-medium text-gray-200 mb-3">
          <Grid className="h-4 w-4 mr-2" />
          Floor Grid
        </h4>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox" 
              checked={settings.gridEnabled}
              onChange={(e) => onSettingsChange({
                gridEnabled: e.target.checked
              })} 
              className="mr-2 bg-gray-800 border-gray-700"
            />
            <label className="text-sm text-gray-300">
              Show Grid Lines
            </label>
          </div>

          {settings.gridEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Grid Color</label>
                <input
                  type="color"
                  value={settings.gridColor || '#444444'}
                  onChange={(e) => onSettingsChange({
                    gridColor: e.target.value
                  }, true)}
                  className="w-full h-8 rounded cursor-pointer bg-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Grid Size
                  <span className="ml-2 text-xs text-gray-400">{Math.round(settings.gridSize || 200)} units</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={settings.gridSize || 200}
                  onChange={(e) => onSettingsChange({ gridSize: parseFloat(e.target.value) }, true)}
                  className="w-full bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Grid Divisions
                  <span className="ml-2 text-xs text-gray-400">{Math.round(settings.gridDivisions || 30)} lines</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={settings.gridDivisions || 30}
                  onChange={(e) => onSettingsChange({ gridDivisions: parseFloat(e.target.value) }, true)}
                  className="w-full bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Grid Opacity
                  <span className="ml-2 text-xs text-gray-400">{Math.round((settings.gridOpacity || 1) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.gridOpacity || 1}
                  onChange={(e) => onSettingsChange({ gridOpacity: parseFloat(e.target.value) }, true)}
                  className="w-full bg-gray-800"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Background Settings */}
      <div>
        <h4 className="flex items-center text-sm font-medium text-gray-200 mb-3">
          <Palette className="h-4 w-4 mr-2" />
          Background
        </h4>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.backgroundGradient}
              onChange={(e) => onSettingsChange({ 
                backgroundGradient: e.target.checked 
              })}
              className="mr-2 bg-gray-800 border-gray-700"
            />
            <label className="text-sm text-gray-300">
              Use Gradient Background
            </label>
          </div>

          {!settings.backgroundGradient ? (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Background Color</label>
              <input
                type="color"
                value={settings.backgroundColor || '#000000'}
                onChange={(e) => onSettingsChange({ 
                  backgroundColor: e.target.value 
                }, true)}
                className="w-full h-8 rounded cursor-pointer bg-gray-800"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Gradient Start</label>
                <input
                  type="color"
                  value={settings.backgroundGradientStart || '#000000'}
                  onChange={(e) => onSettingsChange({ 
                    backgroundGradientStart: e.target.value 
                  }, true)}
                  className="w-full h-8 rounded cursor-pointer bg-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-2">Gradient End</label>
                <input
                  type="color"
                  value={settings.backgroundGradientEnd || '#1a1a1a'}
                  onChange={(e) => onSettingsChange({ 
                    backgroundGradientEnd: e.target.value 
                  }, true)}
                  className="w-full h-8 rounded cursor-pointer bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Gradient Angle
                  <span className="ml-2 text-xs text-gray-400">{Math.round(settings.backgroundGradientAngle || 180)}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={settings.backgroundGradientAngle || 180}
                  onChange={(e) => onSettingsChange({ 
                    backgroundGradientAngle: parseFloat(e.target.value) 
                  }, true)}
                  className="w-full bg-gray-800"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Photo Settings */}
      <div>
        <h4 className="flex items-center text-sm font-medium text-gray-200 mb-3">
          <Square className="h-4 w-4 mr-2" />
          Photos
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Photo Count
              <span className="ml-2 text-xs text-gray-400">{Math.round(settings.photoCount || 50)} photos</span>
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={settings.photoCount || 50}
              onChange={(e) => onSettingsChange({ 
                photoCount: parseFloat(e.target.value) 
              })}
              className="w-full bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Photo Size
              <span className="ml-2 text-xs text-gray-400">{(settings.photoSize || 4).toFixed(1)} units</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={settings.photoSize || 4}
              onChange={(e) => onSettingsChange({ 
                photoSize: parseFloat(e.target.value) 
              }, true)}
              className="w-full bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Empty Slot Color</label>
            <input
              type="color"
              value={settings.emptySlotColor || '#1A1A1A'}
              onChange={(e) => onSettingsChange({ 
                emptySlotColor: e.target.value 
              }, true)}
              className="w-full h-8 rounded cursor-pointer bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Photo Brightness
              <span className="ml-2 text-xs text-gray-400">{Math.round((settings.photoBrightness || 1) * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={settings.photoBrightness || 1}
              onChange={(e) => onSettingsChange({ 
                photoBrightness: parseFloat(e.target.value) 
              }, true)}
              className="w-full bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Animation Settings */}
      <div>
        <h4 className="flex items-center text-sm font-medium text-gray-200 mb-3">
          <Move3D className="h-4 w-4 mr-2" />
          Animation
        </h4>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.animationEnabled}
              onChange={(e) => onSettingsChange({ 
                animationEnabled: e.target.checked 
              })}
              className="mr-2 bg-gray-800 border-gray-700"
            />
            <label className="text-sm text-gray-300">
              Enable Animation
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Animation Pattern</label>
            <select
              value={settings.animationPattern || 'grid'}
              onChange={(e) => onSettingsChange({ 
                animationPattern: e.target.value as SceneSettings['animationPattern']
              })}
              className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white"
            >
              <option value="grid">Grid Wall</option>
              <option value="float">Float</option>
              <option value="wave">Wave</option>
              <option value="spiral">Spiral</option>
            </select>
          </div>

          {settings.animationEnabled && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Animation Speed
                <span className="ml-2 text-xs text-gray-400">{Math.round(settings.animationSpeed || 50)}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={settings.animationSpeed || 50}
                onChange={(e) => onSettingsChange({ 
                  animationSpeed: parseFloat(e.target.value) 
                }, true)}
                className="w-full bg-gray-800"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneSettingsComponent;