
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
    try {
      // Request permission first to get labels
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      
      const enumerate = await navigator.mediaDevices.enumerateDevices();
      const mapped = enumerate.map(d => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 5)}...)`,
        kind: d.kind
      }));
      setDevices(mapped);

      // Set defaults if empty
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
    if (activeStream) {
      activeStream.getTracks().forEach(t => t.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        audio: false // We handle audio separately in Gemini Service
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setActiveStream(stream);
      return stream;
    } catch (e) {
      console.error("Failed to start camera", e);
      return null;
    }
  }, [activeStream]);

  useEffect(() => {
    getDevices();
    return () => {
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Restart camera when selection changes
  useEffect(() => {
    if (config.videoInputId) {
        startCamera(config.videoInputId);
    }
  }, [config.videoInputId]);

  return {
    devices,
    config,
    setConfig,
    activeStream,
    refreshDevices: getDevices
  };
};
