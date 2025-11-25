
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob } from '../utils/audio';

interface ConnectOptions {
  userLanguage: string;
  targetLanguage: string;
  userRole: 'CUSTOMER' | 'AGENT';
  audioInputDeviceId?: string; // Specific Mic
  onAudioData: (base64Audio: string) => void;
  onClose: () => void;
  onError: (error: Error) => void;
  onTranscript: (text: string, isInput: boolean) => void;
}

// AudioWorklet processor code as a string to avoid file loading issues in simple setups
const WorkletProcessorCode = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // Process in chunks
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      
      // Simple buffer accumulation
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bytesWritten++] = channelData[i];
        if (this.bytesWritten >= this.bufferSize) {
          // Send buffer to main thread
          this.port.postMessage(this.buffer.slice());
          this.bytesWritten = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('recorder-worklet', RecorderProcessor);
`;

// Helper to safely get API Key from various environments
const getApiKey = (): string | undefined => {
  // 1. Check process.env (Standard Node/AI Studio)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  // 2. Check Vite/Vercel (Client-side)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  return undefined;
};

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isMuted: boolean = false;
  private isConnected: boolean = false;
  
  constructor() {
    const key = getApiKey();
    this.ai = new GoogleGenAI({ apiKey: key || 'dummy_key' }); // Prevent constructor crash, validate in connect
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public async connect(options: ConnectOptions) {
    const key = getApiKey();
    if (!key) {
        options.onError(new Error("API Key is missing. Please set VITE_API_KEY in Vercel."));
        return;
    }

    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Strict Translator Role
    const systemInstruction = `
      You are a real-time voice translator.
      
      User Context:
      - Input Source: ${options.userRole} speaking ${options.userLanguage}.
      - Target Audience: Speaking ${options.targetLanguage}.

      Your Task:
      1. Listen to the ${options.userLanguage} audio.
      2. Translate it immediately into ${options.targetLanguage}.
      3. Output ONLY the spoken translation. 
      4. DO NOT engage in conversation.
      5. DO NOT translate silence or background noise.
    `;

    try {
      this.isConnected = true;
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          inputAudioTranscription: { },
          outputAudioTranscription: { },
        },
        callbacks: {
            onopen: async () => {
                console.log("Gemini Live Connected");
                await this.startMicrophone(options.audioInputDeviceId);
            },
            onmessage: async (message: LiveServerMessage) => {
                // Handle Audio
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    options.onAudioData(base64Audio);
                }

                // Handle Transcriptions
                if (message.serverContent?.inputTranscription?.text) {
                    options.onTranscript(message.serverContent.inputTranscription.text, true);
                }
                if (message.serverContent?.outputTranscription?.text) {
                    options.onTranscript(message.serverContent.outputTranscription.text, false);
                }
            },
            onclose: () => {
                console.log("Gemini Live Closed");
                this.disconnect();
                options.onClose();
            },
            onerror: (e) => {
                console.error("Gemini Live Error", e);
                this.disconnect();
                options.onError(new Error("Connection error"));
            }
        }
      });
      
      await this.sessionPromise;
    } catch (err) {
      this.disconnect();
      console.error("Connection failed", err);
      options.onError(err instanceof Error ? err : new Error("Failed to connect"));
    }
  }

  private async startMicrophone(deviceId?: string) {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // Load AudioWorklet from Blob (avoids external file requirement)
      const blob = new Blob([WorkletProcessorCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await this.inputAudioContext.audioWorklet.addModule(workletUrl);

      this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: deviceId ? { deviceId: { exact: deviceId } } : true
      });
      
      this.source = this.inputAudioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.inputAudioContext, 'recorder-worklet');

      this.workletNode.port.onmessage = (e) => {
        if (this.isMuted || !this.isConnected) return; 

        const inputData = e.data as Float32Array;
        const pcmBlob = createPcmBlob(inputData);
        
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                // Double check connection state inside the promise resolution
                if (this.isConnected) {
                    try {
                        session.sendRealtimeInput({ media: pcmBlob });
                    } catch (e: any) {
                        // Suppress "WebSocket is already in CLOSING or CLOSED state" spam
                        if (e.message?.includes("CLOSED") || e.message?.includes("CLOSING")) {
                            this.disconnect();
                        } else {
                            console.warn("Error sending audio frame:", e);
                        }
                    }
                }
            }).catch(() => {
                // Session promise rejected (likely closed)
            });
        }
      };

      this.source.connect(this.workletNode);
      this.workletNode.connect(this.inputAudioContext.destination);
    } catch (err) {
      console.error("Microphone access denied", err);
      throw err;
    }
  }

  private stopMicrophone() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.workletNode) {
        this.workletNode.disconnect();
        this.workletNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
  }

  public disconnect() {
    this.isConnected = false;
    this.stopMicrophone();
    
    if (this.outputAudioContext) {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    this.sessionPromise = null;
  }
}
