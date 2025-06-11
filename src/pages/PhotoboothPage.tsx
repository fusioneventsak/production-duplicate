// src/pages/PhotoboothPage.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, SwitchCamera, Download, Send, X, RefreshCw, Type, ArrowLeft, Settings } from 'lucide-react';
import { useCollageStore, Photo } from '../store/collageStore';
import Layout from '../components/layout/Layout';

type VideoDevice = {
  deviceId: string;
  label: string;
};

type CameraState = 'idle' | 'starting' | 'active' | 'error';

const PhotoboothPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isInitializingRef = useRef(false);
  
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  
  const { currentCollage, fetchCollageByCode, uploadPhoto, setupRealtimeSubscription, cleanupRealtimeSubscription } = useCollageStore();

  const cleanupCamera = useCallback(() => {
    console.log('🧹 Cleaning up camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('🛑 Stopping track:', track.kind, track.label);
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
      // Force cleanup
      videoRef.current.load();
    }
    
    setCameraState('idle');
  }, []);

  const getVideoDevices = useCallback(async (): Promise<VideoDevice[]> => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId}`
        }));
      
      console.log('📹 Available video devices:', videoDevices);
      return videoDevices;
    } catch (error) {
      console.warn('⚠️ Could not enumerate devices:', error);
      return [];
    }
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      console.log('🔄 Camera initialization already in progress, skipping...');
      return;
    }

    console.log('🎥 Starting camera initialization with device:', deviceId);
    isInitializingRef.current = true;
    setCameraState('starting');
    setError(null);

    try {
      // Clean up any existing camera first
      cleanupCamera();

      // Longer delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Detect platform
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid;
      
      console.log('📱 Platform detected:', { isIOS, isAndroid, isMobile });
      
      // Build constraints based on platform - maintain natural aspect ratio
      let constraints: MediaStreamConstraints;
      
      if (deviceId) {
        constraints = {
          video: {
            deviceId: { exact: deviceId },
            facingMode: "user",
            // Don't force specific dimensions - let camera use natural resolution
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
      } else {
        constraints = {
          video: {
            facingMode: "user",
            // Use natural camera resolution
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
      }
      
      console.log('🔧 Using constraints:', constraints);
      
      // Get user media with retry logic
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstAttemptError) {
        console.warn('⚠️ First attempt failed, trying fallback constraints...', firstAttemptError);
        
        // Try with simpler constraints
        const fallbackConstraints = {
          video: { facingMode: "user" },
          audio: false
        };
        
        mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }
      
      console.log('✅ Got media stream:', mediaStream.active);
      
      // Update devices list after getting permission
      const videoDevices = await getVideoDevices();
      setDevices(videoDevices);
      
      // Auto-select front camera on mobile if not already selected
      if (!selectedDevice && videoDevices.length > 0 && isMobile) {
        const frontCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('front') ||
          device.label.toLowerCase().includes('user') ||
          device.label.toLowerCase().includes('selfie') ||
          device.label.toLowerCase().includes('facetime')
        );
        
        if (frontCamera) {
          console.log('📱 Auto-selecting front camera:', frontCamera.label);
          setSelectedDevice(frontCamera.deviceId);
        } else {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      }
      
      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Setup event listeners
        const video = videoRef.current;
        
        const handleLoadedMetadata = () => {
          console.log('📹 Video metadata loaded, playing...');
          video.play().then(() => {
            streamRef.current = mediaStream;
            setCameraState('active');
            console.log('✅ Camera active and streaming');
          }).catch(playErr => {
            console.error('❌ Failed to play video:', playErr);
            setCameraState('error');
            setError('Failed to start video playback');
          });
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        
        // Timeout fallback
        setTimeout(() => {
          if (cameraState === 'starting') {
            console.log('⏰ Camera start timeout, forcing play...');
            video.play().catch(console.error);
          }
        }, 3000);
      }
      
    } catch (err: any) {
      console.error('❌ Camera initialization failed:', err);
      setCameraState('error');
      
      let errorMessage = 'Failed to access camera. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access denied. Please allow camera access and refresh the page.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please check your camera and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is busy or in use by another application. Please close other apps using the camera and try again.';
      } else if (err.name === 'OverconstrainedError') {
        // Try fallback constraints
        try {
          console.log('🔄 Trying fallback constraints...');
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, 
            audio: false 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();
            streamRef.current = fallbackStream;
            setCameraState('active');
            setError(null);
            console.log('✅ Fallback camera working');
            return;
          }
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          errorMessage = 'Camera not compatible with this device.';
        }
      } else {
        errorMessage += err.message || 'Unknown camera error.';
      }
      
      setError(errorMessage);
    } finally {
      isInitializingRef.current = false;
    }
  }, [selectedDevice, cameraState, cleanupCamera, getVideoDevices]);

  const switchCamera = useCallback(() => {
    if (devices.length <= 1) return;
    
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDevice);
    const nextIndex = (currentIndex + 1) % devices.length;
    handleDeviceChange(devices[nextIndex].deviceId);
  }, [devices, selectedDevice]);

  // Load collage on mount
  useEffect(() => {
    if (code) {
      fetchCollageByCode(code);
    }
  }, [code, fetchCollageByCode]);

  // Setup realtime subscription when collage is loaded
  useEffect(() => {
    if (currentCollage?.id) {
      console.log('🔄 Setting up realtime subscription in photobooth for collage:', currentCollage.id);
      setupRealtimeSubscription(currentCollage.id);
    }
    
    return () => {
      cleanupRealtimeSubscription();
    };
  }, [currentCollage?.id, setupRealtimeSubscription, cleanupRealtimeSubscription]);

  // Initialize camera when component mounts and when returning from photo view
  useEffect(() => {
    if (!photo && cameraState === 'idle' && !isInitializingRef.current) {
      console.log('🚀 Initializing camera...');
      const timer = setTimeout(() => {
        startCamera(selectedDevice);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [photo, cameraState, startCamera, selectedDevice]);

  // Cleanup on unmount and when switching devices
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up...');
      cleanupCamera();
    };
  }, [cleanupCamera]);

  // Also cleanup when device changes
  useEffect(() => {
    return () => {
      if (selectedDevice) {
        console.log('🔄 Device changed, cleaning up old camera...');
        cleanupCamera();
      }
    };
  }, [selectedDevice, cleanupCamera]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 Page hidden, pausing camera...');
      } else {
        console.log('📱 Page visible, resuming camera...');
        if (!photo && cameraState === 'idle') {
          setTimeout(() => startCamera(selectedDevice), 100);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [photo, cameraState, startCamera, selectedDevice]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || cameraState !== 'active') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Use the video's natural dimensions to avoid distortion
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Calculate portrait dimensions (9:16 aspect ratio)
    let captureWidth, captureHeight;
    const targetAspectRatio = 9 / 16;
    const videoAspectRatio = videoWidth / videoHeight;
    
    if (videoAspectRatio > targetAspectRatio) {
      // Video is wider than target, crop width
      captureHeight = videoHeight;
      captureWidth = videoHeight * targetAspectRatio;
    } else {
      // Video is taller than target, crop height  
      captureWidth = videoWidth;
      captureHeight = videoWidth / targetAspectRatio;
    }
    
    // Center the crop
    const startX = (videoWidth - captureWidth) / 2;
    const startY = (videoHeight - captureHeight) / 2;

    canvas.width = captureWidth;
    canvas.height = captureHeight;

    // Draw the video frame - handle mirroring and cropping
    context.save();
    context.scale(-1, 1); // Mirror horizontally
    context.drawImage(
      video, 
      startX, startY, captureWidth, captureHeight, // Source crop
      -captureWidth, 0, captureWidth, captureHeight // Destination (mirrored)
    );
    context.restore();

    // Add text overlay if provided
    if (text.trim()) {
      const fontSize = Math.min(canvas.width, canvas.height) * 0.05; // Smaller font size
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Add shadow for better readability
      context.shadowColor = 'rgba(0,0,0,0.9)';
      context.shadowBlur = 3;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      
      // White text with black outline
      context.strokeStyle = 'black';
      context.lineWidth = fontSize * 0.08;
      context.fillStyle = 'white';
      
      // Split text into words and handle line breaks
      const maxWidth = canvas.width * 0.85; // Slightly narrower
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0] || '';

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const width = context.measureText(testLine).width;
        if (width < maxWidth && lines.length < 1) { // Limit to 2 lines max
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);

      // Draw text in lower third position (matching preview and final photo)
      const lineHeight = fontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      const textY = canvas.height - 120 - (totalHeight / 2); // Position in lower third to match preview
      const textX = canvas.width / 2;

      lines.forEach((line, index) => {
        const y = textY + (index * lineHeight);
        context.strokeText(line, textX, y);
        context.fillText(line, textX, y);
      });
      
      // Reset shadow
      context.shadowColor = 'transparent';
      context.shadowBlur = 0;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    setPhoto(dataUrl);
    
    // Stop camera after taking photo to free up resources
    cleanupCamera();
  }, [text, cameraState, cleanupCamera]);

  const uploadToCollage = useCallback(async () => {
    if (!photo || !currentCollage) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch(photo);
      const blob = await response.blob();
      const file = new File([blob], 'photobooth.jpg', { type: 'image/jpeg' });

      const result = await uploadPhoto(currentCollage.id, file);
      if (result) {        
        // Reset state
        setPhoto(null);
        setText('');
        
        // Show success message
        setError('Photo uploaded successfully! Your photo will appear in the collage automatically.');
        setTimeout(() => setError(null), 3000);
        
        // Restart camera after a brief delay
        setTimeout(() => {
          console.log('🔄 Restarting camera after upload...');
          startCamera(selectedDevice);
        }, 500);
        
      } else {
        throw new Error('Failed to upload photo');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }, [photo, currentCollage, uploadPhoto, startCamera, selectedDevice]);

  const downloadPhoto = useCallback(() => {
    if (!photo) return;
    const link = document.createElement('a');
    link.href = photo;
    link.download = 'photobooth.jpg';
    link.click();
  }, [photo]);

  const retakePhoto = useCallback(() => {
    setPhoto(null);
    setText('');
    
    // Restart camera immediately
    setTimeout(() => {
      console.log('🔄 Restarting camera after retake...');
      startCamera(selectedDevice);
    }, 100);
  }, [startCamera, selectedDevice]);

  const handleDeviceChange = useCallback((newDeviceId: string) => {
    if (newDeviceId === selectedDevice) return;
    
    setSelectedDevice(newDeviceId);
    
    // Only restart camera if we're currently showing the camera view
    if (!photo && cameraState !== 'starting') {
      console.log('📱 Device changed, restarting camera...');
      startCamera(newDeviceId);
    }
  }, [selectedDevice, photo, cameraState, startCamera]);

  if (!currentCollage) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
            <p className="text-white">Loading photobooth...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-160px)] flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center justify-between p-4 lg:px-8 lg:py-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/collage/${currentCollage.code}`)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-white flex items-center space-x-2">
                <Camera className="w-5 h-5 text-purple-500" />
                <span>Photobooth</span>
              </h1>
              <p className="text-xs lg:text-sm text-gray-400">{currentCollage.name} • {currentCollage.code}</p>
            </div>
          </div>
          
          {/* Camera Switch Button */}
          {!photo && devices.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-2 lg:p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className={`mx-4 lg:mx-8 mt-4 p-3 lg:p-4 rounded-lg ${
            error.includes('successfully') 
              ? 'bg-green-900/30 border border-green-500/50 text-green-200'
              : 'bg-red-900/30 border border-red-500/50 text-red-200'
          }`}>
            <p className="text-sm lg:text-base">{error}</p>
          </div>
        )}

        {/* Main Photobooth Content */}
        <div className="flex-1 flex flex-col lg:flex-row lg:items-center justify-center p-4 lg:p-8 gap-6 lg:gap-12">
          
          {/* Photobooth Preview - Portrait Oriented */}
          <div className="flex flex-col items-center space-y-4 lg:space-y-6">
            
            {/* Camera/Photo Container */}
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
              {photo ? (
                /* Photo Preview with Glassmorphic Text Input - Portrait */
                <div className="relative max-w-xs lg:max-w-sm mx-auto">
                  <div 
                    className="relative bg-gray-800 rounded-lg overflow-hidden"
                    style={{ aspectRatio: '9/16' }}
                  >
                    <img 
                      src={photo} 
                      alt="Captured photo" 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Text Overlay on Photo Preview - Lower Third */}
                    {text.trim() && (
                      <div className="absolute bottom-[15%] left-4 right-4 pointer-events-none">
                        <div 
                          className="text-white font-bold text-center px-3 py-2 bg-black/70 backdrop-blur-sm rounded-lg mx-auto border border-white/20"
                          style={{ 
                            fontSize: 'clamp(0.875rem, 3vw, 1.25rem)',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                            lineHeight: '1.2',
                            maxWidth: '90%',
                            wordWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {text}
                        </div>
                      </div>
                    )}

                    {/* Glassmorphic Text Input Overlay - On Photo Preview */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/20 p-3 shadow-2xl">
                        <div className="flex items-center space-x-2 mb-2">
                          <Type className="w-3 h-3 text-white/80" />
                          <span className="text-xs font-medium text-white/90">Add Text to Photo</span>
                        </div>
                        
                        <textarea
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Type your message..."
                          className="w-full h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/60 resize-none focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all leading-tight"
                          maxLength={80}
                          rows={2}
                        />
                        
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-white/70">
                            {text.length}/80
                          </span>
                          {text && (
                            <button
                              onClick={() => setText('')}
                              className="text-xs text-red-300 hover:text-red-200 transition-colors px-2 py-1 hover:bg-red-500/20 rounded"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Camera View - Portrait Container with Natural Video */
                <div 
                  className="relative bg-gray-800 w-80 lg:w-96 mx-auto overflow-hidden rounded-lg" 
                  style={{ aspectRatio: '9/16' }}
                >
                  {/* Video Element - Natural aspect ratio, object-fit contains */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-gray-800"
                    style={{ 
                      transform: 'scaleX(-1)' // Mirror for selfie effect
                    }}
                  />
                  
                  {/* Camera State Overlay */}
                  {cameraState !== 'active' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="text-center text-white p-6">
                        {cameraState === 'starting' && (
                          <>
                            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
                            <p className="text-base lg:text-lg">Starting camera...</p>
                          </>
                        )}
                        {cameraState === 'error' && (
                          <>
                            <Camera className="w-16 h-16 mx-auto mb-4 text-red-400" />
                            <p className="text-red-200 mb-4 text-base lg:text-lg">Camera unavailable</p>
                            <button
                              onClick={() => startCamera(selectedDevice)}
                              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                            >
                              Retry Camera
                            </button>
                          </>
                        )}
                        {cameraState === 'idle' && (
                          <>
                            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <p className="mb-4 text-base lg:text-lg">Ready to start</p>
                            <button
                              onClick={() => startCamera(selectedDevice)}
                              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                            >
                              Start Camera
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Capture Button */}
                  {cameraState === 'active' && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                      <button
                        onClick={capturePhoto}
                        className="w-16 h-16 lg:w-20 lg:h-20 bg-white rounded-full border-4 border-gray-200 hover:border-purple-400 transition-all duration-200 flex items-center justify-center shadow-xl hover:shadow-2xl transform hover:scale-105"
                      >
                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-purple-500 rounded-full"></div>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Hidden Canvas for Photo Processing */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Photo Action Buttons */}
            {photo && (
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs lg:max-w-sm">
                <button
                  onClick={retakePhoto}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retake</span>
                </button>
                
                <button
                  onClick={downloadPhoto}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                
                <button
                  onClick={uploadToCollage}
                  disabled={uploading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-xl transition-colors flex items-center justify-center space-x-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Side Panel - Camera Settings & Instructions */}
          <div className="lg:w-80 space-y-4 lg:space-y-6">
            
            {/* Camera Settings */}
            {devices.length > 0 && (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <Settings className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                  <h3 className="text-base lg:text-lg font-semibold text-white">Camera Settings</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Camera
                  </label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    {devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold text-blue-300 mb-3 flex items-center">
                <span className="text-2xl mr-2">📸</span>
                How to Use
              </h3>
              <ul className="text-sm text-blue-200 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 font-bold">1.</span>
                  Position yourself in the camera view
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 font-bold">2.</span>
                  Click the big purple button to take photo
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 font-bold">3.</span>
                  Add optional text overlay after taking photo
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 font-bold">4.</span>
                  Upload to add it to the collage automatically!
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PhotoboothPage;