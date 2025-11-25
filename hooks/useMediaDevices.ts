
import { useState, useEffect, useCallback } from 'react';
import { MediaDevice, DeviceConfig } from '../types';

export const useMediaDevices = () => {
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [config, setConfig] = useState<DeviceConfig>({
    videoInputId: '',
    audioInputId: '',
    audioOutputId: ''
  });

  const getDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn("MediaDevices API not supported");
        return;
    }

    try {
      // 1. Try to get permission to read labels
      // We wrap this in a try/catch so we don't crash if permission is denied
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        // Stop immediately, we just wanted the labels
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn("Permission denied for media devices. Labels will be empty or generic.", err);
        // Continue execution to at least get device IDs (even if unlabelled)
      }
      
      // 2. Enumerate
      const enumerate = await navigator.mediaDevices.enumerateDevices();
      const mapped = enumerate.map(d => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 5)}...)`,
        kind: d.kind
      }));
      setDevices(mapped);

      // 3. Set Defaults (prefer existing config, then first available)
      setConfig(prev => ({
        videoInputId: prev.videoInputId || mapped.find(d => d.kind === 'videoinput')?.deviceId || '',
        audioInputId: prev.audioInputId || mapped.find(d => d.kind === 'audioinput')?.deviceId || '',
        audioOutputId: prev.audioOutputId || mapped.find(d => d.kind === 'audiooutput')?.deviceId || '',
      }));
    } catch (e) {
      console.error("Error enumerating devices", e);
    }
  }, []);

  const startCamera = useCallback(async (videoDeviceId?: string) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return null;
    }
    
    try {
        const constraints: MediaStreamConstraints = {
            video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
            audio: false 
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        setActiveStream(prev => {
            // Stop previous stream tracks
            if (prev) prev.getTracks().forEach(t => t.stop());
            return stream;
        });
        return stream;
    } catch (e: any) {
        // Gracefully handle permission denied errors
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            console.warn("Camera start failed: Permission denied by user.");
        } else {
            console.error("Failed to start camera", e);
        }
        return null;
    }
  }, []);

  useEffect(() => {
    getDevices();
    
    // Cleanup on unmount
    return () => {
        setActiveStream(prev => {
            if (prev) prev.getTracks().forEach(t => t.stop());
            return null;
        });
    };
  }, [getDevices]);

  // Restart camera when config changes
  useEffect(() => {
      // If we have a specific ID, use it. If empty string, try default (true)
      if (config.videoInputId) {
          startCamera(config.videoInputId);
      } else {
          startCamera();
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
