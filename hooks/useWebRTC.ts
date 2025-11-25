
import { useEffect, useRef, useState, useCallback } from 'react';
import { signaling, SignalingMessage } from '../services/signalingService';
import { UserRole } from '../types';

interface UseWebRTCProps {
  userRole: UserRole;
  localStream: MediaStream | null;
  isConnectedToRoom: boolean; // Only start when "Room" logic is agreed via PING
}

export const useWebRTC = ({ userRole, localStream, isConnectedToRoom }: UseWebRTCProps) => {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const isInitiator = userRole === UserRole.CUSTOMER; // Customer initiates the call offer

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Standard public STUN
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

    // Add local tracks if we have them
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pcRef.current = pc;
    return pc;
  }, [userRole, localStream]);

  // Handle Incoming Signals
  useEffect(() => {
    const handleSignal = async (msg: SignalingMessage) => {
      if (msg.type !== 'WEBRTC_SIGNAL' || msg.senderRole === userRole) return;
      
      // Ensure we have local stream before answering if possible, or at least created the PC
      const pc = pcRef.current || createPeerConnection();
      const { signal } = msg;

      try {
        if (signal.type === 'OFFER') {
          console.log("WebRTC: Received Offer");
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          // Add tracks if they weren't added during create (e.g. if created just now)
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
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } 
        else if (signal.type === 'CANDIDATE') {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error("WebRTC Signaling Error", err);
      }
    };

    const cleanup = signaling.subscribe(handleSignal);
    return cleanup;
  }, [userRole, createPeerConnection, localStream]);

  // Initiate Offer (Only if initiator, room is connected, AND local stream is ready)
  useEffect(() => {
    if (isConnectedToRoom && isInitiator && !pcRef.current && localStream) {
      const startCall = async () => {
        const pc = createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log("WebRTC: Sending Offer");
        signaling.send({
          type: 'WEBRTC_SIGNAL',
          senderRole: userRole,
          signal: { type: 'OFFER', sdp: offer }
        });
      };
      
      // Small delay to ensure other side is likely ready
      setTimeout(startCall, 1500);
    }
  }, [isConnectedToRoom, isInitiator, createPeerConnection, userRole, localStream]);

  // Update tracks if local stream changes mid-call
  useEffect(() => {
      const pc = pcRef.current;
      if (pc && localStream) {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          
          const newVideoTrack = localStream.getVideoTracks()[0];
          
          if (videoSender && newVideoTrack) {
              videoSender.replaceTrack(newVideoTrack);
          } else if (newVideoTrack && senders.length === 0) {
             // If we had no tracks before, we might need renegotiation if we add one now.
             // But simpler to just add it.
             pc.addTrack(newVideoTrack, localStream);
          }
      }
  }, [localStream]);

  return { remoteStream };
};
