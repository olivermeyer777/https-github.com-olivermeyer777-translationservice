
import { Language, UserRole, WebRTCSignal } from '../types';

// Declare Paho global from script tag
declare const Paho: any;

export type SignalingMessage = 
  | { type: 'PING'; role: UserRole; language: Language } 
  | { type: 'JOIN_ROOM'; role: UserRole; language: Language }
  | { type: 'AUDIO_CHUNK'; senderRole: UserRole; data: string }
  | { type: 'TRANSCRIPT'; senderRole: UserRole; text: string; isTranslation: boolean }
  | { type: 'WEBRTC_SIGNAL'; senderRole: UserRole; signal: WebRTCSignal };

class SignalingService {
  private client: any = null;
  private listeners: ((msg: SignalingMessage) => void)[] = [];
  private roomId: string | null = null;
  private isConnected: boolean = false;
  private messageQueue: any[] = [];
  private myId: string = Math.random().toString(36).substring(7);

  constructor() {
    // Initialized on join
  }

  public join(roomId: string) {
    if (this.roomId === roomId && this.isConnected) return;
    this.roomId = roomId;

    console.log(`Signaling: Joining Room ${roomId} via MQTT...`);

    // Create a client instance
    // Using HiveMQ Public Broker (Secure WSS port 8884 for HTTPS compatibility)
    this.client = new Paho.MQTT.Client("broker.hivemq.com", 8884, `postbranch-${this.myId}`);

    this.client.onConnectionLost = (responseObject: any) => {
      console.log("MQTT Connection Lost: " + responseObject.errorMessage);
      this.isConnected = false;
      // Simple reconnect logic could go here
    };

    this.client.onMessageArrived = (message: any) => {
      try {
        const payload = JSON.parse(message.payloadString);
        // Prevent echo (don't process own messages)
        if (payload._senderId === this.myId) return;

        // Filter debug logs
        if (payload.type !== 'AUDIO_CHUNK' && payload.type !== 'WEBRTC_SIGNAL' && payload.type !== 'PING') {
           console.debug('MQTT Received:', payload);
        }
        
        this.listeners.forEach(l => l(payload));
      } catch (e) {
        console.error("MQTT JSON Parse Error", e);
      }
    };

    // Connect
    this.client.connect({
      useSSL: true, // Required for Vercel/HTTPS
      onSuccess: () => {
        console.log("MQTT Connected Successfully");
        this.isConnected = true;
        // Subscribe to room topic
        this.client.subscribe(`postbranch/v1/${roomId}`);
        // Flush pending messages
        this.flushQueue();
      },
      onFailure: (e: any) => {
        console.error("MQTT Connection Failed", e);
      }
    });
  }

  public send(msg: SignalingMessage) {
    const payload = { ...msg, _senderId: this.myId };
    
    if (!this.isConnected) {
      this.messageQueue.push(payload);
      return;
    }
    
    try {
        const message = new Paho.MQTT.Message(JSON.stringify(payload));
        message.destinationName = `postbranch/v1/${this.roomId}`;
        this.client.send(message);
    } catch(e) {
        console.warn("MQTT Send Failed", e);
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      try {
        const message = new Paho.MQTT.Message(JSON.stringify(msg));
        message.destinationName = `postbranch/v1/${this.roomId}`;
        this.client.send(message);
      } catch(e) {}
    }
  }

  public subscribe(callback: (msg: SignalingMessage) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
}

export const signaling = new SignalingService();
