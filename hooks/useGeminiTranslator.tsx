
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
  const [isTranslating, setIsTranslating] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const translationTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  const playAudio = useCallback(async (base64Data: string) => {
    try {
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            nextStartTimeRef.current = audioContextRef.current.currentTime;
        }
        const ctx = audioContextRef.current;
        if (audioOutputDeviceId && (ctx as any).setSinkId) {
             try { await (ctx as any).setSinkId(audioOutputDeviceId); } catch(e) {}
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

  useEffect(() => {
    const cleanup = signaling.subscribe((msg: SignalingMessage) => {
        if (msg.type === 'PING' && msg.role !== userRole) {
            if (!targetLanguage || targetLanguage.code !== msg.language.code) {
                setTargetLanguage(msg.language);
            }
            signaling.send({ type: 'JOIN_ROOM', role: userRole, language: userLanguage });
        }
        if (msg.type === 'JOIN_ROOM' && msg.role !== userRole) {
            setTargetLanguage(msg.language);
        }
        if (msg.type === 'AUDIO_CHUNK' && msg.senderRole !== userRole) {
            playAudio(msg.data);
        }
        if (msg.type === 'TRANSCRIPT' && msg.senderRole !== userRole) {
             setTranscripts(prev => [...prev, { 
                id: Date.now() + Math.random(), 
                text: msg.text, 
                sender: msg.senderRole === 'CUSTOMER' ? 'Client' : 'Agent',
                isTranslation: msg.isTranslation
             }].slice(-50));
        }
    });

    const startHeartbeat = () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        signaling.send({ type: 'PING', role: userRole, language: userLanguage });
        heartbeatRef.current = window.setInterval(() => {
             signaling.send({ type: 'PING', role: userRole, language: userLanguage });
        }, 1500); 
    };
    startHeartbeat();

    return () => {
        cleanup();
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [userRole, userLanguage, playAudio, targetLanguage]);

  // Connection Management
  useEffect(() => {
    if (!targetLanguage || isConnected || isConnecting) return;
    if (retryCountRef.current > 5) {
        setError("Unable to connect to translation service.");
        return;
    }

    const start = async () => {
        setIsConnecting(true);
        setError(null);
        const service = new GeminiLiveService();
        serviceRef.current = service;

        try {
            const myTranslatorVoice = userRole === UserRole.CUSTOMER ? 'Kore' : 'Fenrir';
            await service.connect({
                userLanguage: userLanguage.geminiName,
                targetLanguage: targetLanguage.geminiName,
                userRole: userRole,
                voiceName: myTranslatorVoice,
                audioInputDeviceId,
                onAudioData: (base64Audio) => {
                    // Translation received (Output). Stop bubble.
                    setIsTranslating(false);
                    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);

                    signaling.send({
                        type: 'AUDIO_CHUNK',
                        senderRole: userRole,
                        data: base64Audio
                    });
                },
                onTranscript: (text, isInput) => {
                    // If isInput = true, it means user just spoke. Start bubble.
                    if (isInput) {
                        setIsTranslating(true);
                        // Failsafe: if no audio comes back in 5s, hide bubble
                        if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
                        translationTimeoutRef.current = window.setTimeout(() => setIsTranslating(false), 5000);
                    }

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
                    serviceRef.current = null;
                },
                onError: (err) => {
                    console.warn("Service error, attempting retry...", err);
                    setError(err.message);
                    setIsConnected(false);
                    setIsConnecting(false);
                    serviceRef.current = null;
                    retryCountRef.current += 1;
                    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
                    retryTimeoutRef.current = window.setTimeout(() => {
                        retryTimeoutRef.current = null;
                        setIsConnected(false); 
                    }, delay);
                }
            });
            setIsConnected(true);
            retryCountRef.current = 0; 
        } catch(e) {
            setError("Failed to connect to Translator");
            setIsConnecting(false);
            serviceRef.current = null;
        }
    };
    start();
    return () => {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
    };
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
      retryCountRef.current = 0;
      setIsConnected(false);
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
    isTranslating,
    targetLanguage,
    error,
    transcripts,
    setMuted
  };
};
