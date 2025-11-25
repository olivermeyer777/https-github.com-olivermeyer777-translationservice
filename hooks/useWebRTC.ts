
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
      if (msg.type !== 'WEBRTC_SIGNAL' || msg.senderRole === userRole) return;
      
      const { signal } = msg;

      // Create PC if it doesn't exist (Customer created it eagerly, Agent creates it lazily upon Offer)
      const pc = pcRef.current || createPeerConnection();

      try {
        if (signal.type === 'OFFER') {
          console.log("WebRTC: Received Offer");
          if (pc.signalingState !== 'stable') {
              // If we are already negotiating, ignore or reset. For simple p2p, we can ignore collision for now or reset.
              console.warn("WebRTC: Received offer while not stable. Ignoring for collision.");
              // return; // Simple collision handling: if I'm Agent and I receive Offer, I accept.
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          // Ensure we send our video back!
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
          try {
             await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch(e) {
              // Candidate might arrive before remote description, which is fine to fail in strict mode or just queue
          }
        }
      } catch (err) {
        console.error("WebRTC Signaling Error", err);
      }
    };

    const cleanup = signaling.subscribe(handleSignal);
    return cleanup;
  }, [userRole, createPeerConnection, localStream]);

  // Initiate Offer (Only Customer)
  useEffect(() => {
    if (isConnectedToRoom && isInitiator && !hasNegotiatedRef.current && localStream) {
      const startCall = async () => {
        // Double check we haven't started
        if (pcRef.current && pcRef.current.signalingState !== 'stable') return;

        const pc = createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log("WebRTC: Sending Offer");
        signaling.send({
          type: 'WEBRTC_SIGNAL',
          senderRole: userRole,
          signal: { type: 'OFFER', sdp: offer }
        });
        hasNegotiatedRef.current = true;
      };
      
      // Delay slightly to let socket/room settle
      const timer = setTimeout(startCall, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnectedToRoom, isInitiator, createPeerConnection, localStream]);

  // Handle Local Stream replacements (e.g. changing camera)
  useEffect(() => {
      const pc = pcRef.current;
      if (pc && localStream) {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          const newVideoTrack = localStream.getVideoTracks()[0];
          
          if (videoSender && newVideoTrack && videoSender.track?.id !== newVideoTrack.id) {
              console.log("WebRTC: Replacing Video Track");
              videoSender.replaceTrack(newVideoTrack).catch(err => console.error("Failed to replace track", err));
          } else if (newVideoTrack && senders.length === 0) {
              pc.addTrack(newVideoTrack, localStream);
          }
      }
  }, [localStream]);

  return { remoteStream };
};
