
import { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveService } from '../services/geminiService';
import { Language, UserRole } from '../types';
import { signaling, SignalingMessage } from '../services/signalingService';
import { base64ToUint8Array, decodeAudioData } from '../utils/audio';

interface UseGeminiTranslatorProps {
  userLanguage: Language;
  userRole: UserRole;
  audioInputDeviceId?: string;
  audioOutputDeviceId?: string;
}

export interface TranscriptItem {
  id: number;
  text: string;
  sender: 'Client' | 'Agent';
  isTranslation: boolean;
}

export const useGeminiTranslator = ({ userLanguage, userRole, audioInputDeviceId, audioOutputDeviceId }: UseGeminiTranslatorProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<Language | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const heartbeatRef = useRef<number | null>(null);

  // Play audio buffer (used for incoming remote audio)
  const playAudio = useCallback(async (base64Data: string) => {
    try {
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            nextStartTimeRef.current = audioContextRef.current.currentTime;
        }

        const ctx = audioContextRef.current;
        
        // Handle Output Device selection if supported
        if (audioOutputDeviceId && (ctx as any).setSinkId) {
             try {
                await (ctx as any).setSinkId(audioOutputDeviceId);
             } catch(e) { console.warn("Cannot set sinkId on AudioContext", e); }
        }

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
  }, [audioOutputDeviceId]);

  // Signaling: Handle Room Events & Heartbeat
  useEffect(() => {
    // 1. Subscribe to messages
    const cleanup = signaling.subscribe((msg: SignalingMessage) => {
        if (msg.type === 'PING') {
            if (msg.role !== userRole) {
                // Someone else is looking for us. Announce ourselves!
                signaling.send({ type: 'JOIN_ROOM', role: userRole, language: userLanguage });
            }
        }

        if (msg.type === 'JOIN_ROOM') {
            if (msg.role !== userRole) {
                // Found our partner!
                setTargetLanguage(msg.language);
            }
        }

        if (msg.type === 'AUDIO_CHUNK' && msg.senderRole !== userRole) {
            playAudio(msg.data);
        }

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

    // 2. Start Heartbeat (PING) until we find a target
    const startHeartbeat = () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        
        // Announce immediately
        signaling.send({ type: 'JOIN_ROOM', role: userRole, language: userLanguage });
        signaling.send({ type: 'PING', role: userRole });

        // Loop
        heartbeatRef.current = window.setInterval(() => {
            if (!targetLanguage) {
                 signaling.send({ type: 'PING', role: userRole });
            } else {
                // If we have a target, we can stop pinging, but sending generic presence is fine
                // For now, let's stop strict pinging to reduce noise, 
                // but we might want to keep it for disconnect detection later.
                if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            }
        }, 2000);
    };

    startHeartbeat();

    return () => {
        cleanup();
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [userRole, userLanguage, playAudio, targetLanguage]);

  // Connect to Gemini ONLY when we have a target language
  useEffect(() => {
    if (!targetLanguage || isConnected || isConnecting) return;

    const start = async () => {
        setIsConnecting(true);
        setError(null);

        const service = new GeminiLiveService();
        serviceRef.current = service;

        try {
            await service.connect({
                userLanguage: userLanguage.geminiName,
                targetLanguage: targetLanguage.geminiName,
                userRole: userRole,
                audioInputDeviceId,
                // On Audio Data (Translation of MY voice): Broadcast to other
                onAudioData: (base64Audio) => {
                    signaling.send({
                        type: 'AUDIO_CHUNK',
                        senderRole: userRole,
                        data: base64Audio
                    });
                },
                onTranscript: (text, isInput) => {
                    const newItem: TranscriptItem = {
                        id: Date.now() + Math.random(),
                        text,
                        sender: userRole === 'CUSTOMER' ? 'Client' : 'Agent',
                        isTranslation: !isInput
                    };
                    setTranscripts(prev => [...prev, newItem].slice(-50));
                    
                    signaling.send({
                        type: 'TRANSCRIPT',
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
        } catch(e) {
            setError("Failed to connect to Translator");
        } finally {
            setIsConnecting(false);
        }
    };

    start();
  }, [targetLanguage, userLanguage, userRole, isConnected, isConnecting, audioInputDeviceId]);

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
    setTargetLanguage(null);
  }, []);

  const connect = useCallback(() => {
      // Handled automatically via effects
  }, []);

  const setMuted = useCallback((muted: boolean) => {
      if (serviceRef.current) {
          serviceRef.current.setMuted(muted);
      }
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    targetLanguage,
    error,
    transcripts,
    setMuted
  };
};
