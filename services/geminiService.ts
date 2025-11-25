
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob } from '../utils/audio';

interface ConnectOptions {
  userLanguage: string;
  targetLanguage: string;
  userRole: 'CUSTOMER' | 'AGENT';
  voiceName: string; // 'Kore' | 'Fenrir' | 'Puck' etc.
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
export const getApiKey = (): string | undefined => {
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
    
    // Updated System Instruction: STRICT TRANSLATOR MODE
    const systemInstruction = `
    You are a professional voice-to-voice interpreter. 
    Your SOLE job is to translate audio from ${options.userLanguage} into ${options.targetLanguage}.

     STRICT RULES:
    1.  **TRANSLATE ONLY:** Output ONLY the translated audio in ${options.targetLanguage}.
    2.  **NO CONVERSATION:** Do NOT answer questions. If the user says "How are you?", you translate "How are you?" into the target language. Do not answer "I am fine".
    3.  **NO FILLER:** Do NOT say "Okay", "Here is the translation", "Sure", "Let me translate", or repeat the original text.
    4.  **NO ENGLISH:** Do NOT speak English unless English is the specific target language.
    5.  **SILENCE:** If the input is silence, noise, or unintelligible, output nothing (silence).
    6.  **IDENTITY:** You are a transparent conduit. The user should not know an AI is involved.
    `;

    try {
      this.isConnected = true;
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO], // Enforce Audio-only response
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: options.voiceName } },
          },
          // Empty objects required to enable transcription events
          inputAudioTranscription: { },
          outputAudioTranscription: { },
        },
        callbacks: {
            onopen: async () => {
                console.log("Gemini Live Connected");
                await this.startMicrophone(options.audioInputDeviceId);
            },
            onmessage: async (message: LiveServerMessage) => {
                // Handle Audio (Translation Output)
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    options.onAudioData(base64Audio);
                }

                // Handle Transcriptions
                // Input = User speaking (Language A)
                if (message.serverContent?.inputTranscription?.text) {
                    options.onTranscript(message.serverContent.inputTranscription.text, true);
                }
                // Output = Model speaking (Language B - Translation)
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
      // Ensure strict mode doesn't block context
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (this.inputAudioContext.state === 'suspended') {
          await this.inputAudioContext.resume();
      }
      
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
                if (this.isConnected) {
                    try {
                        session.sendRealtimeInput({ media: pcmBlob });
                    } catch (e: any) {
                        if (e.message?.includes("CLOSED") || e.message?.includes("CLOSING")) {
                            this.disconnect();
                        }
                    }
                }
            }).catch(() => {});
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
