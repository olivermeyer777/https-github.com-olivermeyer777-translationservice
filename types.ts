
export enum AppState {
  LANDING = 'LANDING',
  CUSTOMER_LANGUAGE = 'CUSTOMER_LANGUAGE',
  CUSTOMER_WAITING = 'CUSTOMER_WAITING',
  AGENT_SETUP = 'AGENT_SETUP',
  AGENT_DASHBOARD = 'AGENT_DASHBOARD',
  SESSION = 'SESSION',
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

export interface IncomingCall {
  id: string;
  language: Language;
  timestamp: number;
}
