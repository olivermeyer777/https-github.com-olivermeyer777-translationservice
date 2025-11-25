
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

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isMuted: boolean = false;
  private isConnected: boolean = false;
  
  constructor() {
    const key = process.env.API_KEY || '';
    if (!key) {
      console.error("API_KEY is missing in process.env");
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public async connect(options: ConnectOptions) {
    if (!process.env.API_KEY) {
        options.onError(new Error("API Key is missing"));
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
                this.isConnected = false;
                this.stopMicrophone(); // Stop mic immediately to prevent errors
                options.onClose();
            },
            onerror: (e) => {
                console.error("Gemini Live Error", e);
                this.isConnected = false;
                this.stopMicrophone();
                options.onError(new Error("Connection error"));
            }
        }
      });
      
      await this.sessionPromise;
    } catch (err) {
      this.isConnected = false;
      console.error("Connection failed", err);
      options.onError(err instanceof Error ? err : new Error("Failed to connect"));
    }
  }

  private async startMicrophone(deviceId?: string) {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: deviceId ? { deviceId: { exact: deviceId } } : true
      });
      
      this.source = this.inputAudioContext.createMediaStreamSource(this.stream);
      this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || !this.isConnected) return; 

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                // Double check connection state inside the promise resolution
                if (this.isConnected) {
                    try {
                        session.sendRealtimeInput({ media: pcmBlob });
                    } catch (e) {
                        console.warn("Error sending audio frame, stopping...", e);
                        this.disconnect();
                    }
                }
            }).catch(e => {
                // Session likely closed
            });
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.inputAudioContext.destination);
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
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
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
