
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
  
  // Retry logic
  const retryTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

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
             } catch(e) { /* ignore */ }
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
        // PING received from someone else
        if (msg.type === 'PING') {
            if (msg.role !== userRole) {
                // If we receive a PING from the other role, we know they are there AND what language they speak
                if (!targetLanguage || targetLanguage.code !== msg.language.code) {
                    console.log("Found partner via PING:", msg.role, msg.language.name);
                    setTargetLanguage(msg.language);
                }
                
                // Always announce ourselves back so they find us too
                signaling.send({ type: 'JOIN_ROOM', role: userRole, language: userLanguage });
            }
        }

        if (msg.type === 'JOIN_ROOM') {
            if (msg.role !== userRole) {
                // Explicit join from partner
                console.log("Partner JOINED:", msg.role, msg.language.name);
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

    // 2. Start Heartbeat (PING)
    // We ping periodically to announce our presence.
    // We include OUR language so the other side can connect immediately upon hearing it.
    const startHeartbeat = () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        
        // Initial announce
        signaling.send({ type: 'PING', role: userRole, language: userLanguage });

        // Loop
        heartbeatRef.current = window.setInterval(() => {
             signaling.send({ type: 'PING', role: userRole, language: userLanguage });
        }, 1500); // Ping every 1.5s
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
    
    // Prevent connecting if we hit max retries recently
    if (retryCountRef.current > 5) {
        setError("Unable to connect to translation service. Please check your network or API Key.");
        return;
    }

    const start = async () => {
        setIsConnecting(true);
        setError(null);

        const service = new GeminiLiveService();
        serviceRef.current = service;

        try {
            // Distinct voices:
            // If I am Customer, my translator (heard by Agent) should sound like 'Kore' (Female)
            // If I am Agent, my translator (heard by Customer) should sound like 'Fenrir' (Male)
            const myTranslatorVoice = userRole === UserRole.CUSTOMER ? 'Kore' : 'Fenrir';

            await service.connect({
                userLanguage: userLanguage.geminiName,
                targetLanguage: targetLanguage.geminiName,
                userRole: userRole,
                voiceName: myTranslatorVoice,
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
                    serviceRef.current = null;
                },
                onError: (err) => {
                    console.warn("Service error, attempting retry logic...", err);
                    setError(err.message);
                    setIsConnected(false);
                    setIsConnecting(false);
                    serviceRef.current = null;
                    
                    // Retry with backoff
                    retryCountRef.current += 1;
                    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
                    retryTimeoutRef.current = window.setTimeout(() => {
                        retryTimeoutRef.current = null;
                        // Force re-evaluation
                        setIsConnected(false); 
                    }, delay);
                }
            });
            // If we got here without throwing, we assume connected initially
            setIsConnected(true);
            retryCountRef.current = 0; // Reset retries on success
        } catch(e) {
            setError("Failed to connect to Translator");
            setIsConnecting(false);
            serviceRef.current = null;
        }
    };

    start();

    return () => {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
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
    targetLanguage,
    error,
    transcripts,
    setMuted
  };
};
