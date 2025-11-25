
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Language, UserRole, IncomingCall } from './types';
import { DEFAULT_AGENT_LANGUAGE, DEFAULT_CUSTOMER_LANGUAGE } from './constants';
import { Button } from './components/Button';
import { LanguageSelector } from './components/LanguageSelector';
import { useGeminiTranslator, TranscriptItem } from './hooks/useGeminiTranslator';
import { Visualizer } from './components/Visualizer';
import { signaling, SignalingMessage } from './services/signalingService';

// --- ICONS ---
const PhoneXMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-10.5-2.393c5.142-6.685 15.245-1.977 15.245 6.643 0 2.657-1.42 5.06-3.616 6.368-2.673 1.593-5.22-.44-6.49-1.996-1.27-1.555-3.818-3.564-6.49-1.996-2.195 1.309-3.616 3.712-3.616 6.368 0 8.62 10.103 13.328 15.245 6.642" />
  </svg>
);

const UserGroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 5.472m0 0a9.09 9.09 0 0 0-3.279 3.298m.944-5.464A6.001 6.001 0 0 1 12.001 15c.767 0 1.516.146 2.203.413m-2.203-9.502 1.134 4.536a1.06 1.06 0 0 1-.375 1.168L11.5 13.5l-3.328-3.329 1.933-1.933a1.06 1.06 0 0 1 1.167-.375l4.537 1.134Z" />
  </svg>
);

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
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

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
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
    return <CustomerApp />;
  }

  if (role === 'agent') {
    return <AgentApp />;
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
          <h1 className="text-2xl font-medium text-gray-500">Development Environment</h1>
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
                Simulates the touch-screen interface at the postal branch. Includes language selection and waiting room experience.
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
                Simulates the desktop dashboard for support agents. Features real-time call queue and session management.
              </p>
              <div className="mt-auto">
                <Button onClick={() => openApp('agent')} variant="secondary" fullWidth size="lg" icon={<ExternalLinkIcon />}>
                  Launch Portal
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 flex justify-center items-center gap-2 text-sm text-gray-400">
          <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
          <p>Powered by Gemini 2.5 Live API</p>
          <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

// --- CUSTOMER APP ---

function CustomerApp() {
  const [appState, setAppState] = useState<AppState>(AppState.CUSTOMER_LANGUAGE);
  const [myLanguage, setMyLanguage] = useState<Language>(DEFAULT_CUSTOMER_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState<Language>(DEFAULT_AGENT_LANGUAGE);
  const [customerId] = useState<string>(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    const cleanup = signaling.subscribe((msg: SignalingMessage) => {
      if (msg.type === 'CALL_ACCEPTED' && msg.customerId === customerId) {
        setTargetLanguage(msg.agentLanguage);
        setAppState(AppState.SESSION);
      }
      if (msg.type === 'CALL_ENDED' && msg.customerId === customerId) {
        setAppState(AppState.CUSTOMER_LANGUAGE);
      }
    });
    return cleanup;
  }, [customerId]);

  const selectLanguage = (lang: Language) => {
    setMyLanguage(lang);
    setAppState(AppState.CUSTOMER_WAITING);
    signaling.send({
      type: 'CALL_STARTED',
      customerId: customerId,
      language: lang
    });
  };

  const endSession = () => {
    signaling.send({ type: 'CALL_ENDED', customerId });
    setAppState(AppState.CUSTOMER_LANGUAGE);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 overflow-hidden flex flex-col">
      {/* MODERN HEADER */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
            <div className="bg-yellow-400 text-gray-900 w-10 h-10 rounded-xl shadow-lg shadow-yellow-400/30 flex items-center justify-center font-bold text-lg">
                P
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-800">PostBranch</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             <span className="text-xs font-medium text-gray-500 font-mono">ID: {customerId}</span>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col relative">
        {appState === AppState.CUSTOMER_LANGUAGE && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-3xl w-full">
              <div className="text-center mb-10 animate-fade-in-up">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome / Willkommen</h2>
                <p className="text-xl text-gray-500">Please select your preferred language to start.</p>
              </div>
              <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100 animate-fade-in-up delay-100">
                <LanguageSelector onSelect={selectLanguage} />
              </div>
            </div>
          </div>
        )}

        {appState === AppState.CUSTOMER_WAITING && (
           <div className="absolute inset-0 bg-slate-900 text-white flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950"></div>
              
              {/* Animated Background Rings */}
              <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full animate-[spin_10s_linear_infinite]"></div>
              <div className="absolute w-[400px] h-[400px] border border-white/10 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>

              <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
                  <div className="relative mb-12">
                      <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-20"></div>
                      <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-yellow-300 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.4)] relative z-10">
                          <span className="text-4xl">📞</span>
                      </div>
                  </div>
                  
                  <h2 className="text-4xl font-bold mb-4">Connecting...</h2>
                  <p className="text-lg text-gray-400 mb-8">We are looking for an available agent who speaks <span className="text-white font-semibold">{myLanguage.name}</span>.</p>
                  
                  <div className="flex flex-col items-center gap-6 w-full">
                      <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                          <span className="text-2xl">{myLanguage.flag}</span>
                          <span className="font-medium text-white">{myLanguage.name}</span>
                      </div>
                      
                      <button 
                          onClick={endSession} 
                          className="mt-4 text-sm text-gray-500 hover:text-white transition-colors uppercase tracking-widest font-semibold"
                      >
                          Cancel Request
                      </button>
                  </div>
              </div>
           </div>
        )}

        {appState === AppState.SESSION && (
          <SessionView 
              userRole={UserRole.CUSTOMER}
              customerId={customerId}
              myLanguage={myLanguage}
              targetLanguage={targetLanguage}
              onEndCall={endSession}
          />
        )}
      </div>
    </div>
  );
}

// --- AGENT APP ---

function AgentApp() {
  const [appState, setAppState] = useState<AppState>(AppState.AGENT_SETUP);
  const [myLanguage, setMyLanguage] = useState<Language>(DEFAULT_AGENT_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState<Language>(DEFAULT_CUSTOMER_LANGUAGE);
  const [callQueue, setCallQueue] = useState<IncomingCall[]>([]);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = signaling.subscribe((msg: SignalingMessage) => {
      if (msg.type === 'CALL_STARTED') {
        setCallQueue(prev => {
            if (prev.find(c => c.id === msg.customerId)) return prev;
            return [...prev, { id: msg.customerId, language: msg.language, timestamp: Date.now() }];
        });
      }
      if (msg.type === 'CALL_ENDED') {
        setCallQueue(prev => prev.filter(c => c.id !== msg.customerId));
        if (msg.customerId === activeCustomerId) {
            setAppState(AppState.AGENT_DASHBOARD);
            setActiveCustomerId(null);
        }
      }
    });
    return cleanup;
  }, [activeCustomerId]);

  const completeSetup = (lang: Language) => {
    setMyLanguage(lang);
    setAppState(AppState.AGENT_DASHBOARD);
  };

  const acceptCall = (call: IncomingCall) => {
    setTargetLanguage(call.language);
    setActiveCustomerId(call.id);
    setCallQueue(prev => prev.filter(c => c.id !== call.id));
    signaling.send({
        type: 'CALL_ACCEPTED',
        customerId: call.id,
        agentLanguage: myLanguage
    });
    setAppState(AppState.SESSION);
  };

  const endSession = () => {
      if (activeCustomerId) {
        signaling.send({ type: 'CALL_ENDED', customerId: activeCustomerId });
      }
      setAppState(AppState.AGENT_DASHBOARD);
      setActiveCustomerId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 flex flex-col">
       {/* HEADER */}
       <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center z-20 shadow-sm">
          <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
                  <UserGroupIcon />
              </div>
              <div>
                  <h1 className="font-bold text-xl text-gray-900 leading-none">Agent Portal</h1>
                  <p className="text-xs text-gray-500 mt-1 font-medium tracking-wide">GLOBAL SUPPORT TEAM</p>
              </div>
          </div>
          
          {appState !== AppState.AGENT_SETUP && (
            <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                <div className="relative">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 block absolute inset-0 animate-ping opacity-75"></span>
                </div>
                <span className="text-sm font-semibold text-gray-700">{myLanguage.name} Speaker</span>
            </div>
          )}
      </header>

      {appState === AppState.AGENT_SETUP && (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
           <div className="bg-white max-w-xl w-full rounded-[2rem] shadow-xl shadow-slate-200 border border-white p-10">
              <h2 className="text-3xl font-bold mb-3 text-gray-800">Agent Login</h2>
              <p className="text-gray-500 mb-8">Select your primary language to enter the queue.</p>
              <div className="h-[400px] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                 <LanguageSelector onSelect={completeSetup} />
              </div>
           </div>
        </div>
      )}

      {appState === AppState.AGENT_DASHBOARD && (
        <div className="flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Status</h3>
                        <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            Online & Ready
                        </div>
                    </div>
                     <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl shadow-xl shadow-blue-600/20 text-white">
                        <h3 className="text-blue-100 font-medium mb-2">Waiting Queue</h3>
                        <div className="text-5xl font-bold mb-4">{callQueue.length}</div>
                        <p className="text-sm text-blue-200">Customers currently waiting for assistance in {myLanguage.name} or other languages.</p>
                    </div>
                </div>

                {/* Queue Column */}
                <div className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        Incoming Calls
                        {callQueue.length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{callQueue.length}</span>
                        )}
                    </h3>
                    
                    <div className="space-y-4">
                        {callQueue.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 opacity-75">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                    <GlobeIcon />
                                </div>
                                <p className="text-gray-500 font-medium">No calls in queue</p>
                            </div>
                        ) : (
                            callQueue.map((call) => (
                                <div key={call.id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-6 group">
                                    <div className="flex items-center gap-5 w-full sm:w-auto">
                                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                                            {call.language.flag}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-900 text-lg">Customer</h4>
                                                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">#{call.id.substring(0,3)}</span>
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                Language Request: <span className="font-semibold text-gray-800">{call.language.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto">
                                        <Button 
                                            variant="primary" 
                                            size="md"
                                            fullWidth
                                            onClick={() => acceptCall(call)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg shadow-blue-600/20"
                                        >
                                            Accept Call
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {appState === AppState.SESSION && activeCustomerId && (
         <SessionView 
            userRole={UserRole.AGENT}
            customerId={activeCustomerId}
            myLanguage={myLanguage}
            targetLanguage={targetLanguage}
            onEndCall={endSession}
         />
      )}
    </div>
  );
}

// --- SHARED SESSION COMPONENT ---

function SessionView({ 
    userRole,
    customerId,
    myLanguage, 
    targetLanguage, 
    onEndCall 
}: { 
    userRole: UserRole,
    customerId: string,
    myLanguage: Language, 
    targetLanguage: Language, 
    onEndCall: () => void 
}) {
    const { 
        connect, 
        disconnect, 
        isConnected, 
        error, 
        transcripts 
    } = useGeminiTranslator({ userLanguage: myLanguage, targetLanguage: targetLanguage, userRole, customerId });
    
    const [isSubtitlesOpen, setIsSubtitlesOpen] = useState(true);

    useEffect(() => {
        connect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const transcriptRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcripts]);

    const isAgent = userRole === UserRole.AGENT;
    const remoteLabel = isAgent ? 'Customer' : 'Support Agent';
    
    const remoteImg = isAgent 
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80' // Customer image
        : 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80'; // Agent image

    return (
        <div className="flex-1 flex flex-row overflow-hidden h-screen relative bg-gray-900">
            
            {/* Main Video Area */}
            <div className={`flex-1 relative flex flex-col justify-center bg-black overflow-hidden group transition-all duration-300`}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10 pointer-events-none"></div>
                
                <img 
                    src={remoteImg}
                    alt="Remote User" 
                    className="w-full h-full object-cover opacity-90 transition-transform duration-1000 hover:scale-105"
                />
                
                {/* Top Badge */}
                <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-20">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl shadow-inner">
                             {targetLanguage.flag}
                         </div>
                         <div>
                             <div className="text-xs text-gray-300 uppercase font-bold tracking-wider opacity-80">Connected to</div>
                             <div className="font-bold text-lg leading-none">{remoteLabel}</div>
                         </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-red-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        Live
                    </div>
                </div>

                {/* PIP (Local Cam) */}
                <div className="absolute bottom-24 right-8 w-48 md:w-64 aspect-[4/3] bg-gray-800 rounded-2xl overflow-hidden border-[3px] border-white/20 shadow-2xl z-20 hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative">
                        <span className="text-xs text-white/50 font-medium uppercase tracking-widest">My Camera</span>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                            <Visualizer isActive={isConnected} />
                        </div>
                    </div>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-4">
                     <button 
                        onClick={() => setIsSubtitlesOpen(!isSubtitlesOpen)}
                        className={`w-14 h-14 rounded-full backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors ${isSubtitlesOpen ? 'bg-white/30' : 'bg-white/10'}`}
                     >
                        <ChatBubbleLeftRightIcon />
                     </button>
                     <button 
                        onClick={() => { disconnect(); onEndCall(); }}
                        className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg shadow-red-500/40 transition-all hover:scale-110 active:scale-95 flex items-center justify-center w-16 h-16 ring-4 ring-red-500/20"
                    >
                        <PhoneXMarkIcon />
                    </button>
                    <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                          <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
                          <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Right: Smart Transcript (Collapsible) */}
            <div className={`
                ${isSubtitlesOpen ? 'w-[400px] translate-x-0' : 'w-0 translate-x-full opacity-0'} 
                transition-all duration-500 ease-in-out bg-white border-l border-gray-200 flex flex-col z-20 shadow-2xl h-full absolute right-0 lg:relative
            `}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-white/95 backdrop-blur flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800">Live Transcript</h3>
                        </div>
                        {isConnected && <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full border border-green-100">ACTIVE</span>}
                    </div>
                </div>

                {/* Chat Body */}
                <div 
                    ref={transcriptRef} 
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50"
                >
                    {transcripts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-8">
                             <p className="text-sm font-medium">Conversation started.</p>
                             <p className="text-xs mt-2">Speak to see real-time translation.</p>
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
