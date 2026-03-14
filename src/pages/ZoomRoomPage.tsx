import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare,
  Monitor, MonitorOff, Crown, Send, Bell, BellOff,
  Volume2, VolumeX, Plus, Trash2, Eye, Search, Copy,
  Users, Wifi, WifiOff, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rtdb, auth } from '../lib/firebase';
import { ref, set, remove, onValue, push, off, onDisconnect } from 'firebase/database';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Room {
  id: string; name: string; subject: string;
  hostName: string; hostId: string; createdAt: number;
  maxSeats: number; code: string;
}
interface Seat {
  userId: string; userName: string; joinedAt: number;
  micOn: boolean; camOn: boolean;
}
interface ChatMsg {
  id: string; text: string; userName: string;
  userId: string; timestamp: number; isViewer?: boolean;
}
interface Signal {
  type: 'offer' | 'answer' | 'ice';
  from: string; to: string;
  payload: any; timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_SEATS = 10;
const SUBJECTS = [
  'رياضيات','فيزياء','كيمياء','علوم طبيعية','فلسفة',
  'لغة عربية','لغة فرنسية','لغة إنجليزية','تاريخ وجغرافيا','اقتصاد وتسيير'
];
const COLORS = [
  '#7c3aed','#2563eb','#059669','#d97706',
  '#dc2626','#db2777','#0891b2','#65a30d',
];

// ─── Free TURN servers (always works) ────────────────────────────────────────
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:relay1.expressturn.com:3478',
      username: 'efGOPHUMBK84GGQO9U',
      credential: 'UvsBRiqgtpkHMqvU',
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
function getColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % COLORS.length;
  return COLORS[h];
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}
function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
}

// ─── Video Tile ───────────────────────────────────────────────────────────────
function VideoTile({
  seat, stream, isLocal, isSpeaking, isHost
}: {
  seat: Seat; stream: MediaStream | null; isLocal: boolean;
  isSpeaking: boolean; isHost: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Attach stream to video element
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (stream && seat.camOn) {
      // Check if stream has active video tracks
      const hasVideo = stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
      if (!hasVideo) { setVideoReady(false); return; }

      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }

      const onReady = () => {
        el.play().then(() => setVideoReady(true)).catch(() => setVideoReady(false));
      };

      if (el.readyState >= 2) {
        onReady();
      } else {
        el.addEventListener('loadedmetadata', onReady, { once: true });
        el.addEventListener('canplay', onReady, { once: true });
      }
    } else {
      setVideoReady(false);
      if (!seat.camOn) {
        // Don't clear srcObject — just hide video
      }
    }
  }, [stream, seat.camOn]);

  const color = getColor(seat.userId);

  return (
    <div className={`relative aspect-square rounded-xl overflow-hidden bg-gray-900 transition-all duration-300 ${
      isSpeaking
        ? 'ring-2 ring-green-400 shadow-lg shadow-green-400/40'
        : isLocal
        ? 'ring-2 ring-blue-500'
        : 'ring-1 ring-gray-700'
    }`}>
      {/* Avatar (always rendered, hidden when video active) */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${
          videoReady && seat.camOn ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ background: `linear-gradient(135deg, ${color}cc, ${color}88)` }}
      >
        <span className="text-white font-bold text-xl sm:text-2xl select-none drop-shadow">
          {initials(seat.userName)}
        </span>
        {isSpeaking && (
          <div className="flex gap-0.5 items-end h-3 mt-1">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="w-1 bg-green-400 rounded-full animate-pulse"
                style={{ height: `${30 + i * 25}%`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          videoReady && seat.camOn ? 'opacity-100' : 'opacity-0'
        } ${isLocal ? '[transform:scaleX(-1)]' : ''}`}
      />

      {/* Top badges */}
      <div className="absolute top-1 left-1 right-1 flex items-start justify-between">
        <div className="flex gap-0.5">
          {isHost && <span className="text-yellow-400 text-[10px]">👑</span>}
          {isLocal && (
            <span className="bg-blue-600/90 text-white text-[8px] px-1 py-0.5 rounded font-medium">
              أنت
            </span>
          )}
        </div>
        {isSpeaking && !isLocal && (
          <div className="flex gap-0.5 items-end h-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="w-0.5 bg-green-400 rounded animate-pulse"
                style={{ height: `${30 + i * 25}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom overlay: name + mic/cam status */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 py-1.5">
        <p className="text-white text-[9px] sm:text-[11px] font-semibold truncate leading-tight">
          {isLocal ? 'أنت' : seat.userName}
        </p>
        <div className="flex gap-1 mt-0.5">
          {!seat.micOn && <MicOff size={8} className="text-red-400" />}
          {!seat.camOn && <VideoOff size={8} className="text-red-400" />}
        </div>
      </div>
    </div>
  );
}

// ─── Empty Seat ───────────────────────────────────────────────────────────────
function EmptySeat({ num, onJoin, canJoin }: { num: number; onJoin: () => void; canJoin: boolean }) {
  return (
    <button
      onClick={canJoin ? onJoin : undefined}
      className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
        canJoin
          ? 'border-gray-600 bg-gray-800/40 hover:border-blue-500 hover:bg-blue-500/10 active:scale-95 cursor-pointer'
          : 'border-gray-800 bg-gray-900/20 cursor-default'
      }`}
    >
      {canJoin ? (
        <>
          <Plus size={12} className="text-gray-500" />
          <span className="text-gray-500 text-[9px]">{num}</span>
        </>
      ) : (
        <span className="text-gray-700 text-[9px]">{num}</span>
      )}
    </button>
  );
}

// ─── Remote Audio ─────────────────────────────────────────────────────────────
function RemoteAudio({ stream, muted }: { stream: MediaStream; muted: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    ref.current.muted = muted;
    ref.current.play().catch(() => {});
  }, [stream, muted]);
  return <audio ref={ref} autoPlay playsInline style={{ display: 'none' }} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ZoomRoomPage() {
  const { user, userProfile } = useApp();

  // Lobby
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [foundRoom, setFoundRoom] = useState<Room | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState(SUBJECTS[0]);
  const [creating, setCreating] = useState(false);
  const [notifMuted, setNotifMuted] = useState(false);
  const [newRoomNotif, setNewRoomNotif] = useState<Room | null>(null);
  const [rtdbOnline, setRtdbOnline] = useState(true);

  // Room
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [seats, setSeats] = useState<Record<string, Seat>>({});
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatText, setChatText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isViewer, setIsViewer] = useState(false);
  const [joinDialog, setJoinDialog] = useState<Room | null>(null);
  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({});
  const [speakerOn, setSpeakerOn] = useState(true);

  // Media
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // WebRTC
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const iceQueuesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const activeRoomRef = useRef<Room | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const uid = user?.uid || '';
  const uname = userProfile?.name || user?.email?.split('@')[0] || 'تلميذ';

  // Keep activeRoom in ref for callbacks
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  // ── RTDB online monitor ───────────────────────────────────────────────────
  useEffect(() => {
    const r = ref(rtdb, '.info/connected');
    const unsub = onValue(r, s => setRtdbOnline(!!s.val()));
    return () => off(r);
  }, []);

  // ── My rooms ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const r = ref(rtdb, 'zoom_rooms');
    const unsub = onValue(r, snap => {
      const data = snap.val() || {};
      const arr: Room[] = Object.entries(data)
        .filter(([, v]: any) => v.hostId === uid)
        .map(([id, v]: any) => ({ id, ...v }))
        .sort((a: Room, b: Room) => b.createdAt - a.createdAt);
      setRooms(arr);
    });
    return () => off(r);
  }, [uid]);

  // ── New room notifications ────────────────────────────────────────────────
  useEffect(() => {
    if (!uid || notifMuted) return;
    const r = ref(rtdb, 'zoom_notifications/latest');
    const unsub = onValue(r, snap => {
      const data = snap.val();
      if (!data || data.hostId === uid) return;
      if (Date.now() - data.timestamp > 15000) return;
      setNewRoomNotif(data);
      setTimeout(() => setNewRoomNotif(null), 8000);
    });
    return () => off(r);
  }, [uid, notifMuted]);

  // ── Scroll chat ───────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  // ── Unread count ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showChat && activeRoom) setUnread(p => p + 1);
  }, [chatMsgs.length]);

  // ── Voice Activity Detection ──────────────────────────────────────────────
  useEffect(() => {
    if (!localStreamState || isViewer) return;
    let ctx: AudioContext | null = null;
    let frame = 0;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(localStreamState);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setSpeakingMap(p => ({ ...p, [uid]: avg > 15 && micOn }));
        frame = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
    return () => {
      cancelAnimationFrame(frame);
      ctx?.close().catch(() => {});
    };
  }, [localStreamState, isViewer, micOn, uid]);

  // ─── Create Peer Connection ───────────────────────────────────────────────
  const createPC = useCallback((peerId: string, roomId: string): RTCPeerConnection => {
    // Close existing
    if (pcsRef.current[peerId]) {
      pcsRef.current[peerId].close();
      delete pcsRef.current[peerId];
    }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcsRef.current[peerId] = pc;
    iceQueuesRef.current[peerId] = [];

    // Add all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Remote stream
    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      console.log('🎬 ontrack from', peerId, e.track.kind);
      // Add track to remote stream
      if (!remoteStream.getTrackById(e.track.id)) {
        remoteStream.addTrack(e.track);
      }
      // Also add from streams[0] if available
      if (e.streams && e.streams[0]) {
        e.streams[0].getTracks().forEach(t => {
          if (!remoteStream.getTrackById(t.id)) remoteStream.addTrack(t);
        });
      }
      setRemoteStreams(prev => ({ ...prev, [peerId]: remoteStream }));
    };

    // ICE candidates
    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        const r = push(ref(rtdb, `zoom_rooms/${roomId}/signals/${peerId}`));
        await set(r, {
          type: 'ice', from: uid, to: peerId,
          payload: e.candidate.toJSON(), timestamp: Date.now()
        }).catch(() => {});
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🔗 ICE state with', peerId, ':', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.log('🔄 Restarting ICE...');
        pc.restartIce();
      }
      if (pc.iceConnectionState === 'closed') {
        delete pcsRef.current[peerId];
        setRemoteStreams(prev => { const n = { ...prev }; delete n[peerId]; return n; });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state with', peerId, ':', pc.connectionState);
      if (pc.connectionState === 'connected') {
        toast.success(`✅ متصل بـ ${peerId.substring(0, 6)}...`, { duration: 2000 });
      }
    };

    return pc;
  }, [uid]);

  // ─── Handle Incoming Signal ────────────────────────────────────────────────
  const handleSignal = useCallback(async (sig: Signal, roomId: string) => {
    if (sig.to !== uid) return;
    const peerId = sig.from;
    console.log('📨 Signal:', sig.type, 'from', peerId);

    if (sig.type === 'offer') {
      const pc = createPC(peerId, roomId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
        // Flush ICE queue
        const q = iceQueuesRef.current[peerId] || [];
        for (const c of q) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceQueuesRef.current[peerId] = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const r = push(ref(rtdb, `zoom_rooms/${roomId}/signals/${peerId}`));
        await set(r, {
          type: 'answer', from: uid, to: peerId,
          payload: { type: answer.type, sdp: answer.sdp }, timestamp: Date.now()
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }

    } else if (sig.type === 'answer') {
      const pc = pcsRef.current[peerId];
      if (!pc) return;
      if (pc.signalingState !== 'have-local-offer') return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
        // Flush ICE queue
        const q = iceQueuesRef.current[peerId] || [];
        for (const c of q) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceQueuesRef.current[peerId] = [];
      } catch (err) {
        console.error('Error handling answer:', err);
      }

    } else if (sig.type === 'ice') {
      const pc = pcsRef.current[peerId];
      if (!pc) return;
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(sig.payload)).catch(() => {});
      } else {
        if (!iceQueuesRef.current[peerId]) iceQueuesRef.current[peerId] = [];
        iceQueuesRef.current[peerId].push(sig.payload);
      }
    }
  }, [uid, createPC]);

  // ─── Initiate Call to Peer ─────────────────────────────────────────────────
  const callPeer = useCallback(async (peerId: string, roomId: string) => {
    console.log('📞 Calling peer:', peerId);
    const pc = createPC(peerId, roomId);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      const r = push(ref(rtdb, `zoom_rooms/${roomId}/signals/${peerId}`));
      await set(r, {
        type: 'offer', from: uid, to: peerId,
        payload: { type: offer.type, sdp: offer.sdp }, timestamp: Date.now()
      });
    } catch (err) {
      console.error('Error calling peer:', err);
    }
  }, [uid, createPC]);

  // ─── Enter Room ────────────────────────────────────────────────────────────
  const enterRoom = useCallback(async (room: Room, asViewer: boolean) => {
    setActiveRoom(room);
    setIsViewer(asViewer);
    setJoinDialog(null);
    setChatMsgs([]);
    setSeats({});
    setRemoteStreams({});
    setUnread(0);
    setShowChat(false);

    // Get media
    if (!asViewer) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
        });
        localStreamRef.current = stream;
        setLocalStreamState(stream);
        setMicOn(true);
        setCamOn(true);
        toast.success('✅ الكاميرا والميكروفون جاهزان');
      } catch (videoErr) {
        console.warn('Video failed, trying audio only:', videoErr);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true }
          });
          localStreamRef.current = stream;
          setLocalStreamState(stream);
          setCamOn(false);
          toast('🎙️ صوت فقط — لا يمكن الوصول للكاميرا', { icon: '⚠️' });
        } catch (audioErr) {
          console.error('Audio also failed:', audioErr);
          toast.error('❌ لا يمكن الوصول للكاميرا أو الميكروفون\nيرجى السماح من إعدادات المتصفح');
        }
      }

      // Register seat
      const seatRef = ref(rtdb, `zoom_rooms/${room.id}/seats/${uid}`);
      const seat: Seat = {
        userId: uid, userName: uname,
        joinedAt: Date.now(), micOn: true, camOn: true
      };
      await set(seatRef, seat).catch(console.error);
      onDisconnect(seatRef).remove();
    } else {
      // Viewer
      const viewRef = ref(rtdb, `zoom_rooms/${room.id}/viewers/${uid}`);
      await set(viewRef, { userId: uid, userName: uname, joinedAt: Date.now() }).catch(console.error);
      onDisconnect(viewRef).remove();
    }

    // Listen to seats → call new peers
    const seatsRef = ref(rtdb, `zoom_rooms/${room.id}/seats`);
    onValue(seatsRef, snap => {
      const data: Record<string, Seat> = snap.val() || {};
      setSeats(data);

      if (!asViewer && localStreamRef.current) {
        Object.keys(data).forEach(peerId => {
          if (peerId !== uid && !pcsRef.current[peerId]) {
            // Small delay to ensure both sides are ready
            setTimeout(() => callPeer(peerId, room.id), 800);
          }
        });
      }
    });

    // Listen to signals
    if (!asViewer) {
      const sigRef = ref(rtdb, `zoom_rooms/${room.id}/signals/${uid}`);
      onValue(sigRef, async snap => {
        const data = snap.val();
        if (!data) return;
        for (const [sigId, sig] of Object.entries(data) as [string, Signal][]) {
          await handleSignal(sig, room.id);
          remove(ref(rtdb, `zoom_rooms/${room.id}/signals/${uid}/${sigId}`)).catch(() => {});
        }
      });
    }

    // Listen to chat
    const chatRef = ref(rtdb, `zoom_rooms/${room.id}/chat`);
    onValue(chatRef, snap => {
      const data = snap.val() || {};
      const msgs: ChatMsg[] = Object.entries(data)
        .map(([id, v]: any) => ({ id, ...v }))
        .sort((a, b) => a.timestamp - b.timestamp);
      setChatMsgs(msgs);
    });

  }, [uid, uname, callPeer, handleSignal]);

  // ─── Leave Room ────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    const room = activeRoomRef.current;
    if (!room) return;

    // Stop all media
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStreamState(null);
    setScreenOn(false);

    // Close WebRTC
    Object.values(pcsRef.current).forEach(pc => pc.close());
    pcsRef.current = {};
    iceQueuesRef.current = {};
    setRemoteStreams({});

    // Firebase cleanup
    try {
      if (!isViewer) {
        await remove(ref(rtdb, `zoom_rooms/${room.id}/seats/${uid}`));
      } else {
        await remove(ref(rtdb, `zoom_rooms/${room.id}/viewers/${uid}`));
      }
    } catch {}

    off(ref(rtdb, `zoom_rooms/${room.id}/seats`));
    off(ref(rtdb, `zoom_rooms/${room.id}/chat`));
    off(ref(rtdb, `zoom_rooms/${room.id}/signals/${uid}`));

    setActiveRoom(null);
    setSeats({});
    setChatMsgs([]);
    setSpeakingMap({});
    setMicOn(true);
    setCamOn(true);
    setShowChat(false);
    setUnread(0);
  }, [isViewer, uid]);

  // ─── Create Room ───────────────────────────────────────────────────────────
  const createRoom = async () => {
    if (!newName.trim() || !uid) return;
    setCreating(true);
    try {
      if (!auth.currentUser) { toast.error('يجب تسجيل الدخول'); setCreating(false); return; }
      const roomId = push(ref(rtdb, 'zoom_rooms')).key!;
      const code = genCode();
      const room: Room = {
        id: roomId, name: newName.trim(), subject: newSubject,
        hostId: uid, hostName: uname, createdAt: Date.now(),
        maxSeats: MAX_SEATS, code
      };
      await set(ref(rtdb, `zoom_rooms/${roomId}`), room);
      await set(ref(rtdb, 'zoom_notifications/latest'), { ...room, timestamp: Date.now() });
      toast.success(`✅ الغرفة جاهزة! الكود: ${code}`);
      setShowCreate(false);
      setNewName('');
      enterRoom(room, false);
    } catch (e: any) {
      toast.error(`فشل: ${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  // ─── Search Room ───────────────────────────────────────────────────────────
  const searchRoom = () => {
    if (!searchCode.trim()) return;
    const r = ref(rtdb, 'zoom_rooms');
    onValue(r, snap => {
      const data = snap.val() || {};
      const found = Object.entries(data).find(
        ([, v]: any) => v.code === searchCode.trim().toUpperCase()
      );
      if (found) {
        setFoundRoom({ id: found[0], ...(found[1] as any) });
      } else {
        toast.error('❌ لا توجد غرفة بهذا الكود');
        setFoundRoom(null);
      }
    }, { onlyOnce: true });
  };

  // ─── Toggle Mic ────────────────────────────────────────────────────────────
  const toggleMic = async () => {
    if (!localStreamRef.current || !activeRoom) return;
    const next = !micOn;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicOn(next);
    await set(ref(rtdb, `zoom_rooms/${activeRoom.id}/seats/${uid}/micOn`), next).catch(() => {});
  };

  // ─── Toggle Cam ────────────────────────────────────────────────────────────
  const toggleCam = async () => {
    if (!localStreamRef.current || !activeRoom) return;
    const next = !camOn;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = next; });
    setCamOn(next);
    await set(ref(rtdb, `zoom_rooms/${activeRoom.id}/seats/${uid}/camOn`), next).catch(() => {});
  };

  // ─── Toggle Screen ─────────────────────────────────────────────────────────
  const toggleScreen = async () => {
    if (!activeRoom) return;
    if (!screenOn) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        Object.values(pcsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(track).catch(() => {});
        });
        setScreenOn(true);
        track.onended = () => stopScreen();
      } catch { toast.error('فشل مشاركة الشاشة'); }
    } else stopScreen();
  };

  const stopScreen = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    const vid = localStreamRef.current?.getVideoTracks()[0];
    if (vid) {
      Object.values(pcsRef.current).forEach(pc => {
        const s = pc.getSenders().find(s => s.track?.kind === 'video');
        if (s) s.replaceTrack(vid).catch(() => {});
      });
    }
    setScreenOn(false);
  };

  // ─── Delete Room ───────────────────────────────────────────────────────────
  const deleteRoom = async (roomId: string) => {
    try {
      await remove(ref(rtdb, `zoom_rooms/${roomId}`));
      toast.success('تم حذف الغرفة');
      if (activeRoom?.id === roomId) leaveRoom();
    } catch { toast.error('فشل الحذف'); }
  };

  // ─── Send Chat ─────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatText.trim() || !activeRoom) return;
    const r = push(ref(rtdb, `zoom_rooms/${activeRoom.id}/chat`));
    await set(r, {
      text: chatText.trim(), userId: uid, userName: uname,
      timestamp: Date.now(), isViewer
    }).catch(() => {});
    setChatText('');
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const seatsList = Object.values(seats);
  const seatCount = seatsList.length;
  const canJoin = !isViewer && !seats[uid] && seatCount < MAX_SEATS;
  const isInSeat = !!seats[uid];

  // ══════════════════════════════════════════════════════════════════════════
  // ── ROOM VIEW ─────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (activeRoom) {
    const emptySeats = MAX_SEATS - seatCount;

    return (
      <div className="flex flex-col h-screen bg-[#0a0a12] text-white overflow-hidden">
        {/* Hidden remote audio elements */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <RemoteAudio key={peerId} stream={stream} muted={!speakerOn} />
        ))}

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#12121e] border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{activeRoom.name}</p>
              <p className="text-gray-400 text-[10px]">{activeRoom.subject} • كود: {activeRoom.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isViewer && (
              <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Eye size={10} /> مشاهد
              </span>
            )}
            <span className="text-gray-400 text-xs">{seatCount}/{MAX_SEATS}</span>
            <button
              onClick={() => { setShowChat(!showChat); setUnread(0); }}
              className="relative p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              <MessageSquare size={16} />
              {unread > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <button
              onClick={leaveRoom}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition"
            >
              <PhoneOff size={16} />
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Video area ── */}
          <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${showChat ? 'hidden sm:flex' : 'flex'}`}>

            {/* Seats grid — all 10 visible, no scroll */}
            <div className="flex-1 p-2 sm:p-3 overflow-hidden">
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 h-full max-h-full" style={{ gridTemplateRows: 'repeat(2, 1fr)' }}>
                {/* Filled seats */}
                {seatsList.map(seat => (
                  <VideoTile
                    key={seat.userId}
                    seat={seat}
                    stream={seat.userId === uid ? localStreamState : (remoteStreams[seat.userId] || null)}
                    isLocal={seat.userId === uid}
                    isSpeaking={!!speakingMap[seat.userId]}
                    isHost={seat.userId === activeRoom.hostId}
                  />
                ))}
                {/* Empty seats */}
                {Array.from({ length: emptySeats }).map((_, i) => (
                  <EmptySeat
                    key={`empty-${i}`}
                    num={seatCount + i + 1}
                    canJoin={canJoin && i === 0}
                    onJoin={() => enterRoom(activeRoom, false)}
                  />
                ))}
              </div>
            </div>

            {/* ── Controls bar ── */}
            <div className="flex-shrink-0 pb-safe">
              <div className="flex items-center justify-center gap-2 sm:gap-3 px-3 py-3 bg-[#12121e] border-t border-white/10">
                {/* Mic */}
                <button
                  onClick={isInSeat ? toggleMic : undefined}
                  disabled={!isInSeat}
                  className={`flex flex-col items-center gap-1 p-2.5 sm:p-3 rounded-xl min-w-[52px] transition-all active:scale-90 ${
                    !isInSeat ? 'opacity-30 cursor-not-allowed bg-white/5' :
                    micOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500/30 hover:bg-red-500/50'
                  }`}
                >
                  {micOn ? <Mic size={18} className="text-white" /> : <MicOff size={18} className="text-red-400" />}
                  <span className="text-[9px] text-gray-400">{micOn ? 'ميك' : 'مكتوم'}</span>
                </button>

                {/* Camera */}
                <button
                  onClick={isInSeat ? toggleCam : undefined}
                  disabled={!isInSeat}
                  className={`flex flex-col items-center gap-1 p-2.5 sm:p-3 rounded-xl min-w-[52px] transition-all active:scale-90 ${
                    !isInSeat ? 'opacity-30 cursor-not-allowed bg-white/5' :
                    camOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500/30 hover:bg-red-500/50'
                  }`}
                >
                  {camOn ? <Video size={18} className="text-white" /> : <VideoOff size={18} className="text-red-400" />}
                  <span className="text-[9px] text-gray-400">{camOn ? 'كاميرا' : 'مطفأة'}</span>
                </button>

                {/* Speaker */}
                <button
                  onClick={() => setSpeakerOn(p => !p)}
                  className={`flex flex-col items-center gap-1 p-2.5 sm:p-3 rounded-xl min-w-[52px] transition-all active:scale-90 ${
                    speakerOn ? 'bg-white/10 hover:bg-white/20' : 'bg-orange-500/30 hover:bg-orange-500/50'
                  }`}
                >
                  {speakerOn ? <Volume2 size={18} className="text-white" /> : <VolumeX size={18} className="text-orange-400" />}
                  <span className="text-[9px] text-gray-400">صوت</span>
                </button>

                {/* Screen share (desktop only) */}
                <button
                  onClick={isInSeat ? toggleScreen : undefined}
                  disabled={!isInSeat}
                  className={`hidden sm:flex flex-col items-center gap-1 p-2.5 sm:p-3 rounded-xl min-w-[52px] transition-all active:scale-90 ${
                    !isInSeat ? 'opacity-30 cursor-not-allowed bg-white/5' :
                    screenOn ? 'bg-green-500/30 hover:bg-green-500/50' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {screenOn ? <MonitorOff size={18} className="text-green-400" /> : <Monitor size={18} className="text-white" />}
                  <span className="text-[9px] text-gray-400">شاشة</span>
                </button>

                {/* Chat (mobile) */}
                <button
                  onClick={() => { setShowChat(true); setUnread(0); }}
                  className="flex sm:hidden flex-col items-center gap-1 p-2.5 rounded-xl min-w-[52px] bg-white/10 hover:bg-white/20 transition-all active:scale-90 relative"
                >
                  <MessageSquare size={18} className="text-white" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] flex items-center justify-center">{unread}</span>
                  )}
                  <span className="text-[9px] text-gray-400">دردشة</span>
                </button>

                {/* Viewer join button */}
                {isViewer && canJoin && (
                  <button
                    onClick={() => enterRoom(activeRoom, false)}
                    className="flex flex-col items-center gap-1 p-2.5 sm:p-3 rounded-xl min-w-[52px] bg-blue-600/30 hover:bg-blue-600/50 transition-all active:scale-90"
                  >
                    <Users size={18} className="text-blue-400" />
                    <span className="text-[9px] text-blue-300">انضم</span>
                  </button>
                )}

                {/* Leave */}
                <button
                  onClick={leaveRoom}
                  className="flex flex-col items-center gap-1 p-2.5 sm:p-3 rounded-xl min-w-[52px] bg-red-500/20 hover:bg-red-500/40 transition-all active:scale-90"
                >
                  <PhoneOff size={18} className="text-red-400" />
                  <span className="text-[9px] text-red-400">خروج</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Chat Panel ── */}
          {showChat && (
            <div className={`flex flex-col bg-[#0f0f1a] border-l border-white/10 ${
              showChat ? 'w-full sm:w-72 md:w-80' : ''
            }`}>
              {/* Chat header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 flex-shrink-0">
                <span className="text-white font-semibold text-sm">💬 الدردشة</span>
                <button onClick={() => setShowChat(false)} className="p-1 rounded-lg hover:bg-white/10 transition">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {chatMsgs.length === 0 && (
                  <div className="text-center text-gray-600 text-xs mt-8">
                    لا توجد رسائل بعد<br />كن أول من يكتب! 💬
                  </div>
                )}
                {chatMsgs.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.userId === uid ? 'flex-row-reverse' : ''}`}>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ background: getColor(msg.userId) }}
                    >
                      {initials(msg.userName)}
                    </div>
                    <div className={`max-w-[75%] ${msg.userId === uid ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[9px] text-gray-500">{fmtTime(msg.timestamp)}</span>
                        {msg.isViewer && <Eye size={8} className="text-blue-400" />}
                        <span className="text-[9px] text-gray-400 truncate max-w-[80px]">{msg.userName}</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-xl text-xs leading-relaxed ${
                        msg.userId === uid
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-[#1e1e2e] text-gray-200 rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 p-2.5 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Type..."
                    className="flex-1 bg-white/10 text-white text-xs px-3 py-2 rounded-xl border border-white/10 focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  />
                  <button
                    onClick={sendChat}
                    disabled={!chatText.trim()}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition active:scale-90"
                  >
                    <Send size={14} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── LOBBY ─────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* ── New Room Notification ── */}
      {newRoomNotif && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-sm bg-indigo-600 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-bounce">
          <Bell size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">🎥 غرفة جديدة!</p>
            <p className="text-xs text-indigo-200 truncate">{newRoomNotif.name} • {newRoomNotif.subject}</p>
            <p className="text-xs text-indigo-300 mt-1">الكود: <span className="font-mono font-bold">{newRoomNotif.code}</span></p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={() => setJoinDialog(newRoomNotif)}
              className="bg-white text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
            >
              انضم
            </button>
            <button onClick={() => setNewRoomNotif(null)} className="text-indigo-200 hover:text-white text-xs transition">
              لاحقاً
            </button>
          </div>
        </div>
      )}

      {/* ── Join Dialog ── */}
      {joinDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a2e] rounded-2xl sm:rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-white/10">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎥</div>
              <h3 className="text-white font-bold text-lg">{joinDialog.name}</h3>
              <p className="text-gray-400 text-sm mt-1">{joinDialog.subject} • بـ {joinDialog.hostName}</p>
              <div className="mt-3 bg-white/5 rounded-xl p-2">
                <p className="text-gray-300 text-xs">هل تريد الانضمام للبث؟</p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => enterRoom(joinDialog, false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Video size={18} /> نعم — انضم بالفيديو 📹
              </button>
              <button
                onClick={() => enterRoom(joinDialog, true)}
                className="w-full bg-white/10 hover:bg-white/20 text-gray-200 font-medium py-3 rounded-xl transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Eye size={18} /> مشاهدة فقط 👁️
              </button>
              <button
                onClick={() => setJoinDialog(null)}
                className="w-full text-gray-500 hover:text-gray-300 py-2 rounded-xl transition text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🎥 غرف الدراسة المباشرة
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            WebRTC • فيديو + صوت + شاشة داخل التطبيق
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
            rtdbOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {rtdbOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {rtdbOnline ? 'متصل' : 'غير متصل'}
          </div>
          <button
            onClick={() => setNotifMuted(p => !p)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title={notifMuted ? 'تشغيل الإشعارات' : 'كتم الإشعارات'}
          >
            {notifMuted ? <BellOff size={16} className="text-gray-400" /> : <Bell size={16} className="text-gray-600 dark:text-gray-300" />}
          </button>
        </div>
      </div>

      {/* ── Search by code ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-gray-700 dark:text-gray-200 font-semibold text-sm mb-3 flex items-center gap-2">
          <Search size={16} /> ادخل كود الغرفة للانضمام
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchCode}
            onChange={e => setSearchCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && searchRoom()}
            placeholder="مثال: ABC123"
            maxLength={6}
            className="flex-1 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 uppercase"
          />
          <button
            onClick={searchRoom}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition active:scale-95"
          >
            بحث
          </button>
        </div>

        {/* Found room card */}
        {foundRoom && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 dark:text-blue-200 font-bold text-sm">{foundRoom.name}</p>
                <p className="text-blue-600 dark:text-blue-400 text-xs">{foundRoom.subject} • {foundRoom.hostName}</p>
                <p className="text-blue-500 text-xs font-mono mt-0.5">🔑 {foundRoom.code}</p>
              </div>
              <button
                onClick={() => setJoinDialog(foundRoom)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition active:scale-95"
              >
                دخول
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Room Button ── */}
      <div className="mb-6">
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-2xl font-semibold shadow-lg shadow-violet-500/30 transition-all active:scale-95"
          >
            <Plus size={20} /> إنشاء غرفة جديدة 🎥
          </button>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-gray-900 dark:text-white font-bold mb-4 flex items-center gap-2">
              <Video size={18} className="text-violet-500" /> إنشاء غرفة مباشرة
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="اسم الغرفة (مثال: مراجعة الرياضيات)"
                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
              <select
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-xs text-violet-700 dark:text-violet-300">
                🎥 مكالمة WebRTC مباشرة • فيديو + صوت + شاشة + دردشة • {MAX_SEATS} مقاعد
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createRoom}
                  disabled={creating || !newName.trim()}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الإنشاء...</>
                  ) : (
                    <><Video size={16} /> إنشاء وبدء البث</>
                  )}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── My Rooms ── */}
      {rooms.length > 0 && (
        <div>
          <h2 className="text-gray-700 dark:text-gray-300 font-semibold text-sm mb-3 flex items-center gap-2">
            <Crown size={14} className="text-yellow-500" /> غرفي ({rooms.length})
          </h2>
          <div className="grid gap-3">
            {rooms.map(room => (
              <div key={room.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-gray-900 dark:text-white font-bold text-sm truncate">{room.name}</h3>
                      <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] px-2 py-0.5 rounded-full">{room.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <button
                        onClick={() => { navigator.clipboard.writeText(room.code); toast.success('تم نسخ الكود!'); }}
                        className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2.5 py-1 rounded-lg transition group"
                      >
                        <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200 tracking-widest">{room.code}</span>
                        <Copy size={10} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                      </button>
                      <span className="text-[10px] text-gray-400">{new Date(room.createdAt).toLocaleDateString('ar-DZ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setJoinDialog(room)}
                      className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-medium transition active:scale-95 flex items-center gap-1.5"
                    >
                      <Video size={13} /> دخول
                    </button>
                    <button
                      onClick={() => deleteRoom(room.id)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 rounded-xl transition active:scale-95"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {rooms.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <div className="text-5xl mb-4">🎥</div>
          <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">لا توجد غرف بعد</p>
          <p className="text-sm">أنشئ غرفة وشارك الكود مع زملائك</p>
        </div>
      )}

      {/* How it works */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: '🔑', title: 'كود خاص', desc: 'كل غرفة لها كود سري — شاركه مع من تريد فقط' },
          { icon: '🎥', title: 'WebRTC مباشر', desc: 'فيديو + صوت P2P مشفر بدون خادم وسيط' },
          { icon: '👁️', title: 'وضع المشاهدة', desc: 'شاهد وتفاعل بالدردشة بدون مقعد' },
          { icon: '🪑', title: '10 مقاعد', desc: 'يُحجز ويُحرَّر تلقائياً عند الانقطاع' },
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl mb-2">{item.icon}</div>
            <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm mb-1">{item.title}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
