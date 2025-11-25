
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Language, UserRole } from './types';
import { DEFAULT_AGENT_LANGUAGE, DEFAULT_CUSTOMER_LANGUAGE, SUPPORTED_LANGUAGES } from './constants';
import { Button } from './components/Button';
import { LanguageSelector } from './components/LanguageSelector';
import { useGeminiTranslator } from './hooks/useGeminiTranslator';
import { useWebRTC } from './hooks/useWebRTC';
import { Visualizer } from './components/Visualizer';
import { useMediaDevices } from './hooks/useMediaDevices';
import { SettingsModal } from './components/SettingsModal';
import { getApiKey } from './services/geminiService';
import { signaling } from './services/signalingService';
import { TranslationBubble } from './components/TranslationBubble';

// --- ICONS ---
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
    User: () => (
       <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    ),
    Briefcase: () => (
       <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
    ),
    Share: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    )
};

// --- COMPONENTS ---

const SessionView: React.FC<{ role: UserRole, selectedLang: Language }> = ({ role, selectedLang }) => {
  // Mobile: Default to collapsed transcript (false), Desktop: Open (true)
  const [showTranscript, setShowTranscript] = useState(() => window.innerWidth >= 1024);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
        setRoomId(room);
        signaling.join(room);
    }
  }, []);

  const { config, setConfig, activeStream, devices, refreshDevices } = useMediaDevices();
  
  const { 
      connect: connectGemini, 
      disconnect: disconnectGemini, 
      isConnected: isGeminiConnected,
      isTranslating,
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

  // Automatically connect Gemini once in Session View
  useEffect(() => {
    if (!isGeminiConnected) {
        connectGemini();
    }
    // Cleanup on unmount
    return () => disconnectGemini();
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
      if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
      }
  }, [transcripts]);

  const { remoteStream } = useWebRTC({
      userRole: role,
      localStream: activeStream,
      isConnectedToRoom: true
  });

  const handleEndCall = () => {
      disconnectGemini();
      window.location.reload();
  };

  useEffect(() => {
      if (activeStream) {
          activeStream.getAudioTracks().forEach(t => t.enabled = isMicOn);
      }
      setMuted(!isMicOn);
  }, [isMicOn, activeStream, setMuted]);

  useEffect(() => {
      if (activeStream) {
          activeStream.getVideoTracks().forEach(t => t.enabled = isCamOn);
      }
  }, [isCamOn, activeStream]);

  const setLocalVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
        node.srcObject = activeStream;
        node.play().catch(() => {});
    }
  }, [activeStream]);

  const setRemoteVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
        node.srcObject = remoteStream;
        node.play().catch(() => {});
    }
  }, [remoteStream]);


  return (
      <div className="fixed inset-0 bg-[#202124] flex flex-col text-white overflow-hidden font-sans">
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            devices={devices}
            config={config}
            setConfig={setConfig}
        />

        {!getApiKey() && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white text-xs py-1 px-4 text-center font-mono">
                API KEY MISSING
            </div>
        )}

        <div className="flex-1 relative min-h-0 flex flex-col md:flex-row">
            {/* Remote Video Container */}
            <div className="flex-1 relative bg-[#202124] flex items-center justify-center overflow-hidden">
                {remoteStream ? (
                    <video 
                        ref={setRemoteVideoRef}
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-contain bg-black"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-6 opacity-50 px-4 text-center">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-700 flex items-center justify-center animate-pulse">
                            <span className="text-3xl md:text-4xl text-gray-500">
                                {role === UserRole.CUSTOMER ? 'Agent' : 'Client'}
                            </span>
                        </div>
                        <p className="text-base md:text-lg font-light tracking-wide">
                            {targetLanguage 
                                ? `Connected to ${targetLanguage.name} Speaker`
                                : 'Waiting for participant...'}
                            <br/>
                            <span className="text-xs font-mono mt-2 block bg-gray-800 px-2 py-1 rounded inline-block">
                                Room ID: {roomId}
                            </span>
                        </p>
                    </div>
                )}

                {/* Local Video PIP - Responsive Sizing */}
                <div className="absolute top-4 left-4 w-28 md:w-48 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10 transition-all duration-300 hover:scale-105 group">
                    <video 
                        ref={setLocalVideoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className={`w-full h-full object-cover transform scale-x-[-1] ${!isCamOn ? 'hidden' : ''}`} 
                    />
                    {!isCamOn && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Icons.Video on={false} />
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 text-[8px] md:text-[10px] font-medium px-2 py-0.5 bg-black/50 rounded backdrop-blur-sm flex items-center gap-2">
                        You ({selectedLang.flag})
                        <div className="scale-75 origin-left md:scale-100">
                            <Visualizer isActive={isMicOn} />
                        </div>
                    </div>
                    
                    {/* Translation Bubble Overlay */}
                    <div className="absolute -bottom-14 left-0 w-full flex justify-center scale-75 md:scale-100 origin-top">
                         <TranslationBubble show={isTranslating} />
                    </div>
                </div>

                {/* Status Pills */}
                {geminiError && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm shadow-lg z-50">
                        {geminiError}
                    </div>
                )}
            </div>

            {/* Transcript - Absolute overlay on Mobile, Sidebar on Desktop */}
            {showTranscript && (
                <div className="absolute inset-0 z-40 md:static md:w-80 bg-white md:border-l md:border-gray-200 flex flex-col text-gray-900 animate-slide-in-right">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#f8fafc]">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">Live Transcript</h3>
                        <button onClick={() => setShowTranscript(false)} className="text-gray-400 hover:text-gray-600">
                             <Icons.PhoneX /> 
                        </button>
                    </div>
                    <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
                        {transcripts.length === 0 && (
                            <p className="text-center text-gray-400 text-sm mt-10 italic">Conversation will appear here...</p>
                        )}
                        {transcripts.map((t) => (
                            <div key={t.id} className={`flex flex-col ${t.sender === (role === 'CUSTOMER' ? 'Client' : 'Agent') ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
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

        {/* Control Bar - Compact on Mobile */}
        <div className="h-20 md:h-24 bg-[#1e1e1e] border-t border-white/5 flex items-center justify-between px-4 md:px-6 z-20 shrink-0">
            {/* Info Section - Hide labels on mobile */}
            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-300 w-1/3">
                 <div className={`h-2 w-2 rounded-full ${isGeminiConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
                 {role === UserRole.CUSTOMER ? 'Video-Beratung' : 'Client Consultation'}
                 <span className="text-gray-600">|</span>
                 {selectedLang.flag} {selectedLang.name}
            </div>
            {/* Mobile Status Indicator */}
            <div className="md:hidden flex items-center gap-2 mr-2">
                 <div className={`h-2 w-2 rounded-full ${isGeminiConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                 <span className="text-lg">{selectedLang.flag}</span>
            </div>

            <div className="flex items-center gap-3 md:gap-4 flex-1 justify-center md:flex-none">
                <button 
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`h-12 w-12 md:h-14 md:w-14 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg ${isMicOn ? 'bg-[#3c4043] hover:bg-[#4a4e51] text-white' : 'bg-red-600 text-white'}`}
                >
                    <Icons.Mic on={isMicOn} />
                </button>

                <button 
                    onClick={() => setIsCamOn(!isCamOn)}
                    className={`h-12 w-12 md:h-14 md:w-14 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg ${isCamOn ? 'bg-[#3c4043] hover:bg-[#4a4e51] text-white' : 'bg-red-600 text-white'}`}
                >
                    <Icons.Video on={isCamOn} />
                </button>

                <div className="w-px h-6 md:h-8 bg-gray-600 mx-1 md:mx-2"></div>

                <Button 
                    onClick={handleEndCall}
                    className="!rounded-full px-4 md:px-8 bg-red-600 hover:bg-red-700 border-none text-white h-12 md:h-14 shadow-red-900/50 shadow-lg"
                >
                    <Icons.PhoneX />
                    <span className="hidden md:inline ml-2">End Call</span>
                </Button>
            </div>

            <div className="flex items-center justify-end gap-2 md:gap-3 w-auto md:w-1/3">
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

// --- LANGUAGE POPUP ---

const LanguagePopup: React.FC<{ role: UserRole, onComplete: (lang: Language) => void }> = ({ role, onComplete }) => {
    const [selected, setSelected] = useState<Language | null>(null);

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col items-center justify-center p-6 animate-fade-in font-sans">
             <div className="w-full max-w-4xl flex flex-col items-center gap-8">
                 <div className="text-center space-y-2">
                     <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                         {role === UserRole.CUSTOMER ? 'Welche Sprache sprechen Sie?' : 'Select your Agent Language'}
                     </h2>
                     <p className="text-gray-500">
                         {role === UserRole.CUSTOMER ? 'Bitte wählen Sie eine Sprache aus.' : 'This will be the language you speak during the session.'}
                     </p>
                 </div>

                 <LanguageSelector 
                    onSelect={setSelected}
                    selectedLang={selected || undefined}
                 />

                 <div className="mt-8 h-16 w-full max-w-md">
                     {selected && (
                        <Button 
                            onClick={() => onComplete(selected)}
                            variant="post-yellow"
                            size="xl"
                            fullWidth
                            className="!rounded-full shadow-xl hover:shadow-2xl animate-bounce-in"
                        >
                            {role === UserRole.CUSTOMER ? 'Bestätigen & Starten' : 'Confirm & Start'}
                        </Button>
                     )}
                 </div>
             </div>
        </div>
    );
}

// --- LAUNCHER ---

const Launcher: React.FC = () => {
  const [generatedRoomId] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());

  const handleStart = (role: UserRole) => {
    const url = new URL(window.location.href);
    url.searchParams.set('role', role === UserRole.CUSTOMER ? 'customer' : 'agent');
    if (!url.searchParams.has('room')) {
        url.searchParams.set('room', generatedRoomId);
    }
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
        <div className="h-2 bg-[#FFCC00] w-full" />
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-5 flex items-center justify-between">
             <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[#FFCC00] flex items-center justify-center font-bold text-xl md:text-2xl rounded-sm text-black">P</div>
                  <div>
                      <h1 className="text-lg md:text-xl font-bold tracking-tight text-black">PostBranch Connect</h1>
                  </div>
             </div>
             <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-mono text-xs md:text-sm border border-yellow-200">
                ID: {generatedRoomId}
             </div>
        </header>
        
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex flex-col md:flex-row items-center justify-center gap-2 text-blue-800 text-xs md:text-sm text-center">
             <div className="flex items-center gap-2">
                 <Icons.Share />
                 <span className="font-semibold">Cross-Device Ready:</span> 
             </div>
             <span>Use Session ID <b>{generatedRoomId}</b> to connect from any device.</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
             <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="group relative bg-white rounded-3xl p-8 md:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-yellow-400 flex flex-col items-center text-center">
                       <div className="w-20 h-20 md:w-24 md:h-24 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mb-6 group-hover:scale-110 transition-transform">
                            <Icons.User />
                       </div>
                       <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Customer Kiosk</h2>
                       <Button 
                          onClick={() => handleStart(UserRole.CUSTOMER)}
                          variant="post-yellow"
                          fullWidth
                          className="!rounded-full text-lg py-4"
                       >
                          Launch Kiosk
                       </Button>
                  </div>

                  <div className="group relative bg-white rounded-3xl p-8 md:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-blue-400 flex flex-col items-center text-center">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                            <Icons.Briefcase />
                       </div>
                       <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Agent Portal</h2>
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
        
        <footer className="text-center py-6 text-gray-400 text-xs md:text-sm px-4">
            Powered by Google Gemini 2.5 Live API & WebRTC (via MQTT Signaling)
        </footer>
    </div>
  );
};

export default function App() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role');
    if (r === 'customer') setRole(UserRole.CUSTOMER);
    else if (r === 'agent') setRole(UserRole.AGENT);
  }, []);

  // 1. Launcher (No Role yet)
  if (!role) {
    return <Launcher />;
  }

  // 2. Language Selection Popup (Role selected, Lang not yet)
  if (!selectedLanguage) {
      return (
          <LanguagePopup 
             role={role} 
             onComplete={(lang) => setSelectedLanguage(lang)} 
          />
      );
  }

  // 3. Session Room (Both selected)
  return <SessionView role={role} selectedLang={selectedLanguage} />;
}
