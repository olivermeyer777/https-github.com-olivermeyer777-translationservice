
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

  // We use a request ID to ensure we only handle the result of the latest request
  const lastRequestId = useRef<number>(0);

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
    
    const requestId = Date.now();
    lastRequestId.current = requestId;

    try {
        const videoConstraint = videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: false 
        });
        
        // If a newer request started while we were waiting, or component unmounted
        if (lastRequestId.current !== requestId || !isMounted.current) {
            stream.getTracks().forEach(t => t.stop());
            return null;
        }

        // Stop old stream if it exists
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }

        streamRef.current = stream;
        setActiveStream(stream);
        
        // Refresh devices now that we have permissions (labels will be available)
        getDevices();
        return stream;
    } catch (e: any) {
        console.warn("Camera start failed:", e);
        if (lastRequestId.current === requestId && isMounted.current) {
            setActiveStream(null);
        }
        return null;
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
         // Only restart if the ID actually changed
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
