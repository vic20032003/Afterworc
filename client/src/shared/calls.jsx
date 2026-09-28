/* Voice and video calls over WebRTC. Signaling runs through the WebSocket (/ws); media goes peer to peer (STUN/TURN from /api/rtc). */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { socket } from './socket.js';
import { api } from './api.js';
import { t } from './i18n.js';
import { Ic } from './icons.jsx';

const CallCtx = createContext(null);
export const useCalls = () => useContext(CallCtx);

let rtcConfig = null;
async function iceServers() {
  if (!rtcConfig) { try { rtcConfig = await api('/rtc'); } catch { rtcConfig = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] }; } }
  return rtcConfig;
}

/* A soft two-tone ring made with WebAudio, so no audio file is needed. */
function ringer() {
  let ctx = null, timer = null;
  const beep = () => {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25].forEach((d, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = i ? 660 : 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d + 0.22);
        o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.24);
      });
    } catch { /* audio blocked */ }
  };
  return { start() { beep(); timer = setInterval(beep, 2200); }, stop() { clearInterval(timer); timer = null; try { ctx && ctx.close(); } catch { /* closed */ } ctx = null; } };
}

/* Clickable demo (no server, no camera, no WebRTC): a generated picture and silent audio stand in for the media. */
const DEMO = () => !!window.__AW_DEMO;
function fakeStream(label, video) {
  const stream = new MediaStream();
  try { const ac = new (window.AudioContext || window.webkitAudioContext)(); stream.addTrack(ac.createMediaStreamDestination().stream.getAudioTracks()[0]); } catch { /* no audio */ }
  if (video) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 360; const g = c.getContext('2d'); const t0 = Date.now();
    const draw = () => { const t = (Date.now() - t0) / 1000; const grd = g.createLinearGradient(0, 0, 640, 360); grd.addColorStop(0, '#065132'); grd.addColorStop(1, `hsl(${140 + 20 * Math.sin(t)},45%,${22 + 6 * Math.sin(t / 2)}%)`);
      g.fillStyle = grd; g.fillRect(0, 0, 640, 360); g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '600 34px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(label, 320, 190); g.font = '16px Inter, sans-serif'; g.fillText('demo video', 320, 222);
      if (stream.active) requestAnimationFrame(draw); };
    draw();
    if (c.captureStream) c.captureStream(20).getVideoTracks().forEach(tr => stream.addTrack(tr));
  }
  return stream;
}

const Avatar = ({ who, cls = '' }) => <span className={'avatar ' + cls}>{who && who.avatar ? <img src={who.avatar} alt="" /> : (who && who.initials) || '•'}</span>;

export function CallProvider({ children, toast }) {
  const [call, setCall] = useState(null); // { id, threadId, kind, dir: 'out'|'in', state: 'calling'|'ringing'|'connecting'|'active', peer, startedAt }
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pc = useRef(null), local = useRef(null), remoteStream = useRef(null), pendingIce = useRef([]), callRef = useRef(null), ring = useRef(ringer());
  const localVideo = useRef(null), remoteVideo = useRef(null), remoteAudio = useRef(null);
  callRef.current = call;

  const cleanup = useCallback(() => {
    ring.current.stop();
    try { pc.current && pc.current.close(); } catch { /* closed */ }
    pc.current = null; pendingIce.current = [];
    if (local.current) local.current.getTracks().forEach(tr => tr.stop());
    if (remoteStream.current) remoteStream.current.getTracks().forEach(tr => tr.stop());
    local.current = null; remoteStream.current = null;
    setCall(null); setMuted(false); setCamOff(false); setMinimized(false);
  }, []);

  const getMedia = async kind => {
    if (DEMO()) return fakeStream('You', kind === 'video');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error(t('Calls need a secure (https) connection and a browser with camera and microphone support.'));
    try { return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: kind === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false }); }
    catch (e) {
      if (kind === 'video') { try { return await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { /* fall through */ } }
      throw new Error(e && e.name === 'NotAllowedError' ? t('Allow access to the microphone (and camera) in your browser to make calls.') : t('No microphone was found.'));
    }
  };

  const makePc = async callId => {
    const p = new RTCPeerConnection(await iceServers());
    pc.current = p;
    remoteStream.current = new MediaStream();
    p.ontrack = e => { e.streams[0] ? e.streams[0].getTracks().forEach(tr => remoteStream.current.addTrack(tr)) : remoteStream.current.addTrack(e.track); attach(); };
    p.onicecandidate = e => { if (e.candidate) socket.send({ t: 'call:signal', callId, data: { ice: e.candidate.toJSON() } }); };
    p.onconnectionstatechange = () => {
      if (p.connectionState === 'connected') setCall(c => c && { ...c, state: 'active', startedAt: c.startedAt || Date.now() });
      if (p.connectionState === 'failed') { toast && toast(t('The connection failed. Check your network and try again.'), true); hangup(); }
    };
    if (local.current) local.current.getTracks().forEach(tr => p.addTrack(tr, local.current));
    return p;
  };
  const attach = () => {
    if (remoteVideo.current && remoteStream.current && remoteVideo.current.srcObject !== remoteStream.current) remoteVideo.current.srcObject = remoteStream.current;
    if (remoteAudio.current && remoteStream.current && remoteAudio.current.srcObject !== remoteStream.current) remoteAudio.current.srcObject = remoteStream.current;
    if (localVideo.current && local.current && localVideo.current.srcObject !== local.current) localVideo.current.srcObject = local.current;
  };
  useEffect(attach);

  const flushIce = async () => { const p = pc.current; if (!p || !p.remoteDescription) return; for (const c of pendingIce.current.splice(0)) { try { await p.addIceCandidate(c); } catch { /* stale */ } } };

  /** Start a call from a conversation. */
  const start = useCallback(async (threadId, kind, peer) => {
    if (callRef.current) return toast && toast(t('You are already in a call'), true);
    if (!socket.online) return toast && toast(t('You are offline. Calls need a live connection.'), true);
    try { local.current = await getMedia(kind); } catch (e) { return toast && toast(e.message, true); }
    setCamOff(kind === 'video' && !local.current.getVideoTracks().length);
    setCall({ id: null, threadId: String(threadId), kind, dir: 'out', state: 'calling', peer });
    socket.send({ t: 'call:start', threadId, kind });
  }, [toast]);

  const accept = useCallback(async () => {
    const c = callRef.current; if (!c || c.dir !== 'in') return;
    ring.current.stop();
    try { local.current = await getMedia(c.kind); } catch (e) { toast && toast(e.message, true); socket.send({ t: 'call:decline', callId: c.id }); return cleanup(); }
    setCall({ ...c, state: 'connecting' });
    await makePc(c.id);
    socket.send({ t: 'call:accept', callId: c.id });
  }, [toast, cleanup]);

  const decline = useCallback(() => { const c = callRef.current; if (c) socket.send({ t: 'call:decline', callId: c.id }); cleanup(); }, [cleanup]);
  const hangup = useCallback(() => { const c = callRef.current; if (c && c.id) socket.send({ t: 'call:end', callId: c.id }); cleanup(); }, [cleanup]);

  const toggleMute = () => { const a = local.current && local.current.getAudioTracks()[0]; if (a) { a.enabled = !a.enabled; setMuted(!a.enabled); } };
  const toggleCam = () => { const v = local.current && local.current.getVideoTracks()[0]; if (v) { v.enabled = !v.enabled; setCamOff(!v.enabled); } };

  useEffect(() => socket.on(async m => {
    const c = callRef.current;
    if (m.t === 'call:ring') {
      if (c) { socket.send({ t: 'call:decline', callId: m.callId }); return; } // busy
      setCall({ id: m.callId, threadId: String(m.threadId), kind: m.kind, dir: 'in', state: 'ringing', peer: m.from, mode: m.mode });
      ring.current.start();
      return;
    }
    if (m.t === 'call:started' && c && c.dir === 'out' && !c.id) {
      setCall({ ...c, id: m.callId, state: 'calling', reachable: m.reachable });
      if (!m.reachable) toast && toast(t('They are not online right now. We keep ringing for 45 seconds.'));
      return;
    }
    if (m.t === 'call:error') { toast && toast(t(m.error), true); cleanup(); return; }
    if (!c || m.callId !== c.id) return;
    if (m.t === 'call:taken' && c.dir === 'in' && c.state === 'ringing') { cleanup(); return; }
    if (m.t === 'call:accepted' && c.dir === 'out' && DEMO()) {
      remoteStream.current = fakeStream((c.peer && c.peer.name) || 'AfterWorc', c.kind === 'video');
      setCall({ ...c, state: 'active', startedAt: Date.now() });
      return;
    }
    if (m.t === 'call:accepted' && c.dir === 'out') {
      setCall({ ...c, state: 'connecting' });
      const p = await makePc(c.id);
      const offer = await p.createOffer();
      await p.setLocalDescription(offer);
      socket.send({ t: 'call:signal', callId: c.id, data: { sdp: p.localDescription } });
      return;
    }
    if (m.t === 'call:signal' && pc.current) {
      const p = pc.current, d = m.data || {};
      if (d.sdp) {
        await p.setRemoteDescription(d.sdp);
        if (d.sdp.type === 'offer') { const ans = await p.createAnswer(); await p.setLocalDescription(ans); socket.send({ t: 'call:signal', callId: c.id, data: { sdp: p.localDescription } }); }
        await flushIce();
      } else if (d.ice) {
        if (p.remoteDescription) { try { await p.addIceCandidate(d.ice); } catch { /* stale */ } } else pendingIce.current.push(d.ice);
      }
      return;
    }
    if (m.t === 'call:ended') {
      const msg = { declined: t('The call was declined'), missed: c.dir === 'out' ? t('No answer') : t('Missed call'), gone: t('The call has ended') }[m.reason] || t('Call ended');
      toast && toast(msg);
      cleanup();
    }
  }), [toast, cleanup]);

  useEffect(() => { if (call && call.state === 'active') { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); } }, [call && call.state]);
  useEffect(() => () => cleanup(), [cleanup]);

  const dur = call && call.startedAt ? Math.max(0, Math.floor((now - call.startedAt) / 1000)) : 0;
  const clock = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
  const video = call && call.kind === 'video';
  const stateText = !call ? '' : call.state === 'calling' ? t('Calling…') : call.state === 'ringing' ? (video ? t('Incoming video call') : t('Incoming voice call')) : call.state === 'connecting' ? t('Connecting…') : clock;

  return (
    <CallCtx.Provider value={{ call, start }}>
      {children}
      {call && call.dir === 'in' && call.state === 'ringing' && (
        <div className="ring" role="alertdialog" aria-label={stateText}>
          <Avatar who={call.peer} />
          <div className="grow"><b>{call.peer && call.peer.name}</b><div className="muted small">{stateText}</div></div>
          <button className="cbtn red" style={{ width: 46, height: 46 }} onClick={decline} aria-label={t('Decline')}><Ic n="hang" s={20} /></button>
          <button className="cbtn green" style={{ width: 46, height: 46 }} onClick={accept} aria-label={t('Answer')}><Ic n={video ? 'video' : 'phone'} s={20} /></button>
        </div>
      )}
      {call && !(call.dir === 'in' && call.state === 'ringing') && minimized && (
        <div className="callmini"><Ic n={video ? 'video' : 'phone'} s={16} /><span>{call.peer && call.peer.name} · {stateText}</span>
          <button className="btn sm" onClick={() => setMinimized(false)}>{t('Open')}</button>
          <button className="cbtn red" style={{ width: 34, height: 34 }} onClick={hangup} aria-label={t('Hang up')}><Ic n="hang" s={16} /></button></div>
      )}
      {call && !(call.dir === 'in' && call.state === 'ringing') && (
        <div className="callbox" role="dialog" aria-label={t('Call')} style={{ display: minimized ? 'none' : 'flex' }}>
          <div className="row between" style={{ padding: '14px 16px' }}>
            <span className="small" style={{ color: '#b5c7bd' }}><Ic n="lock" s={14} /> {t('Encrypted connection')}</span>
            <button className="btn ghost sm" style={{ background: 'transparent', color: '#e7f0eb', borderColor: '#ffffff33' }} onClick={() => setMinimized(true)}>{t('Minimise')}</button>
          </div>
          <div className="stage">
            <audio ref={remoteAudio} autoPlay />
            {video && <video ref={remoteVideo} className="remote" autoPlay playsInline muted style={{ display: call.state === 'active' ? 'block' : 'none' }} />}
            {(!video || call.state !== 'active') && (
              <div className="who"><Avatar who={call.peer} /><h2>{call.peer && call.peer.name}</h2><p>{stateText}</p></div>
            )}
            {video && call.state === 'active' && <div style={{ position: 'absolute', left: 16, top: 8, color: '#fff', fontWeight: 600 }}>{call.peer && call.peer.name} · {clock}</div>}
            {video && !camOff && <video ref={localVideo} className="local" autoPlay playsInline muted />}
          </div>
          <div className="bar">
            <button className={'cbtn ' + (muted ? 'off' : '')} onClick={toggleMute} aria-pressed={muted} aria-label={muted ? t('Unmute') : t('Mute')} title={muted ? t('Unmute') : t('Mute')}><Ic n={muted ? 'micoff' : 'mic'} s={22} /></button>
            {video && <button className={'cbtn ' + (camOff ? 'off' : '')} onClick={toggleCam} aria-pressed={camOff} aria-label={camOff ? t('Turn camera on') : t('Turn camera off')} title={camOff ? t('Turn camera on') : t('Turn camera off')}><Ic n={camOff ? 'videooff' : 'video'} s={22} /></button>}
            <button className="cbtn red" onClick={hangup} aria-label={t('Hang up')} title={t('Hang up')}><Ic n="hang" s={24} /></button>
          </div>
        </div>
      )}
    </CallCtx.Provider>
  );
}
