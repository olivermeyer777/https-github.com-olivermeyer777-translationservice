
import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaDevice, DeviceConfig } from '../types';

export const useMediaDevices = () => {
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [config, setConfig] = useState<DeviceConfig>({
    videoInputId: '',
    audioInputId: '',
    audioOutputId: ''
  });
  
  const streamRef = useRef<MediaStream | null>(null);
  const isMounted = useRef(true);

  // Simple enumerate without forcing permissions (prevents conflict with startCamera)
  const getDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

    try {
      const enumerate = await navigator.mediaDevices.enumerateDevices();
      if (!isMounted.current) return;

      const mapped = enumerate.map(d => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 5)}...)`,
        kind: d.kind
      }));
      setDevices(mapped);

      // Only set default config if we haven't selected anything yet
      setConfig(prev => {
        if (prev.videoInputId && prev.audioInputId) return prev;
        
        return {
            videoInputId: prev.videoInputId || mapped.find(d => d.kind === 'videoinput')?.deviceId || '',
            audioInputId: prev.audioInputId || mapped.find(d => d.kind === 'audioinput')?.deviceId || '',
            audioOutputId: prev.audioOutputId || mapped.find(d => d.kind === 'audiooutput')?.deviceId || '',
        };
      });
    } catch (e) {
      console.error("Error enumerating devices", e);
    }
  }, []);

  const startCamera = useCallback(async (videoDeviceId?: string) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
    
    // Stop existing stream first to release hardware
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }

    try {
        // If a specific ID is requested, use it. Otherwise use generic 'true' (any camera).
        // Note: 'exact' constraint can fail if the device is unavailable, so we fallback if needed.
        const videoConstraint = videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true;

        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: false // We handle audio separately in the Gemini Service usually, or here if needed for WebRTC
        });
        
        if (!isMounted.current) {
            stream.getTracks().forEach(t => t.stop());
            return null;
        }

        streamRef.current = stream;
        setActiveStream(stream);
        
        // Once we successfully got a stream, we have permission! 
        // Re-enumerate to get the labels (now that we are trusted).
        getDevices();
        
        return stream;
    } catch (e: any) {
        console.warn("Camera start failed:", e);
        if (isMounted.current) setActiveStream(null);
        return null;
    }
  }, [getDevices]);

  // Initial mount setup
  useEffect(() => {
    isMounted.current = true;
    
    // 1. First just get the list (likely without labels)
    getDevices();
    
    // 2. Start the camera with default settings. 
    // This prompts the user. Once accepted, startCamera calls getDevices AGAIN to fill in labels.
    startCamera();

    return () => {
        isMounted.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
    };
  }, []); // Run once on mount

  // Watch for config changes
  useEffect(() => {
     if (!isMounted.current) return;
     // Only restart if the ID is different from the currently active track setting (optimization)
     // For now, simpler to just restart if config.videoInputId changes and it's not empty
     if (config.videoInputId && streamRef.current) {
         const currentTrack = streamRef.current.getVideoTracks()[0];
         const currentSettings = currentTrack?.getSettings();
         if (currentSettings?.deviceId !== config.videoInputId) {
             startCamera(config.videoInputId);
         }
     }
  }, [config.videoInputId, startCamera]);

  return {
    devices,
    config,
    setConfig,
    activeStream,
    refreshDevices: getDevices
  };
};
