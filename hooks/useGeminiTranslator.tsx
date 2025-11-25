
import { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveService } from '../services/geminiService';
import { Language, UserRole } from '../types';
import { signaling, SignalingMessage } from '../services/signalingService';
import { base64ToUint8Array, decodeAudioData } from '../utils/audio';

interface UseGeminiTranslatorProps {
  userLanguage: Language;
  targetLanguage: Language;
  userRole: UserRole;
  customerId: string;
}

export interface TranscriptItem {
  id: number;
  text: string;
  sender: 'Client' | 'Agent';
  isTranslation: boolean;
}

export const useGeminiTranslator = ({ userLanguage, targetLanguage, userRole, customerId }: UseGeminiTranslatorProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const serviceRef = useRef<GeminiLiveService | null>(null);

  // Play audio buffer (used for incoming remote audio)
  const playAudio = useCallback(async (base64Data: string) => {
    try {
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            nextStartTimeRef.current = audioContextRef.current.currentTime;
        }

        const ctx = audioContextRef.current;
        const audioBytes = base64ToUint8Array(base64Data);
        const audioBuffer = await decodeAudioData(audioBytes, ctx);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        const now = ctx.currentTime;
        const startTime = Math.max(nextStartTimeRef.current, now);
        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
    } catch (e) {
        console.error("Error playing remote audio", e);
    }
  }, []);

  // Listen for signals from the other tab
  useEffect(() => {
    const cleanup = signaling.subscribe((msg: SignalingMessage) => {
        if (msg.customerId !== customerId) return;

        // If we receive audio from the OTHER role, play it.
        // E.g. If I am Customer, and I receive audio from AGENT, I play it.
        if (msg.type === 'AUDIO_CHUNK' && msg.senderRole !== userRole) {
            playAudio(msg.data);
        }

        // If we receive a transcript, add it.
        // We filter out our own broadcasts to avoid duplicates (we add them locally when generated)
        if (msg.type === 'TRANSCRIPT' && msg.senderRole !== userRole) {
             setTranscripts(prev => [
                ...prev,
                { 
                    id: Date.now() + Math.random(), 
                    text: msg.text, 
                    sender: msg.senderRole === 'CUSTOMER' ? 'Client' : 'Agent',
                    isTranslation: msg.isTranslation
                }
             ].slice(-50));
        }
    });
    return cleanup;
  }, [customerId, userRole, playAudio]);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setError(null);
    setTranscripts([]);

    const service = new GeminiLiveService();
    serviceRef.current = service;

    try {
      await service.connect({
        userLanguage: userLanguage.geminiName,
        targetLanguage: targetLanguage.geminiName,
        userRole: userRole,
        // When Gemini translates OUR speech, we get audio data.
        // We DO NOT play this locally. We broadcast it to the other person.
        onAudioData: (base64Audio) => {
            signaling.send({
                type: 'AUDIO_CHUNK',
                customerId,
                senderRole: userRole,
                data: base64Audio
            });
        },
        onTranscript: (text, isInput) => {
           // isInput = What I said (Source Lang)
           // !isInput = What Gemini said (Translated Lang)
           
           const newItem: TranscriptItem = {
               id: Date.now() + Math.random(),
               text,
               sender: userRole === 'CUSTOMER' ? 'Client' : 'Agent',
               isTranslation: !isInput
           };

           // 1. Add locally
           setTranscripts(prev => [...prev, newItem].slice(-50));

           // 2. Broadcast to other tab
           signaling.send({
               type: 'TRANSCRIPT',
               customerId,
               senderRole: userRole,
               text: text,
               isTranslation: !isInput
           });
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
  }, [userLanguage, targetLanguage, userRole, customerId, isConnecting, isConnected]);

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
