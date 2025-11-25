
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
  const pendingStart = useRef<string | null>(null);

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
    
    // Prevent overlapping start calls
    if (pendingStart.current === videoDeviceId) return null;
    pendingStart.current = videoDeviceId || 'default';

    // Stop previous
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }

    try {
        const videoConstraint = videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: false 
        });
        
        if (!isMounted.current) {
            stream.getTracks().forEach(t => t.stop());
            return null;
        }

        streamRef.current = stream;
        setActiveStream(stream);
        getDevices();
        return stream;
    } catch (e: any) {
        console.warn("Camera start failed:", e);
        if (isMounted.current) setActiveStream(null);
        return null;
    } finally {
        pendingStart.current = null;
    }
  }, [getDevices]);

  useEffect(() => {
    isMounted.current = true;
    getDevices();
    startCamera();

    return () => {
        isMounted.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
    };
  }, []); 

  // Watch for config changes
  useEffect(() => {
     if (!isMounted.current) return;
     if (config.videoInputId && streamRef.current) {
         const currentTrack = streamRef.current.getVideoTracks()[0];
         if (currentTrack?.getSettings().deviceId !== config.videoInputId) {
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
