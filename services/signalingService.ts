
import { Language } from '../types';

export type SignalingMessage = 
  | { type: 'CALL_STARTED'; customerId: string; language: Language }
  | { type: 'CALL_ACCEPTED'; customerId: string; agentLanguage: Language }
  | { type: 'CALL_ENDED'; customerId: string }
  | { type: 'AUDIO_CHUNK'; customerId: string; senderRole: 'CUSTOMER' | 'AGENT'; data: string } // Base64 Audio
  | { type: 'TRANSCRIPT'; customerId: string; senderRole: 'CUSTOMER' | 'AGENT'; text: string; isTranslation: boolean };

class SignalingService {
  private channel: BroadcastChannel;
  private listeners: ((msg: SignalingMessage) => void)[] = [];

  constructor() {
    this.channel = new BroadcastChannel('postbranch_connect_channel');
    this.channel.onmessage = (event) => {
      this.listeners.forEach(l => l(event.data));
    };
  }

  send(msg: SignalingMessage) {
    this.channel.postMessage(msg);
  }

  subscribe(callback: (msg: SignalingMessage) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  close() {
    this.channel.close();
  }
}

export const signaling = new SignalingService();
