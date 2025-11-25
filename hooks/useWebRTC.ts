
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
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

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
      console.log("WebRTC: Received Remote Track", event.streams[0].id);
      setRemoteStream(event.streams[0]);
    };

    // Add local tracks if available immediately
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
            pc.addTrack(track, localStream);
        } catch(e) {
            console.warn("Error adding track to new PC", e);
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
          console.log("WebRTC: Partner joined, re-triggering offer");
          // Force a restart of negotiation if needed
          const pc = pcRef.current || createPeerConnection();
          // Only create offer if we are stable, otherwise we might be in middle of negotiation
          if (pc.signalingState === 'stable') {
               try {
                  const offer = await pc.createOffer({ iceRestart: true });
                  await pc.setLocalDescription(offer);
                  signaling.send({
                    type: 'WEBRTC_SIGNAL',
                    senderRole: userRole,
                    signal: { type: 'OFFER', sdp: offer }
                  });
               } catch (e) {
                   console.error("Error creating restart offer", e);
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
          // If collision, customer (initiator) wins.
          // For this simple demo, we just accept the offer if we are the agent.
          if (pc.signalingState !== 'stable') {
              console.warn("WebRTC: Signaling state not stable during offer:", pc.signalingState);
              // Rollback to accept new offer
              await Promise.all([
                  pc.setLocalDescription({ type: 'rollback' } as any),
                  pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
              ]);
          } else {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
          
          // Process queued candidates
          while (iceCandidatesQueue.current.length > 0) {
              const c = iceCandidatesQueue.current.shift();
              if (c) await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          
          // Ensure local tracks are added before answering so video is sent back
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
            // Process queued candidates
            while (iceCandidatesQueue.current.length > 0) {
                const c = iceCandidatesQueue.current.shift();
                if (c) await pc.addIceCandidate(new RTCIceCandidate(c));
            }
          }
        } 
        else if (signal.type === 'CANDIDATE') {
          if (pc.remoteDescription) {
             try {
               await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
             } catch (e) { console.warn("Error adding candidate", e); }
          } else {
             // Buffer candidate until remote description is set
             console.log("WebRTC: Buffering ICE Candidate");
             iceCandidatesQueue.current.push(signal.candidate);
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
        // Wait a brief moment for socket to be ready
        await new Promise(r => setTimeout(r, 1000));
        
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
      
      startCall();
    }
  }, [isConnectedToRoom, isInitiator, createPeerConnection, localStream]);

  // Handle Local Stream updates (mute/unmute video)
  useEffect(() => {
      const pc = pcRef.current;
      if (pc && localStream) {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          const newVideoTrack = localStream.getVideoTracks()[0];
          
          if (videoSender && newVideoTrack) {
              if (videoSender.track?.id !== newVideoTrack.id) {
                videoSender.replaceTrack(newVideoTrack).catch(err => console.error("Failed to replace track", err));
              }
          } else if (newVideoTrack && senders.length === 0) {
              pc.addTrack(newVideoTrack, localStream);
          }
      }
  }, [localStream]);

  return { remoteStream };
};
