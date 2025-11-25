
import { Language, UserRole } from '../types';

export type SignalingMessage = 
  | { type: 'PING'; role: UserRole }
  | { type: 'JOIN_ROOM'; role: UserRole; language: Language }
  | { type: 'AUDIO_CHUNK'; senderRole: UserRole; data: string } // Base64 Audio
  | { type: 'TRANSCRIPT'; senderRole: UserRole; text: string; isTranslation: boolean };

class SignalingService {
  private channel: BroadcastChannel;
  private listeners: ((msg: SignalingMessage) => void)[] = [];

  constructor() {
    this.channel = new BroadcastChannel('postbranch_room_v2');
    this.channel.onmessage = (event) => {
      // Debug log (can be verbose, but useful for initial troubleshooting)
      if (event.data.type !== 'AUDIO_CHUNK') {
        // console.debug('Signal received:', event.data);
      }
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
