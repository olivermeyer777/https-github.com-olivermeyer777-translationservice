
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Language, UserRole } from './types';
import { DEFAULT_AGENT_LANGUAGE, DEFAULT_CUSTOMER_LANGUAGE } from './constants';
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
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
);

const Cog6ToothIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
      </div>
    </div>
  );
}

// --- UNIFIED APP (Customer & Agent share same structure now) ---

function UnifiedApp({ role }: { role: UserRole }) {
  const [appState, setAppState] = useState<AppState>(AppState.LANGUAGE_SELECTION);
  const [myLanguage, setMyLanguage] = useState<Language>(
    role === UserRole.CUSTOMER ? DEFAULT_CUSTOMER_LANGUAGE : DEFAULT_AGENT_LANGUAGE
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
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
  const themeColor = isCustomer ? 'yellow' : 'blue';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 overflow-hidden flex flex-col">
      {/* HEADER */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
            <div className={`text-white w-10 h-10 rounded-xl shadow-lg flex items-center justify-center font-bold text-lg ${isCustomer ? 'bg-yellow-400 shadow-yellow-400/30' : 'bg-blue-600 shadow-blue-600/30'}`}>
                {isCustomer ? 'C' : 'A'}
            </div>
            <div>
                 <span className="font-bold text-xl tracking-tight text-gray-800 block leading-none">PostBranch</span>
                 <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{isCustomer ? 'Customer Kiosk' : 'Agent Portal'}</span>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
                <Cog6ToothIcon />
            </button>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        devices={devices}
        config={config}
        setConfig={setConfig}
      />

      {/* CONTENT */}
      <div className="flex-1 flex flex-col relative">
        {appState === AppState.LANGUAGE_SELECTION && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-3xl w-full animate-fade-in-up">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Select Your Language</h2>
                <p className="text-xl text-gray-500">Choose the language you will be speaking.</p>
              </div>
              <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
                <LanguageSelector onSelect={handleLanguageSelect} selectedLang={myLanguage} />
              </div>
            </div>
          </div>
        )}

        {appState === AppState.ROOM && (
          <SessionView 
            userRole={role}
            myLanguage={myLanguage}
            onLeave={handleLeaveRoom}
            activeStream={activeStream}
            deviceConfig={config}
          />
        )}
      </div>
    </div>
  );
}

// --- SESSION VIEW ---

function SessionView({ 
    userRole,
    myLanguage, 
    onLeave,
    activeStream,
    deviceConfig
}: { 
    userRole: UserRole,
    myLanguage: Language, 
    onLeave: () => void,
    activeStream: MediaStream | null,
    deviceConfig: any
}) {
    const { 
        disconnect, 
        isConnected, 
        targetLanguage,
        transcripts 
    } = useGeminiTranslator({ 
        userLanguage: myLanguage, 
        userRole, 
        audioInputDeviceId: deviceConfig.audioInputId,
        audioOutputDeviceId: deviceConfig.audioOutputId
    });
    
    const [isSubtitlesOpen, setIsSubtitlesOpen] = useState(true);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    // Attach local stream to video element
    useEffect(() => {
        if (localVideoRef.current && activeStream) {
            localVideoRef.current.srcObject = activeStream;
        }
    }, [activeStream]);

    const transcriptRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcripts]);

    const isAgent = userRole === UserRole.AGENT;
    
    // In this "Room" model, we simulate the remote user with an avatar, 
    // but the LOCAL video is shown to prove device access.
    const remoteLabel = isAgent ? 'Customer' : 'Support Agent';
    const remoteImg = isAgent 
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80' 
        : 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80';

    return (
        <div className="flex-1 flex flex-row overflow-hidden h-[calc(100vh-80px)] relative bg-gray-900">
            
            {/* Main Video Area (The "Room") */}
            <div className={`flex-1 relative flex flex-col justify-center bg-black overflow-hidden group`}>
                
                {/* 1. REMOTE USER (Simulated Avatar for Demo) */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src={remoteImg}
                        alt="Remote User" 
                        className={`w-full h-full object-cover transition-all duration-1000 ${targetLanguage ? 'opacity-100 scale-100' : 'opacity-40 scale-105 blur-sm'}`}
                    />
                     <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
                </div>

                {/* Status Overlay */}
                {!targetLanguage && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 flex-col animate-pulse">
                        <div className="bg-black/40 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 text-white font-medium flex items-center gap-3">
                            <span className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></span>
                            Waiting for partner to join room...
                        </div>
                    </div>
                )}

                {/* Top Badge */}
                {targetLanguage && (
                    <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-20 animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl shadow-inner">
                                {targetLanguage.flag}
                            </div>
                            <div>
                                <div className="text-xs text-gray-300 uppercase font-bold tracking-wider opacity-80">Speaking</div>
                                <div className="font-bold text-lg leading-none">{targetLanguage.name}</div>
                            </div>
                        </div>
                        
                        {isConnected && (
                            <div className="flex items-center gap-2 bg-red-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                Live Translation
                            </div>
                        )}
                    </div>
                )}

                {/* 2. LOCAL USER (Real Camera) - Picture in Picture */}
                <div className="absolute bottom-32 right-8 w-48 md:w-64 aspect-video bg-gray-800 rounded-2xl overflow-hidden border-[3px] border-white/20 shadow-2xl z-20 hover:scale-105 transition-transform duration-300 group-hover:border-yellow-400/50">
                    {activeStream ? (
                        <video 
                            ref={localVideoRef} 
                            autoPlay 
                            muted 
                            playsInline
                            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-xs uppercase tracking-widest">
                            Camera Off
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <Visualizer isActive={isConnected} />
                    </div>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-4">
                     <button 
                        onClick={() => setIsSubtitlesOpen(!isSubtitlesOpen)}
                        className={`w-14 h-14 rounded-full backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors ${isSubtitlesOpen ? 'bg-white/30' : 'bg-white/10'}`}
                        title="Toggle Transcript"
                     >
                        <ChatBubbleLeftRightIcon />
                     </button>
                     <button 
                        onClick={() => { disconnect(); onLeave(); }}
                        className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg shadow-red-500/40 transition-all hover:scale-110 active:scale-95 flex items-center justify-center w-16 h-16 ring-4 ring-red-500/20"
                        title="Leave Room"
                    >
                        <PhoneXMarkIcon />
                    </button>
                </div>
            </div>

            {/* Right: Smart Transcript (Collapsible) */}
            <div className={`
                ${isSubtitlesOpen ? 'w-[400px] translate-x-0' : 'w-0 translate-x-full opacity-0'} 
                transition-all duration-500 ease-in-out bg-white border-l border-gray-200 flex flex-col z-20 shadow-2xl h-full absolute right-0 lg:relative
            `}>
                <div className="p-6 border-b border-gray-100 bg-white/95 backdrop-blur flex-shrink-0">
                    <h3 className="font-bold text-gray-800">Live Transcript</h3>
                </div>

                <div ref={transcriptRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                    {transcripts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-8">
                             <p className="text-sm font-medium">Room Ready.</p>
                             <p className="text-xs mt-2">Waiting for speech...</p>
                        </div>
                    )}

                    {transcripts.map((t) => (
                        <div key={t.id} className={`flex flex-col ${t.sender === 'Client' ? 'items-start' : 'items-end'} animate-fade-in`}>
                            <span className="text-[10px] text-gray-400 mb-1 px-1 font-bold uppercase tracking-wide">
                                {t.sender}
                            </span>
                            <div className={`
                                max-w-[90%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm relative
                                ${t.sender === 'Client'
                                    ? 'bg-yellow-50 border border-yellow-200 text-gray-800 rounded-tl-none' 
                                    : 'bg-blue-50 border border-blue-200 text-gray-800 rounded-tr-none'
                                }
                            `}>
                                {t.isTranslation && (
                                    <div className="text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                                        TRANSLATION
                                    </div>
                                )}
                                {t.text}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
