
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

// --- ICONS (Clean, Modern, Flat, Lucide Style) ---
const Icons = {
    PhoneX: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
    ),
    MessageSquare: ({ on }: { on: boolean }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
    Mic: ({ off }: { off?: boolean }) => (
        off ? 
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M12 19v4"/><path d="M8 23h8"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg> :
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    ),
    Camera: ({ off }: { off?: boolean }) => (
        off ?
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21l-3.5-3.5m-2-2l-2-2m-2-2l-3.5-3.5"/><path d="M15 7h1a2 2 0 0 1 2 2v6.5"/><path d="M23 7l-5 5 5 5V7"/><path d="M3 7h2l2-2h8l2 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2"/></svg> :
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    ),
    Settings: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    ),
    ChevronDown: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    ),
    Customer: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#FFCC00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
            <circle cx="12" cy="10" r="3" fill="#FFCC00" fillOpacity="0.1"></circle>
            <path d="M7 15h10"></path>
        </svg>
    ),
    Agent: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7h-9"></path>
            <path d="M14 17H5"></path>
            <circle cx="17" cy="17" r="3"></circle>
            <circle cx="7" cy="7" r="3"></circle>
        </svg>
    ),
    Logo: () => (
         <div className="flex items-center gap-2">
            <div className="bg-[#FFCC00] text-black font-extrabold px-2 py-0.5 rounded-sm text-lg">DIE POST</div>
            <div className="w-px h-6 bg-gray-400 mx-1"></div>
            <span className="font-medium text-black text-lg tracking-tight">PostBranch</span>
         </div>
    )
};

const Header = () => (
    <div className="h-16 bg-white border-b-4 border-[#FFCC00] flex items-center px-6 justify-between shadow-sm z-50 relative">
        <Icons.Logo />
        <div className="text-sm text-gray-500 font-medium">Video-Schalter v2.5</div>
    </div>
);

const Footer = () => (
    <div className="py-6 text-center text-gray-400 text-xs">
        &copy; 2025 Swiss Post Ltd. Powered by Google Gemini Live.
    </div>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [userLanguage, setUserLanguage] = useState<Language>(DEFAULT_CUSTOMER_LANGUAGE);
  const [showSettings, setShowSettings] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  
  // Media Devices Hook
  const { devices, config, setConfig, activeStream, refreshDevices } = useMediaDevices();
  
  // Translator Hook
  const { 
    connect, 
    disconnect, 
    isConnected, 
    isConnecting, 
    targetLanguage, 
    error: geminiError, 
    transcripts,
    setMuted
  } = useGeminiTranslator({
    userLanguage,
    userRole,
    audioInputDeviceId: config.audioInputId,
    audioOutputDeviceId: config.audioOutputId
  });

  // WebRTC Video Hook
  const { remoteStream } = useWebRTC({
      userRole,
      localStream: activeStream,
      isConnectedToRoom: !!targetLanguage
  });

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  // Refs for Video Elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Auto-connect flow from URL query params
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const role = params.get('role');
      if (role === 'customer') {
          setUserRole(UserRole.CUSTOMER);
          setUserLanguage(DEFAULT_CUSTOMER_LANGUAGE);
          setAppState(AppState.LANGUAGE_SELECTION);
      } else if (role === 'agent') {
          setUserRole(UserRole.AGENT);
          setUserLanguage(DEFAULT_AGENT_LANGUAGE);
          setAppState(AppState.LANGUAGE_SELECTION);
      }
  }, []);

  // API Key Check
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  useEffect(() => {
     // @ts-ignore
     const viteKey = import.meta.env?.VITE_API_KEY;
     const processKey = process.env?.API_KEY;
     if (!viteKey && !processKey) {
         setApiKeyMissing(true);
     }
  }, []);

  // Update Video Element Sources
  useEffect(() => {
      if (localVideoRef.current && activeStream) {
          localVideoRef.current.srcObject = activeStream;
      }
  }, [activeStream]);

  useEffect(() => {
      if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
      }
  }, [remoteStream]);

  // Handle Mute/Camera Toggles
  useEffect(() => {
      if (activeStream) {
          activeStream.getAudioTracks().forEach(t => t.enabled = micOn);
          activeStream.getVideoTracks().forEach(t => t.enabled = cameraOn);
      }
      setMuted(!micOn);
  }, [micOn, cameraOn, activeStream, setMuted]);

  const handleStart = (role: UserRole) => {
    setUserRole(role);
    setUserLanguage(role === UserRole.CUSTOMER ? DEFAULT_CUSTOMER_LANGUAGE : DEFAULT_AGENT_LANGUAGE);
    setAppState(AppState.LANGUAGE_SELECTION);
  };

  const handleLanguageSelect = (lang: Language) => {
    setUserLanguage(lang);
    setAppState(AppState.ROOM);
    connect();
  };

  const handleEndCall = () => {
    disconnect();
    setAppState(AppState.LANDING);
    window.location.search = ''; // Clear query params
  };

  // --- VIEWS ---

  if (appState === AppState.LANDING) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Customer Card */}
                <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all border-t-8 border-[#FFCC00] flex flex-col items-center text-center group">
                    <div className="mb-6 p-6 bg-yellow-50 rounded-full group-hover:scale-110 transition-transform">
                        <Icons.Customer />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">Kiosk Mode</h2>
                    <p className="text-gray-500 mb-8">Start the Video Counter for customers at the branch.</p>
                    <Button 
                        onClick={() => handleStart(UserRole.CUSTOMER)} 
                        variant="post-yellow" 
                        size="lg" 
                        fullWidth
                        className="rounded-lg shadow-md font-bold"
                    >
                        Launch Kiosk
                    </Button>
                </div>

                {/* Agent Card */}
                <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all border-t-8 border-blue-600 flex flex-col items-center text-center group">
                    <div className="mb-6 p-6 bg-blue-50 rounded-full group-hover:scale-110 transition-transform">
                        <Icons.Agent />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">Agent Portal</h2>
                    <p className="text-gray-500 mb-8">Log in as a remote agent to accept video calls.</p>
                    <Button 
                        onClick={() => handleStart(UserRole.AGENT)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md font-bold" 
                        size="lg" 
                        fullWidth
                    >
                        Launch Portal
                    </Button>
                </div>
            </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (appState === AppState.LANGUAGE_SELECTION) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6">
           <div className="w-full max-w-3xl space-y-8 animate-fade-in-up">
              <div className="text-center space-y-2">
                 <h2 className="text-3xl font-bold text-gray-900">
                    {userRole === UserRole.CUSTOMER ? 'Wählen Sie Ihre Sprache' : 'Select your operating language'}
                 </h2>
                 <p className="text-gray-500">
                    {userRole === UserRole.CUSTOMER ? 'Für die Video-Beratung' : 'For live translation'}
                 </p>
              </div>

              <LanguageSelector 
                selectedLang={userLanguage} 
                onSelect={handleLanguageSelect} 
              />
              
              <div className="flex justify-center pt-8">
                 <Button variant="ghost" onClick={() => setAppState(AppState.LANDING)}>
                    Cancel
                 </Button>
              </div>
           </div>
        </main>
      </div>
    );
  }

  // --- ROOM VIEW ---
  return (
    <div className="h-screen bg-gray-900 overflow-hidden flex flex-col relative">
      {/* Warning Banners */}
      {apiKeyMissing && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white p-2 text-center text-sm font-bold z-[60]">
           MISSING API KEY: Please set VITE_API_KEY in Vercel Environment Variables.
        </div>
      )}
      {geminiError && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center text-sm font-medium z-[60]">
           Translator Error: {geminiError}
        </div>
      )}

      {/* Main Video Area */}
      <div className="flex-1 relative flex min-h-0">
          {/* Main Content (Remote Video) */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
             
             {/* Remote Video Element */}
             <video 
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
             />

             {/* Waiting State (If no remote stream) */}
             {!remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-4">
                    <div className="w-20 h-20 rounded-full border-4 border-white/20 border-t-[#FFCC00] animate-spin"></div>
                    <div className="text-lg font-medium">
                        {isConnecting ? 'Connecting to Translator...' : 'Waiting for partner...'}
                    </div>
                    {!isConnecting && isConnected && (
                        <div className="text-sm bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                           Waiting for {userRole === 'CUSTOMER' ? 'Agent' : 'Customer'}
                        </div>
                    )}
                </div>
             )}

             {/* Connection Badge */}
             {targetLanguage && (
                 <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/10 text-white px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium shadow-lg z-10">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>{targetLanguage.name} Connected</span>
                 </div>
             )}
          </div>

          {/* Transcript Sidebar */}
          {showTranscript && (
             <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-20 transition-all duration-300">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="font-bold text-gray-700">Live Transcript</h3>
                    <button onClick={() => setShowTranscript(false)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {transcripts.length === 0 && (
                        <div className="text-center text-gray-400 text-sm mt-10 italic">
                            Conversation will appear here...
                        </div>
                    )}
                    {transcripts.map((t) => (
                        <div key={t.id} className={`flex flex-col ${t.sender === 'Client' ? 'items-start' : 'items-end'}`}>
                            <div className="flex items-center gap-1 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${t.sender === 'Client' ? 'text-[#FFCC00]' : 'text-blue-600'}`}>
                                    {t.sender}
                                </span>
                            </div>
                            <div className={`
                                max-w-[90%] px-3 py-2 rounded-2xl text-sm
                                ${t.sender === 'Client' 
                                    ? 'bg-yellow-100 text-gray-800 rounded-tl-none' 
                                    : 'bg-blue-600 text-white rounded-tr-none'}
                                ${t.isTranslation ? 'font-medium' : 'opacity-80 text-xs'}
                            `}>
                                {t.text}
                            </div>
                        </div>
                    ))}
                    <div className="h-4" /> {/* Spacer */}
                </div>
             </div>
          )}

          {/* Local Video Tile (Draggable-ish / Fixed Position) */}
          <div className="absolute top-6 left-6 w-48 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-30 group">
             <video 
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${(!cameraOn || !activeStream) ? 'hidden' : ''}`} 
             />
             {(!cameraOn || !activeStream) && (
                 <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                     <Icons.Camera off />
                 </div>
             )}
             <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                YOU ({userLanguage.flag})
             </div>
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Visualizer isActive={transcripts.length > 0} />
             </div>
          </div>
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-gray-900/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-8 z-40">
          {/* Left: Branding / Time */}
          <div className="text-white font-medium flex items-center gap-4">
              <div className="text-lg font-bold">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              <div className="h-4 w-px bg-white/20"></div>
              <div className="text-sm text-gray-400">PostBranch Connect</div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setMicOn(!micOn)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
              >
                  <Icons.Mic off={!micOn} />
              </button>

              <button 
                onClick={() => setCameraOn(!cameraOn)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${cameraOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
              >
                  <Icons.Camera off={!cameraOn} />
              </button>

              <div className="w-px h-8 bg-white/10 mx-2"></div>

              {/* Language Dropdown */}
              <div className="relative group">
                 <button className="h-12 px-4 bg-gray-800 hover:bg-gray-700 rounded-full text-white flex items-center gap-2 border border-white/10 transition-all">
                    <span>{userLanguage.flag}</span>
                    <span className="font-medium text-sm hidden sm:inline">{userLanguage.name}</span>
                    <Icons.ChevronDown />
                 </button>
                 {/* Dropdown Content could go here, omitting for brevity as main selection happens at start */}
              </div>

              <div className="w-px h-8 bg-white/10 mx-2"></div>

              <button 
                onClick={handleEndCall}
                className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-red-900/20"
              >
                  <Icons.PhoneX />
                  <span>End Call</span>
              </button>
          </div>

          {/* Right: Tools */}
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowTranscript(!showTranscript)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showTranscript ? 'bg-[#FFCC00] text-black' : 'text-white hover:bg-white/10'}`}
              >
                  <Icons.MessageSquare on={showTranscript} />
              </button>
              <button 
                 onClick={() => setShowSettings(true)}
                 className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all"
              >
                  <Icons.Settings />
              </button>
          </div>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        devices={devices}
        config={config}
        setConfig={setConfig}
      />
    </div>
  );
}
