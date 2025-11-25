
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
      
      const pc = pcRef.current || createPeerConnection();
      const { signal } = msg;

      try {
        if (signal.type === 'OFFER') {
          console.log("WebRTC: Received Offer");
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
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
  }, [userRole, createPeerConnection]);

  // Initiate Offer (Only if initiator and room is connected)
  useEffect(() => {
    if (isConnectedToRoom && isInitiator && !pcRef.current) {
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
      
      // Small delay to ensure other side is ready
      setTimeout(startCall, 1000);
    }
  }, [isConnectedToRoom, isInitiator, createPeerConnection, userRole]);

  // Update tracks if local stream changes
  useEffect(() => {
      const pc = pcRef.current;
      if (pc && localStream) {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          const audioSender = senders.find(s => s.track?.kind === 'audio');
          
          const newVideoTrack = localStream.getVideoTracks()[0];
          // We don't send audio via WebRTC in this app (Audio goes via Gemini), 
          // but we send video.
          
          if (videoSender && newVideoTrack) {
              videoSender.replaceTrack(newVideoTrack);
          } else if (newVideoTrack) {
              pc.addTrack(newVideoTrack, localStream);
          }
      }
  }, [localStream]);

  return { remoteStream };
};
