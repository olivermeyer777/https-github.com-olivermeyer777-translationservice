
export enum AppState {
  LANDING = 'LANDING',
  LANGUAGE_SELECTION = 'LANGUAGE_SELECTION',
  ROOM = 'ROOM',
}

export interface Language {
  code: string;
  name: string;
  flag: string; // Emoji
  geminiName: string; // How we refer to it in the prompt
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
}

export interface DeviceConfig {
  videoInputId: string;
  audioInputId: string;
  audioOutputId: string;
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export type WebRTCSignal = 
  | { type: 'OFFER'; sdp: RTCSessionDescriptionInit }
  | { type: 'ANSWER'; sdp: RTCSessionDescriptionInit }
  | { type: 'CANDIDATE'; candidate: RTCIceCandidateInit };
