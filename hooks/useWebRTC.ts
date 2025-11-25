
import { useEffect, useRef, useState, useCallback } from 'react';
import { signaling, SignalingMessage } from '../services/signalingService';
import { UserRole } from '../types';

interface UseWebRTCProps {
  userRole: UserRole;
  localStream: MediaStream | null;
  isConnectedToRoom: boolean; 
}

export const useWebRTC = ({ userRole, localStream, isConnectedToRoom }: UseWebRTCProps) => {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const isInitiator = userRole === UserRole.CUSTOMER;
  const hasNegotiatedRef = useRef(false);

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    console.log("WebRTC: Creating new PeerConnection");
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.send({
          type: 'WEBRTC_SIGNAL',
          senderRole: userRole,
          signal: { type: 'CANDIDATE', candidate: event.candidate.toJSON() }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("WebRTC: Received Remote Track");
      setRemoteStream(event.streams[0]);
    };

    // Add local tracks if available
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
            pc.addTrack(track, localStream);
        } catch(e) {
            console.warn("Error adding track", e);
        }
      });
    }

    pcRef.current = pc;
    return pc;
  }, [userRole, localStream]);

  // Handle Incoming Signals
  useEffect(() => {
    const handleSignal = async (msg: SignalingMessage) => {
      // 1. Handle JOIN_ROOM trigger (Retry Offer)
      if (msg.type === 'JOIN_ROOM' && isInitiator && isConnectedToRoom) {
          console.log("WebRTC: Partner joined, re-triggering offer if needed");
          if (localStream) {
              const pc = pcRef.current || createPeerConnection();
              if (pc.signalingState === 'stable') {
                  const offer = await pc.createOffer({ iceRestart: true });
                  await pc.setLocalDescription(offer);
                  signaling.send({
                    type: 'WEBRTC_SIGNAL',
                    senderRole: userRole,
                    signal: { type: 'OFFER', sdp: offer }
                  });
              }
          }
      }

      // 2. Handle standard WebRTC Signals
      if (msg.type !== 'WEBRTC_SIGNAL' || msg.senderRole === userRole) return;
      
      const { signal } = msg;
      const pc = pcRef.current || createPeerConnection();

      try {
        if (signal.type === 'OFFER') {
          console.log("WebRTC: Received Offer");
          // If collision, customer (initiator) wins, but simplified for this demo
          if (pc.signalingState !== 'stable') {
              console.warn("WebRTC: Collision detected, processing offer anyway");
              await Promise.all([
                  pc.setLocalDescription({ type: 'rollback' } as any),
                  pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
              ]);
          } else {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
          
          // Ensure local tracks are added before answering
          if (localStream && pc.getSenders().length === 0) {
             localStream.getTracks().forEach(track => {
                 pc.addTrack(track, localStream);
             });
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          signaling.send({
            type: 'WEBRTC_SIGNAL',
            senderRole: userRole,
            signal: { type: 'ANSWER', sdp: answer }
          });
        } 
        else if (signal.type === 'ANSWER') {
          console.log("WebRTC: Received Answer");
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
        } 
        else if (signal.type === 'CANDIDATE') {
          try {
             if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
             } else {
                 // Simple buffering could be added here, or we rely on ICE gathering being slow enough
             }
          } catch(e) {
             // Ignore candidate errors during negotiation
          }
        }
      } catch (err) {
        console.error("WebRTC Signaling Error", err);
      }
    };

    const cleanup = signaling.subscribe(handleSignal);
    return cleanup;
  }, [userRole, createPeerConnection, localStream, isInitiator, isConnectedToRoom]);

  // Initial Offer (Only Customer)
  useEffect(() => {
    if (isConnectedToRoom && isInitiator && !hasNegotiatedRef.current && localStream) {
      const startCall = async () => {
        if (pcRef.current && pcRef.current.signalingState !== 'stable') return;

        const pc = createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log("WebRTC: Sending Initial Offer");
        signaling.send({
          type: 'WEBRTC_SIGNAL',
          senderRole: userRole,
          signal: { type: 'OFFER', sdp: offer }
        });
        hasNegotiatedRef.current = true;
      };
      
      const timer = setTimeout(startCall, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnectedToRoom, isInitiator, createPeerConnection, localStream]);

  // Handle Local Stream updates
  useEffect(() => {
      const pc = pcRef.current;
      if (pc && localStream) {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          const newVideoTrack = localStream.getVideoTracks()[0];
          
          if (videoSender && newVideoTrack && videoSender.track?.id !== newVideoTrack.id) {
              videoSender.replaceTrack(newVideoTrack).catch(err => console.error("Failed to replace track", err));
          } else if (newVideoTrack && senders.length === 0) {
              pc.addTrack(newVideoTrack, localStream);
          }
      }
  }, [localStream]);

  return { remoteStream };
};
