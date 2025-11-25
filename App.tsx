
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Language, UserRole } from './types';
import { DEFAULT_AGENT_LANGUAGE, DEFAULT_CUSTOMER_LANGUAGE, SUPPORTED_LANGUAGES } from './constants';
import { Button } from './components/Button';
import { LanguageSelector } from './components/LanguageSelector';
import { useGeminiTranslator } from './hooks/useGeminiTranslator';
import { Visualizer } from './components/Visualizer';
import { useMediaDevices } from './hooks/useMediaDevices';
import { SettingsModal } from './components/SettingsModal';

// --- ICONS ---
const PhoneXMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-10.5-2.393c5.142-6.685 15.245-1.977 15.245 6.643 0 2.657-1.42 5.06-3.616 6.368-2.673 1.593-5.22-.44-6.49-1.996-1.27-1.555-3.818-3.564-6.49-1.996-2.195 1.309-3.616 3.712-3.616 6.368 0 8.62 10.103 13.328 15.245 6.642" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const ChatBubbleLeftRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
);

const MicIcon = ({ muted }: { muted: boolean }) => (
    muted ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-2.393c5.142-6.685 15.245-1.977 15.245 6.643 0 2.657-1.42 5.06-3.616 6.368-2.673 1.593-5.22-.44-6.49-1.996-1.27-1.555-3.818-3.564-6.49-1.996-2.195 1.309-3.616 3.712-3.616 6.368 0 8.62 10.103 13.328 15.245 6.642" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
    )
);

const VideoIcon = ({ muted }: { muted: boolean }) => (
    muted ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    )
);

const EllipsisVerticalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const ExclamationTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

// --- MAIN ROUTER ---

export default function App() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    setRole(roleParam);
  }, []);

  if (role === 'customer') {
    return <UnifiedApp role={UserRole.CUSTOMER} />;
  }

  if (role === 'agent') {
    return <UnifiedApp role={UserRole.AGENT} />;
  }

  return <Launcher />;
}

// --- LAUNCHER (LANDING) ---

function Launcher() {
  const openApp = (role: 'customer' | 'agent') => {
    const url = new URL(window.location.href);
    url.searchParams.set('role', role);
    window.open(url.toString(), '_blank', 'width=1280,height=850');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 flex items-center justify-center p-6 font-sans">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-5 bg-white rounded-3xl shadow-xl shadow-yellow-400/10 mb-8 transform hover:scale-105 transition-transform duration-500">
             <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600 tracking-tight">
               PostBranch
             </span>
             <span className="text-5xl font-light text-gray-400 ml-2">Connect</span>
          </div>
          <h1 className="text-2xl font-medium text-gray-500">Video Translation Room</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Customer Card */}
          <div className="bg-white rounded-[2rem] shadow-xl hover:shadow-2xl hover:shadow-yellow-400/20 transition-all duration-300 overflow-hidden group border border-gray-100">
            <div className="p-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:rotate-6 transition-transform">
                📮
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Kiosk</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Join the room as a Customer. Select your language and connect instantly.
              </p>
              <div className="mt-auto">
                <Button onClick={() => openApp('customer')} fullWidth size="lg" icon={<ExternalLinkIcon />}>
                  Launch Kiosk
                </Button>
              </div>
            </div>
          </div>

          {/* Agent Card */}
          <div className="bg-white rounded-[2rem] shadow-xl hover:shadow-2xl hover:shadow-blue-600/20 transition-all duration-300 overflow-hidden group border border-gray-100">
            <div className="p-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:-rotate-6 transition-transform">
                🎧
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Agent Portal</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Join the room as an Agent. Select your language and connect instantly.
              </p>
              <div className="mt-auto">
                <Button onClick={() => openApp('agent')} variant="secondary" fullWidth size="lg" icon={<ExternalLinkIcon />}>
                  Launch Portal
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-400">
            Note: For this demo to work, please open both roles in separate tabs/windows within the <strong>same browser</strong>.
        </div>
      </div>
    </div>
  );
}

// --- UNIFIED APP ---

function UnifiedApp({ role }: { role: UserRole }) {
  const [appState, setAppState] = useState<AppState>(AppState.LANGUAGE_SELECTION);
  const [myLanguage, setMyLanguage] = useState<Language>(
    role === UserRole.CUSTOMER ? DEFAULT_CUSTOMER_LANGUAGE : DEFAULT_AGENT_LANGUAGE
  );
  
  // Media Devices
  const { devices, config, setConfig, activeStream } = useMediaDevices();

  const handleLanguageSelect = (lang: Language) => {
    setMyLanguage(lang);
    setAppState(AppState.ROOM);
  };

  const handleLeaveRoom = () => {
    setAppState(AppState.LANGUAGE_SELECTION);
  };

  const isCustomer = role === UserRole.CUSTOMER;

  if (appState === AppState.LANGUAGE_SELECTION) {
      return (
        <div className="min-h-screen bg-slate-50 font-sans text-gray-900 overflow-hidden flex flex-col">
            <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm">
                <div className={`text-white w-10 h-10 rounded-xl shadow-lg flex items-center justify-center font-bold text-lg ${isCustomer ? 'bg-yellow-400 shadow-yellow-400/30' : 'bg-blue-600 shadow-blue-600/30'}`}>
                    {isCustomer ? 'C' : 'A'}
                </div>
                <div>
                     <span className="font-bold text-xl tracking-tight text-gray-800 block leading-none">PostBranch</span>
                     <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{isCustomer ? 'Customer Kiosk' : 'Agent Portal'}</span>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-3xl w-full animate-fade-in-up">
                  <div className="text-center mb-10">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Select Your Language</h2>
                    <p className="text-xl text-gray-500">Choose the language you will be speaking.</p>
                  </div>
                  <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
                    <LanguageSelector onSelect={handleLanguageSelect} selectedLang={myLanguage} />
                  </div>
                  <div className="mt-8 text-center text-gray-400 text-sm">
                    Make sure the other participant is also ready in another tab.
                  </div>
                </div>
            </div>
        </div>
      );
  }

  return (
      <SessionView 
        userRole={role}
        myLanguage={myLanguage}
        setMyLanguage={setMyLanguage}
        onLeave={handleLeaveRoom}
        activeStream={activeStream}
        deviceConfig={config}
        setDeviceConfig={setConfig}
        devices={devices}
      />
  );
}

// --- SESSION VIEW (GOOGLE MEET STYLE) ---

function SessionView({ 
    userRole,
    myLanguage, 
    setMyLanguage,
    onLeave,
    activeStream,
    deviceConfig,
    setDeviceConfig,
    devices
}: { 
    userRole: UserRole,
    myLanguage: Language, 
    setMyLanguage: (l: Language) => void,
    onLeave: () => void,
    activeStream: MediaStream | null,
    deviceConfig: any,
    setDeviceConfig: any,
    devices: any[]
}) {
    const { 
        disconnect, 
        isConnected, 
        isConnecting,
        error,
        targetLanguage,
        transcripts,
        setMuted 
    } = useGeminiTranslator({ 
        userLanguage: myLanguage, 
        userRole, 
        audioInputDeviceId: deviceConfig.audioInputId,
        audioOutputDeviceId: deviceConfig.audioOutputId
    });
    
    const [isSubtitlesOpen, setIsSubtitlesOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    
    // Toggles for UI
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);

    // Sync Mute State with Gemini Service
    useEffect(() => {
        setMuted(!micOn);
    }, [micOn, setMuted]);

    // Attach local stream to video element
    useEffect(() => {
        if (localVideoRef.current && activeStream) {
            localVideoRef.current.srcObject = activeStream;
            // Visual mute for local video only (mute track locally if cam off)
            const videoTracks = activeStream.getVideoTracks();
            videoTracks.forEach(t => t.enabled = camOn);
        }
    }, [activeStream, camOn]);

    // Auto scroll transcripts
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcripts, isSubtitlesOpen]);

    const isAgent = userRole === UserRole.AGENT;
    
    // Helper to get API Key for warning
    const getApiKey = () => {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_API_KEY;
        }
        return process.env.API_KEY;
    }

    // Using generic stock videos for a "live" feel
    const remoteVideoSrc = isAgent 
        ? 'https://cdn.coverr.co/videos/coverr-woman-working-on-her-laptop-at-home-4752/1080p.mp4' // Generic home user for Agent to see
        : 'https://cdn.coverr.co/videos/coverr-customer-support-agent-talking-to-a-client-5619/1080p.mp4'; // Professional agent for Customer to see

    return (
        <div className="relative w-full h-screen bg-[#202124] overflow-hidden flex flex-col text-white font-sans">
            
            {/* Warning Banner */}
            {(!getApiKey() || error) && (
                <div className="absolute top-0 left-0 w-full z-[100] bg-red-600 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
                    <ExclamationTriangleIcon />
                    {error || "API Key missing. Set VITE_API_KEY in Vercel."}
                </div>
            )}

            {/* --- MAIN REMOTE VIDEO --- */}
            <div className="flex-1 p-4 flex items-center justify-center relative min-h-0">
                <div className="relative w-full h-full max-w-[1600px] rounded-3xl overflow-hidden bg-[#3c4043] shadow-2xl group">
                    <video 
                        src={remoteVideoSrc}
                        autoPlay
                        loop
                        muted
                        className={`w-full h-full object-cover transition-all duration-1000 ${targetLanguage ? 'opacity-100 scale-100' : 'opacity-40 scale-105 blur-sm'}`}
                    />
                    
                    {/* Remote Info Badge */}
                    {targetLanguage && (
                        <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl text-white border border-white/10">
                            <span className="text-xl">{targetLanguage.flag}</span>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold leading-none">{isAgent ? 'Customer' : 'Agent'}</span>
                                <span className="text-[10px] text-gray-300 uppercase tracking-wider">Speaking {targetLanguage.name}</span>
                            </div>
                        </div>
                    )}

                    {!targetLanguage && (
                         <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-center z-10 p-4">
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-blue-400"></div>
                            </div>
                            <h2 className="text-2xl font-medium">Waiting for partner...</h2>
                            <p className="text-gray-400 text-sm max-w-md">
                                Keep this tab open. The connection will start automatically when the partner joins.
                            </p>
                         </div>
                    )}
                    
                    {/* Visualizer showing that we are listening even if waiting */}
                    {isConnecting && targetLanguage && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-4 py-2 rounded-full flex items-center gap-3">
                             <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                             <span className="text-xs font-medium">Connected to Translator</span>
                        </div>
                    )}
                </div>

                {/* --- LOCAL VIDEO (FLOATING TOP-LEFT) --- */}
                <div className="absolute top-8 left-8 w-[280px] aspect-video rounded-xl overflow-hidden bg-[#202124] border border-[#5f6368] shadow-2xl z-20 group transition-all hover:scale-105 hover:border-white/20">
                    {activeStream && camOn ? (
                        <video 
                            ref={localVideoRef} 
                            autoPlay 
                            muted 
                            playsInline
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center flex-col gap-2 bg-[#3c4043]">
                            <div className="p-3 bg-red-500 rounded-full text-white">
                                <VideoIcon muted={true} />
                            </div>
                            <span className="text-xs font-medium text-gray-400">Camera Off</span>
                        </div>
                    )}
                    
                    {/* Me Badge */}
                    <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-medium">
                        You ({myLanguage.flag})
                    </div>
                    
                    {/* Visualizer (Top Right of Local Video) */}
                    <div className="absolute top-3 right-3">
                        <Visualizer isActive={isConnected || isConnecting} />
                    </div>
                </div>
                
                {/* --- SIDE PANEL (TRANSCRIPT) --- */}
                {isSubtitlesOpen && (
                    <div className="absolute top-4 bottom-4 right-4 w-[360px] bg-white rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-fade-in-left">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-sm">Transcript</h3>
                            <button onClick={() => setIsSubtitlesOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white text-gray-800">
                            {transcripts.length === 0 && (
                                <div className="flex h-full items-center justify-center text-gray-400 text-sm text-center px-6">
                                    Conversation will appear here once connected...
                                </div>
                            )}
                            {transcripts.map((t) => (
                                <div key={t.id} className={`flex flex-col ${t.sender === 'Client' ? 'items-start' : 'items-end'}`}>
                                    <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase">{t.sender}</span>
                                    <div className={`
                                        px-3 py-2 rounded-lg text-sm max-w-[85%]
                                        ${t.sender === 'Client' ? 'bg-yellow-100 text-gray-800' : 'bg-blue-100 text-gray-800'}
                                    `}>
                                        {t.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* --- BOTTOM CONTROL BAR --- */}
            <div className="h-20 flex items-center justify-center gap-4 px-6 relative mb-2 shrink-0 z-50">
                
                {/* 1. Mic Toggle */}
                <button 
                    onClick={() => setMicOn(!micOn)}
                    className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border border-transparent
                        ${micOn 
                            ? 'bg-[#3c4043] hover:bg-[#4a4e53] text-white' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }
                    `}
                    title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                >
                    <MicIcon muted={!micOn} />
                </button>

                {/* 2. Camera Toggle */}
                <button 
                    onClick={() => setCamOn(!camOn)}
                    className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border border-transparent
                        ${camOn 
                            ? 'bg-[#3c4043] hover:bg-[#4a4e53] text-white' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }
                    `}
                    title={camOn ? "Turn Camera Off" : "Turn Camera On"}
                >
                    <VideoIcon muted={!camOn} />
                </button>

                {/* 3. Language Selector (Dropdown) */}
                <div className="relative">
                    <button 
                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                        className="h-12 px-6 rounded-full bg-[#3c4043] hover:bg-[#4a4e53] text-white flex items-center gap-3 transition-colors border border-transparent hover:border-gray-500"
                    >
                        <span className="text-xl">{myLanguage.flag}</span>
                        <span className="text-sm font-medium">{myLanguage.name}</span>
                        <ChevronDownIcon />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {isLangMenuOpen && (
                         <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 bg-[#303134] rounded-lg shadow-xl border border-[#5f6368] overflow-hidden max-h-[300px] overflow-y-auto z-50">
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <button 
                                    key={lang.code}
                                    onClick={() => { setMyLanguage(lang); setIsLangMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-[#3c4043] flex items-center gap-3 text-sm text-gray-200 border-b border-[#3c4043] last:border-0"
                                >
                                    <span className="text-lg">{lang.flag}</span>
                                    {lang.name}
                                    {myLanguage.code === lang.code && (
                                        <span className="ml-auto text-yellow-400">✓</span>
                                    )}
                                </button>
                            ))}
                         </div>
                    )}
                </div>

                {/* 4. Chat/Subtitle Toggle */}
                <button 
                    onClick={() => setIsSubtitlesOpen(!isSubtitlesOpen)}
                    className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border border-transparent
                        ${isSubtitlesOpen
                            ? 'bg-[#8ab4f8] text-gray-900' 
                            : 'bg-[#3c4043] hover:bg-[#4a4e53] text-white'
                        }
                    `}
                    title="Toggle Subtitles"
                >
                    <ChatBubbleLeftRightIcon />
                </button>

                {/* 5. More / Settings */}
                <button 
                     onClick={() => setIsSettingsOpen(true)}
                     className="w-12 h-12 rounded-full flex items-center justify-center bg-[#3c4043] hover:bg-[#4a4e53] text-white transition-all border border-transparent"
                     title="Settings"
                >
                    <EllipsisVerticalIcon />
                </button>

                {/* 6. End Call */}
                <button 
                    onClick={() => { disconnect(); onLeave(); }}
                    className="h-12 px-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-all ml-4"
                >
                    <PhoneXMarkIcon />
                    <span className="text-sm font-medium">End Call</span>
                </button>
            </div>

            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                devices={devices}
                config={deviceConfig}
                setConfig={setDeviceConfig}
            />
        </div>
    );
}
