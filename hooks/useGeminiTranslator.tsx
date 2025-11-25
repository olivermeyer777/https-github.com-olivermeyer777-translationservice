import { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveService } from '../services/geminiService';
import { Language } from '../types';

interface UseGeminiTranslatorProps {
  userLanguage: Language;
  targetLanguage: Language;
}

export const useGeminiTranslator = ({ userLanguage, targetLanguage }: UseGeminiTranslatorProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Array<{ text: string; isUser: boolean; id: number }>>([]);
  
  // Audio Playback State
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const serviceRef = useRef<GeminiLiveService | null>(null);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setError(null);
    setTranscripts([]);

    const service = new GeminiLiveService();
    serviceRef.current = service;

    // Initialize playback context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    nextStartTimeRef.current = audioContextRef.current.currentTime;

    try {
      await service.connect({
        userLanguage: userLanguage.geminiName,
        targetLanguage: targetLanguage.geminiName,
        onAudioData: (audioBuffer) => {
          if (!audioContextRef.current) return;
          
          const ctx = audioContextRef.current;
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);

          // Ensure gapless playback
          const now = ctx.currentTime;
          // If next start time is in the past, reset it to now (to avoid rapid catch-up playing)
          const startTime = Math.max(nextStartTimeRef.current, now);
          
          source.start(startTime);
          nextStartTimeRef.current = startTime + audioBuffer.duration;
        },
        onTranscript: (text, isUser) => {
           setTranscripts(prev => [
               ...prev, 
               { text, isUser, id: Date.now() + Math.random() }
           ].slice(-20)); // Keep last 20
        },
        onClose: () => {
          setIsConnected(false);
          setIsConnecting(false);
        },
        onError: (err) => {
          setError(err.message);
          setIsConnected(false);
          setIsConnecting(false);
        }
      });
      setIsConnected(true);
    } catch (e) {
      setError("Failed to start session.");
    } finally {
      setIsConnecting(false);
    }
  }, [userLanguage, targetLanguage, isConnecting, isConnected]);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error,
    transcripts
  };
};
