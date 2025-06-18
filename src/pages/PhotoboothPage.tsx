// src/pages/PhotoboothPage.tsx - FIXED: Mobile zoom prevention & larger capture button
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
  
  const [showError, setShowError] = useState(false);
  const { currentCollage, fetchCollageByCode, uploadPhoto, setupRealtimeSubscription, cleanupRealtimeSubscription, loading, error: storeError, photos } = useCollageStore();

  // SAFETY: Ensure photos is always an array
  const safePhotos = Array.isArray(photos) ? photos : [];

  // FIXED: Normalize code to uppercase for consistent database lookup
  const normalizedCode = code?.toUpperCase();

  const cleanupCamera = useCallback(() => {
    console.log('🧹 Cleaning up camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
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

  // FIXED: Wait for video element to be available
  const waitForVideoElement = useCallback(async (maxWaitMs: number = 5000): Promise<HTMLVideoElement | null> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      if (videoRef.current) {
        console.log('✅ Video element is available');
        return videoRef.current;
      }
      
      console.log('⏳ Waiting for video element...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.error('❌ Video element not available after waiting');
    return null;
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

      // FIXED: Wait for video element to be available before proceeding
      const videoElement = await waitForVideoElement();
      if (!videoElement) {
        throw new Error('Video element not available - component may not be fully mounted');
      }

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Detect platform
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid;
      
      console.log('📱 Platform detected:', { isIOS, isAndroid, isMobile });
      
      // Build constraints based on platform
      let constraints: MediaStreamConstraints;
      
      if (deviceId) {
        constraints = {
          video: {
            deviceId: { exact: deviceId },
            ...(isMobile ? { facingMode: "user" } : {}),
            ...(isIOS ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 }
            } : {})
          },
          audio: false
        };
      } else {
        constraints = {
          video: isMobile ? { facingMode: "user" } : true,
          audio: false
        };
      }
      
      console.log('🔧 Using constraints:', constraints);
      
      // Get user media
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
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
      
      // FIXED: Double-check video element is still available
      if (!videoRef.current) {
        // Clean up stream if video element disappeared
        mediaStream.getTracks().forEach(track => track.stop());
        throw new Error('Video element became unavailable during setup');
      }
      
      // Set up video element
      videoRef.current.srcObject = mediaStream;
      
      // Setup event listeners
      const video = videoRef.current;
      
      const handleLoadedMetadata = () => {
        console.log('📹 Video metadata loaded, playing...');
        if (!video) return;
        
        video.play().then(() => {
          streamRef.current = mediaStream;
          setCameraState('active');
          console.log('✅ Camera active and streaming');
        }).catch(playErr => {
          console.error('❌ Failed to play video:', playErr);
          setCameraState('error');
          setError('Failed to start video playback');
          // Clean up stream on play error
          mediaStream.getTracks().forEach(track => track.stop());
        });
      };
      
      const handleError = (event: Event) => {
        console.error('❌ Video element error:', event);
        setCameraState('error');
        setError('Video playback error');
        // Clean up stream on video error
        mediaStream.getTracks().forEach(track => track.stop());
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      video.addEventListener('error', handleError, { once: true });
      
      // Timeout fallback
      const timeoutId = setTimeout(() => {
        if (cameraState === 'starting' && video) {
          console.log('⏰ Camera start timeout, forcing play...');
          video.play().catch(err => {
            console.error('❌ Timeout play failed:', err);
            setCameraState('error');
            setError('Camera initialization timeout');
            // Clean up stream on timeout
            mediaStream.getTracks().forEach(track => track.stop());
          });
        }
      }, 5000); // Increased timeout to 5 seconds
      
      // Clean up timeout when camera becomes active
      const checkActive = setInterval(() => {
        if (cameraState === 'active') {
          clearTimeout(timeoutId);
          clearInterval(checkActive);
        }
      }, 100);
      
    } catch (err: any) {
      console.error('❌ Camera initialization failed:', err);
      setCameraState('error');
      
      let errorMessage = 'Failed to access camera. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access denied. Please allow camera access and refresh the page.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please check your camera and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is busy. Please close other apps using the camera and try again.';
      } else if (err.name === 'OverconstrainedError') {
        // Try fallback constraints
        try {
          console.log('🔄 Trying fallback constraints...');
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, 
            audio: false 
          });
          
          // FIXED: Check video element again for fallback
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();
            streamRef.current = fallbackStream;
            setCameraState('active');
            setError(null);
            console.log('✅ Fallback camera working');
            return;
          } else {
            // Clean up fallback stream if no video element
            fallbackStream.getTracks().forEach(track => track.stop());
            throw new Error('Video element not available for fallback');
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
  }, [selectedDevice, cameraState, cleanupCamera, getVideoDevices, waitForVideoElement]);

  const switchCamera = useCallback(() => {
    if (devices.length <= 1) return;
    
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDevice);
    const nextIndex = (currentIndex + 1) % devices.length;
    handleDeviceChange(devices[nextIndex].deviceId);
  }, [devices, selectedDevice]);

  const handleDeviceChange = useCallback((newDeviceId: string) => {
    if (newDeviceId === selectedDevice) return;
    
    setSelectedDevice(newDeviceId);
    
    // Only restart camera if we're currently showing the camera view
    if (!photo && cameraState !== 'starting') {
      console.log('📱 Device changed, restarting camera...');
      startCamera(newDeviceId);
    }
  }, [selectedDevice, photo, cameraState, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || cameraState !== 'active') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Calculate 9:16 aspect ratio dimensions
    const targetAspectRatio = 9 / 16;
    const videoAspectRatio = video.videoWidth / video.videoHeight;
    
    let sourceWidth, sourceHeight, sourceX, sourceY;
    
    if (videoAspectRatio > targetAspectRatio) {
      // Video is wider than target, crop horizontally
      sourceHeight = video.videoHeight;
      sourceWidth = sourceHeight * targetAspectRatio;
      sourceX = (video.videoWidth - sourceWidth) / 2;
      sourceY = 0;
    } else {
      // Video is taller than target, crop vertically  
      sourceWidth = video.videoWidth;
      sourceHeight = sourceWidth / targetAspectRatio;
      sourceX = 0;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }

    // Set canvas dimensions to 9:16 aspect ratio
    const canvasWidth = 540; // 9:16 ratio at reasonable resolution
    const canvasHeight = 960;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw the cropped video frame
    context.drawImage(
      video,
      sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle (cropped)
      0, 0, canvasWidth, canvasHeight // Destination rectangle (full canvas)
    );

    // Add text overlay if provided with dynamic sizing
    if (text.trim()) {
      // Dynamic font size calculation - starts large and gets smaller with longer text
      const baseSize = Math.min(canvasWidth, canvasHeight) * 0.12; // Larger base size
      const dynamicSize = Math.max(baseSize * 0.4, baseSize - (text.length * 1.5)); // Dynamic scaling
      const fontSize = dynamicSize;
      
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Enhanced shadow for better readability
      context.shadowColor = 'rgba(0,0,0,0.9)';
      context.shadowBlur = 8;
      context.shadowOffsetX = 3;
      context.shadowOffsetY = 3;
      
      // White text with stronger black outline
      context.strokeStyle = 'black';
      context.lineWidth = fontSize * 0.08;
      context.fillStyle = 'white';
      
      // Split text into lines if too long
      const maxWidth = canvasWidth * 0.85; // Slightly more padding
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0] || '';

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);

      // Draw each line with improved spacing
      const lineHeight = fontSize * 1.1;
      const totalHeight = lines.length * lineHeight;
      const startY = (canvasHeight - totalHeight) / 2 + fontSize / 2;

      lines.forEach((line, index) => {
        const textY = startY + index * lineHeight;
        const textX = canvasWidth / 2;
        
        // Draw outline first
        context.strokeText(line, textX, textY);
        // Then fill text
        context.fillText(line, textX, textY);
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

  // FIXED: Load collage on mount with normalized (uppercase) code
  useEffect(() => {
    if (normalizedCode) {
      console.log('🔍 Fetching collage with normalized code:', normalizedCode);
      setShowError(false); // Reset error state when starting new fetch
      fetchCollageByCode(normalizedCode);
    }
  }, [normalizedCode, fetchCollageByCode]);

  // Delay showing error to prevent flash
  useEffect(() => {
    if (storeError && !loading && !currentCollage) {
      const timer = setTimeout(() => {
        setShowError(true);
      }, 1000); // Wait 1 second before showing error
      
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [storeError, loading, currentCollage]);

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

  // FIXED: Initialize camera with better timing
  useEffect(() => {
    if (!photo && cameraState === 'idle' && !isInitializingRef.current && currentCollage) {
      console.log('🚀 Initializing camera...');
      // Increased delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startCamera(selectedDevice);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [photo, cameraState, startCamera, selectedDevice, currentCollage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up...');
      cleanupCamera();
    };
  }, [cleanupCamera]);

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

  // Show loading while fetching collage OR if we don't have a collage yet but no error
  if (loading || (!currentCollage && !storeError)) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
            <p className="text-white">Loading photobooth...</p>
            <p className="text-gray-400 text-sm mt-2">
              Looking for collage: {normalizedCode}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error ONLY if we have an actual error AND we're not loading AND showError is true
  if (showError && storeError && !loading && !currentCollage) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Collage Not Found</h2>
              <p className="text-red-200 mb-4">
                {storeError || `No collage found with code "${normalizedCode}"`}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/join')}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Try Another Code
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Ensure we have a currentCollage before rendering the main UI
  if (!currentCollage) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
            <p className="text-white">Loading photobooth...</p>
            <p className="text-gray-400 text-sm mt-2">
              Looking for collage: {normalizedCode}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/collage/${currentCollage?.code || ''}`)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                <Camera className="w-6 h-6 text-purple-500" />
                <span>Photobooth</span>
              </h1>
              <p className="text-gray-400">{currentCollage?.name} • Code: {currentCollage?.code}</p>
            </div>
          </div>
          
          {/* Camera Controls */}
          {!photo && devices.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title="Switch Camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg ${
            error.includes('successfully') 
              ? 'bg-green-900/30 border border-green-500/50 text-green-200'
              : 'bg-red-900/30 border border-red-500/50 text-red-200'
          }`}>
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Camera/Photo View */}
          <div className="flex-1 flex justify-center">
            <div className="bg-gray-900 rounded-lg overflow-hidden w-full max-w-xs sm:max-w-sm lg:max-w-md">
              {photo ? (
                /* Photo Preview - 9:16 aspect ratio */
                <div className="relative aspect-[9/16]">
                  <img 
                    src={photo} 
                    alt="Captured photo" 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Photo Controls Overlay */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={retakePhoto}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retake</span>
                      </button>
                      
                      <button
                        onClick={downloadPhoto}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                      
                      <button
                        onClick={uploadToCollage}
                        disabled={uploading}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
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
                  </div>
                </div>
              ) : (
                /* Camera View - 9:16 aspect ratio */
                <div className="relative aspect-[9/16] bg-gray-800">
                  {/* Video Element */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Camera State Overlay */}
                  {cameraState !== 'active' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white">
                        {cameraState === 'starting' && (
                          <>
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-2"></div>
                            <p className="text-sm">Starting camera...</p>
                          </>
                        )}
                        {cameraState === 'error' && (
                          <>
                            <Camera className="w-8 h-8 mx-auto mb-2 text-red-400" />
                            <p className="text-red-200 text-sm mb-2">Camera unavailable</p>
                            <button
                              onClick={() => startCamera(selectedDevice)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                            >
                              Retry
                            </button>
                          </>
                        )}
                        {cameraState === 'idle' && (
                          <>
                            <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm mb-2">Camera not started</p>
                            <button
                              onClick={() => startCamera(selectedDevice)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                            >
                              Start Camera
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Text Overlay Preview */}
                  {text.trim() && cameraState === 'active' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
                      <div 
                        className="text-white font-bold text-center px-4 py-3 bg-black/60 backdrop-blur-sm rounded-xl max-w-[90%] border border-white/20"
                        style={{ 
                          fontSize: `${Math.max(1.5, 4 - (text.length / 20))}rem`,
                          textShadow: '3px 3px 6px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)',
                          lineHeight: '1.2'
                        }}
                      >
                        {text}
                      </div>
                    </div>
                  )}
                  
                  {/* FIXED: Text Input Field - Positioned above capture button */}
                  <div className="absolute bottom-28 sm:bottom-24 lg:bottom-20 left-2 right-2 px-2">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Add text to your photo..."
                      className="w-full h-10 sm:h-12 bg-black/70 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 resize-none focus:outline-none focus:border-purple-400 focus:bg-black/80 transition-all"
                      style={{ fontSize: '16px' }} // CRITICAL: Prevents iOS zoom
                      maxLength={100}
                    />
                    <div className="flex justify-between items-center mt-1 px-1">
                      <span className="text-xs text-gray-300">
                        {text.length}/100
                      </span>
                      {text && (
                        <button
                          onClick={() => setText('')}
                          className="text-xs text-red-300 hover:text-red-200 transition-colors px-2 py-1"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* FIXED: Larger Capture Button for better mobile usability */}
                  {cameraState === 'active' && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <button
                        onClick={capturePhoto}
                        className="w-20 h-20 sm:w-16 sm:h-16 lg:w-14 lg:h-14 bg-white rounded-full border-4 border-gray-300 hover:border-gray-400 transition-all active:scale-95 flex items-center justify-center shadow-lg"
                        style={{ touchAction: 'manipulation' }} // Prevents double-tap zoom
                      >
                        <div className="w-14 h-14 sm:w-10 sm:h-10 lg:w-8 lg:h-8 bg-gray-300 rounded-full"></div>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Hidden Canvas for Photo Processing */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          {/* Controls Panel - Desktop Side Panel */}
          <div className="w-full lg:w-72 space-y-4 lg:space-y-6">
            {/* Camera Settings */}
            {devices.length > 1 && (
              <div className="bg-gray-900 rounded-lg p-4 lg:p-6">
                <div className="flex items-center space-x-2 mb-3 lg:mb-4">
                  <Settings className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
                  <h3 className="text-base lg:text-lg font-semibold text-white">Camera Settings</h3>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Camera Device
                  </label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    style={{ fontSize: '16px' }} // CRITICAL: Prevents iOS zoom
                  >
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-gray-900 rounded-lg p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4">How to use</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>1. Allow camera access when prompted</p>
                <p>2. Add text in the field above the capture button</p>
                <p>3. Tap the large white button to take a photo</p>
                <p>4. Review and upload to the collage</p>
              </div>
            </div>

            {/* Upload Tips */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold text-purple-300 mb-3">Tips</h3>
              <div className="space-y-2 text-sm text-purple-200">
                <p>• Hold your device steady for clearer photos</p>
                <p>• Make sure you have good lighting</p>
                <p>• Text gets larger with shorter messages</p>
                <p>• Text appears centered and easy to read</p>
                <p>• Photos appear in the collage automatically</p>
              </div>
            </div>

            {/* Collage Info */}
            {currentCollage && (
              <div className="bg-gray-900 rounded-lg p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold text-white mb-3">Collage Info</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="text-white truncate ml-2">{currentCollage.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Code:</span>
                    <span className="text-white font-mono">{currentCollage.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Photos:</span>
                    <span className="text-white">{safePhotos.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PhotoboothPage;