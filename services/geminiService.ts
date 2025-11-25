import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio';

interface ConnectOptions {
  userLanguage: string;
  targetLanguage: string;
  onAudioData: (buffer: AudioBuffer) => void;
  onClose: () => void;
  onError: (error: Error) => void;
  onTranscript: (text: string, isUser: boolean) => void;
}

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  public async connect(options: ConnectOptions) {
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // System instruction: Act as a strict translator.
    // In a real dual-stream app, we would have more complex logic.
    // Here, we simulate the translator: Input User Lang -> Output Target Lang.
    const systemInstruction = `
      You are a professional, real-time simultaneous interpreter working for a video consultation service.
      
      Your task:
      1. Listen to the audio input which will be in ${options.userLanguage}.
      2. Immediately translate the input into ${options.targetLanguage}.
      3. Speak the translation out loud clearly and professionally.
      4. DO NOT engage in conversation. DO NOT answer questions. DO NOT say "Sure" or "Here is the translation".
      5. ONLY output the translated audio.
      6. Maintain a neutral, professional tone.
    `;

    try {
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          // inputAudioTranscription and outputAudioTranscription must be empty objects to enable feature using default model
          inputAudioTranscription: { },
          outputAudioTranscription: { },
        },
        callbacks: {
            onopen: async () => {
                console.log("Gemini Live Connected");
                await this.startMicrophone();
            },
            onmessage: async (message: LiveServerMessage) => {
                // Handle Audio
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio && this.outputAudioContext) {
                    const audioBytes = base64ToUint8Array(base64Audio);
                    const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext);
                    options.onAudioData(audioBuffer);
                }

                // Handle Transcriptions for UI
                if (message.serverContent?.inputTranscription?.text) {
                    options.onTranscript(message.serverContent.inputTranscription.text, true);
                }
                if (message.serverContent?.outputTranscription?.text) {
                    options.onTranscript(message.serverContent.outputTranscription.text, false);
                }
            },
            onclose: () => {
                console.log("Gemini Live Closed");
                options.onClose();
            },
            onerror: (e) => {
                console.error("Gemini Live Error", e);
                options.onError(new Error("Connection error"));
            }
        }
      });
      
      await this.sessionPromise;
    } catch (err) {
      console.error("Connection failed", err);
      options.onError(err instanceof Error ? err : new Error("Failed to connect"));
    }
  }

  private async startMicrophone() {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.inputAudioContext.createMediaStreamSource(this.stream);
      this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
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

  public disconnect() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
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
    }
    if (this.outputAudioContext) {
        this.outputAudioContext.close();
    }
    // We can't strictly "close" the session promise object, but stopping audio handling effectively kills the loop.
    // In a full implementation we would call a close method if exposed, but currently we rely on cutting the stream.
  }
}
