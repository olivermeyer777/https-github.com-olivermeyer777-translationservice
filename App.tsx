
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Language, UserRole } from './types';
import { DEFAULT_AGENT_LANGUAGE, DEFAULT_CUSTOMER_LANGUAGE, SUPPORTED_LANGUAGES } from './constants';
import { Button } from './components/Button';
import { LanguageSelector } from './components/LanguageSelector';
import { useGeminiTranslator, TranscriptItem } from './hooks/useGeminiTranslator';
import { useWebRTC } from './hooks/useWebRTC';
import { Visualizer } from './components/Visualizer';
import { useMediaDevices } from './hooks/useMediaDevices';
import { SettingsModal } from './components/SettingsModal';
import { getApiKey } from './services/geminiService';

// --- ICONS (Clean, Modern, Flat, Lucide Style) ---
const Icons = {
    PhoneX: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
    ),
    MessageSquare: ({ on }: { on: boolean }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
    Mic: ({ on }: { on: boolean }) => (
        on ? 
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> :
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    ),
    Video: ({ on }: { on: boolean }) => (
        on ?
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> :
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    ),
    Settings: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    ),
    ChevronDown: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    ),
    User: () => (
       <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    ),
    Briefcase: () => (
       <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
    )
};

// --- COMPONENTS ---

const SessionView: React.FC<{ role: UserRole }> = ({ role }) => {
  const [selectedLang, setSelectedLang] = useState<Language>(
      role === UserRole.AGENT ? DEFAULT_AGENT_LANGUAGE : DEFAULT_CUSTOMER_LANGUAGE
  );
  const [inCall, setInCall] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // 1. Device Management
  const { config, setConfig, activeStream, devices, refreshDevices } = useMediaDevices();
  
  // 2. Translator Logic
  const { 
      connect: connectGemini, 
      disconnect: disconnectGemini, 
      isConnected: isGeminiConnected,
      targetLanguage,
      error: geminiError,
      transcripts,
      setMuted 
  } = useGeminiTranslator({
      userLanguage: selectedLang,
      userRole: role,
      audioInputDeviceId: config.audioInputId,
      audioOutputDeviceId: config.audioOutputId
  });

  // 3. WebRTC Video Logic
  const { remoteStream } = useWebRTC({
      userRole: role,
      localStream: activeStream,
      isConnectedToRoom: inCall 
  });

  // Start call handler
  const handleStartCall = () => {
      setInCall(true);
      connectGemini();
  };

  const handleEndCall = () => {
      disconnectGemini();
      setInCall(false);
      // Optional: Redirect to landing or reset state
  };

  // Toggle Mute
  useEffect(() => {
      if (activeStream) {
          activeStream.getAudioTracks().forEach(t => t.enabled = isMicOn);
      }
      setMuted(!isMicOn);
  }, [isMicOn, activeStream, setMuted]);

  // Toggle Camera
  useEffect(() => {
      if (activeStream) {
          activeStream.getVideoTracks().forEach(t => t.enabled = isCamOn);
      }
  }, [isCamOn, activeStream]);

  // Attach Streams to DOM
  useEffect(() => {
      if (localVideoRef.current && activeStream) {
          localVideoRef.current.srcObject = activeStream;
      }
  }, [activeStream, isCamOn]);

  useEffect(() => {
      if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
      }
  }, [remoteStream]);

  // -- PRE-CALL (Language Selection) --
  if (!inCall) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
              {/* Swiss Post Header */}
              <div className="h-2 bg-[#FFCC00] w-full" />
              <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#FFCC00] flex items-center justify-center font-bold text-xl rounded-sm">P</div>
                  <h1 className="text-xl font-bold tracking-tight text-black">PostBranch Video-Schalter</h1>
              </header>

              <main className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
                  <div className="w-full max-w-4xl text-center space-y-12">
                      <div className="space-y-4">
                          <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
                              {role === UserRole.CUSTOMER ? 'Willkommen bei der Post' : 'PostBranch Agent Portal'}
                          </h2>
                          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                              {role === UserRole.CUSTOMER 
                                  ? 'Bitte wählen Sie Ihre Sprache für das Beratungsgespräch.' 
                                  : 'Select your preferred language to begin serving customers.'}
                          </p>
                      </div>

                      <LanguageSelector 
                          selectedLang={selectedLang}
                          onSelect={setSelectedLang}
                      />

                      <div className="pt-8">
                          <Button 
                              onClick={handleStartCall}
                              size="xl" 
                              variant="post-yellow"
                              className="w-full max-w-md mx-auto shadow-xl hover:shadow-2xl text-lg rounded-full"
                          >
                              {role === UserRole.CUSTOMER ? 'Video-Beratung starten' : 'Open Counter'}
                          </Button>
                      </div>
                  </div>
              </main>
          </div>
      );
  }

  // -- ACTIVE CALL ROOM --
  return (
      <div className="fixed inset-0 bg-[#202124] flex flex-col text-white overflow-hidden">
        {/* Settings Modal */}
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            devices={devices}
            config={config}
            setConfig={setConfig}
        />

        {/* Warning if no API Key */}
        {!getApiKey() && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white text-xs py-1 px-4 text-center font-mono">
                API KEY MISSING - PLEASE CHECK VITE_API_KEY
            </div>
        )}

        {/* Main Video Area */}
        <div className="flex-1 relative min-h-0 flex">
            {/* Center: Remote Video */}
            <div className="flex-1 relative bg-[#202124] flex items-center justify-center">
                {remoteStream ? (
                    <video 
                        ref={remoteVideoRef}
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-6 opacity-50">
                        <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center animate-pulse">
                            <span className="text-4xl text-gray-500">
                                {role === UserRole.CUSTOMER ? 'Agent' : 'Client'}
                            </span>
                        </div>
                        <p className="text-lg font-light tracking-wide">
                            {targetLanguage 
                                ? `Connecting to ${role === UserRole.CUSTOMER ? 'Agent' : 'Customer'}...`
                                : 'Waiting for participant to join...'}
                        </p>
                    </div>
                )}

                {/* Local Video PIP (Top Left) */}
                <div className="absolute top-6 left-6 w-48 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10">
                    {activeStream ? (
                         <video 
                            ref={localVideoRef} 
                            autoPlay 
                            muted 
                            playsInline 
                            className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`} 
                        />
                    ) : null}
                    {!isCamOn && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Icons.Video on={false} />
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 text-[10px] font-medium px-2 py-0.5 bg-black/50 rounded backdrop-blur-sm flex items-center gap-2">
                        You ({selectedLang.flag})
                        <Visualizer isActive={isMicOn} />
                    </div>
                </div>

                {/* Notifications / Status */}
                {geminiError && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm shadow-lg">
                        {geminiError}
                    </div>
                )}
                
                {targetLanguage && !remoteStream && (
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#FFCC00] text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-fade-in-down">
                        Partner Connected ({targetLanguage.name}) - Establishing Video...
                    </div>
                )}
            </div>

            {/* Right Sidebar: Transcript */}
            {showTranscript && (
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col text-gray-900 animate-slide-in-right">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#f8fafc]">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">Live Transcript</h3>
                        <button onClick={() => setShowTranscript(false)} className="text-gray-400 hover:text-gray-600">
                             <Icons.PhoneX /> {/* Close icon reused */}
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
                        {transcripts.length === 0 && (
                            <p className="text-center text-gray-400 text-sm mt-10 italic">Conversation will appear here...</p>
                        )}
                        {transcripts.map((t) => (
                            <div key={t.id} className={`flex flex-col ${t.sender === (role === 'CUSTOMER' ? 'Client' : 'Agent') ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                                    t.isTranslation 
                                        ? 'bg-[#FFCC00]/10 border border-[#FFCC00]/20 text-gray-800' 
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
                                    <p>{t.text}</p>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 px-1 uppercase">{t.sender} {t.isTranslation ? '(Translated)' : ''}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Bottom Control Bar */}
        <div className="h-20 bg-[#1e1e1e] border-t border-white/5 flex items-center justify-between px-6 z-20 shrink-0">
            {/* Left: Metadata */}
            <div className="flex items-center gap-4 text-sm font-medium text-gray-300 w-1/3">
                 <div className="h-2 w-2 rounded-full bg-green-500"></div>
                 {role === UserRole.CUSTOMER ? 'Video-Beratung' : 'Client Consultation'}
                 <span className="text-gray-600">|</span>
                 {selectedLang.flag} {selectedLang.name}
            </div>

            {/* Center: Controls */}
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`p-4 rounded-full transition-all duration-200 ${isMicOn ? 'bg-[#3c4043] hover:bg-[#4a4e51] text-white' : 'bg-red-600 text-white'}`}
                >
                    <Icons.Mic on={isMicOn} />
                </button>

                <button 
                    onClick={() => setIsCamOn(!isCamOn)}
                    className={`p-4 rounded-full transition-all duration-200 ${isCamOn ? 'bg-[#3c4043] hover:bg-[#4a4e51] text-white' : 'bg-red-600 text-white'}`}
                >
                    <Icons.Video on={isCamOn} />
                </button>

                <div className="w-px h-8 bg-gray-600 mx-2"></div>

                <Button 
                    onClick={handleEndCall}
                    className="!rounded-full px-8 bg-red-600 hover:bg-red-700 border-none text-white h-12"
                >
                    <Icons.PhoneX />
                </Button>
            </div>

            {/* Right: Tools */}
            <div className="flex items-center justify-end gap-3 w-1/3">
                 <button 
                    onClick={() => setShowTranscript(!showTranscript)}
                    className={`p-3 rounded-full transition-all ${showTranscript ? 'bg-[#8ab4f8] text-[#202124]' : 'text-gray-300 hover:bg-[#3c4043]'}`}
                    title="Toggle Transcript"
                >
                    <Icons.MessageSquare on={showTranscript} />
                 </button>
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-3 rounded-full text-gray-300 hover:bg-[#3c4043] transition-all"
                    title="Settings"
                >
                    <Icons.Settings />
                 </button>
            </div>
        </div>
      </div>
  );
};

// --- LAUNCHER ---

const Launcher: React.FC = () => {
  const handleStart = (role: UserRole) => {
    const url = new URL(window.location.href);
    url.searchParams.set('role', role === UserRole.CUSTOMER ? 'customer' : 'agent');
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
        {/* Swiss Post Header */}
        <div className="h-2 bg-[#FFCC00] w-full" />
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
             <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#FFCC00] flex items-center justify-center font-bold text-2xl rounded-sm text-black">P</div>
                  <div>
                      <h1 className="text-xl font-bold tracking-tight text-black">PostBranch Connect</h1>
                      <p className="text-xs text-gray-500 uppercase tracking-widest">Prototype</p>
                  </div>
             </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
             <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Customer Card */}
                  <div className="group relative bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-yellow-400 flex flex-col items-center text-center">
                       <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mb-6 group-hover:scale-110 transition-transform">
                            <Icons.User />
                       </div>
                       <h2 className="text-3xl font-bold text-gray-900 mb-4">Customer Kiosk</h2>
                       <p className="text-gray-600 mb-10 leading-relaxed">
                          Launch the customer-facing interface for the video booth.
                          <br/><span className="text-sm opacity-70">Optimized for Touch Screens</span>
                       </p>
                       <Button 
                          onClick={() => handleStart(UserRole.CUSTOMER)}
                          variant="post-yellow"
                          fullWidth
                          className="!rounded-full text-lg py-4"
                       >
                          Launch Kiosk
                       </Button>
                  </div>

                  {/* Agent Card */}
                  <div className="group relative bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-blue-400 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                            <Icons.Briefcase />
                       </div>
                       <h2 className="text-3xl font-bold text-gray-900 mb-4">Agent Portal</h2>
                       <p className="text-gray-600 mb-10 leading-relaxed">
                          Launch the employee dashboard to answer calls.
                          <br/><span className="text-sm opacity-70">Desktop Optimization</span>
                       </p>
                       <Button 
                          onClick={() => handleStart(UserRole.AGENT)}
                          variant="secondary"
                          fullWidth
                          className="!rounded-full text-lg py-4 hover:bg-blue-50 hover:text-blue-700"
                       >
                          Launch Portal
                       </Button>
                  </div>
             </div>
        </div>
        
        <footer className="text-center py-6 text-gray-400 text-sm">
            Powered by Google Gemini 2.5 Live API & WebRTC
        </footer>
    </div>
  );
};

// --- ROUTER ---

export default function App() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role');
    if (r === 'customer') setRole(UserRole.CUSTOMER);
    else if (r === 'agent') setRole(UserRole.AGENT);
  }, []);

  if (role) {
    return <SessionView role={role} />;
  }

  return <Launcher />;
}
