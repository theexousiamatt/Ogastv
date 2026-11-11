'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, MicOff, Radio, RotateCcw, Square } from 'lucide-react';
import { formatBroadcastDiagnostics, measureBroadcastQuality } from './broadcastQuality';
import type { BroadcastQuality, BroadcastStat, OutboundSnapshot } from './broadcastQuality';

async function signal(eventId:number|undefined,body:object) {
  const response=await fetch('/api/ogas-live',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,...body})});
  const json=await response.json();
  if(!response.ok) throw new Error(json.error||'Broadcast request failed');
  return json;
}
async function gather(pc:RTCPeerConnection){
  if(pc.iceGatheringState!=='complete') {
    // On restricted networks, STUN can remain in "gathering" indefinitely.
    // Continue with candidates collected so far rather than always failing at 15s.
    await new Promise<void>(resolve=>{
      const timer=setTimeout(finish,8000);
      function finish(){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);resolve()}
      function check(){if(pc.iceGatheringState==='complete')finish()}
      pc.addEventListener('icegatheringstatechange',check);
      check();
    });
  }
  if(!pc.localDescription?.sdp.includes('a=candidate:')) {
    throw new Error('Your browser could not find a video network path. Try another connection or allow WebRTC/UDP traffic.');
  }
}
function connected(pc:RTCPeerConnection){
  if(pc.connectionState==='connected') return Promise.resolve();
  return new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('Could not connect to Cloudflare. Try another Wi-Fi or mobile connection; your network may block WebRTC traffic.'))},20000);
    const onChange=()=>{
      if(pc.connectionState==='connected'){cleanup();resolve()}
      else if(['failed','closed','disconnected'].includes(pc.connectionState)){cleanup();reject(new Error('Streaming connection failed'))}
    };
    function cleanup(){clearTimeout(timer);pc.removeEventListener('connectionstatechange',onChange)}
    pc.addEventListener('connectionstatechange',onChange);
  });
}
// These are upper limits only; the browser still adapts to actual upload bandwidth.
// A capable device/network can publish Full HD, while mobile users can select 720p.
const streamProfiles = {
  hd: { label: 'HD · 720p', width: 1280, height: 720, maxBitrate: 3_500_000 },
  fullhd: { label: 'Full HD · 1080p', width: 1920, height: 1080, maxBitrate: 5_000_000 },
} as const;
type StreamProfile = keyof typeof streamProfiles;

async function configureVideoEncoder(sender: RTCRtpSender, maxBitrate: number) {
  const settings = sender.getParameters();
  if (!settings.encodings?.length) return;
  try {
    await sender.setParameters({
      ...settings,
      degradationPreference: 'balanced',
      encodings: settings.encodings.map(encoding => ({
        ...encoding, maxBitrate, maxFramerate: 30,
      })),
    });
  } catch {
    // Some Safari/Firefox versions reject one of the optional parameters.
    // Retry bitrate-only; if unsupported, keep the browser's safe native adaptation.
    try {
      const fallback = sender.getParameters();
      if (!fallback.encodings?.length) return;
      await sender.setParameters({
        ...fallback,
        encodings: fallback.encodings.map(encoding => ({...encoding, maxBitrate})),
      });
    } catch {
      console.info('[OgasTV broadcast] Using browser-managed video encoding');
    }
  }
}
export function PhoneBroadcaster({eventId,title=''}:{eventId?:number;title?:string}){
  const video=useRef<HTMLVideoElement>(null);
  const media=useRef<MediaStream|null>(null);
  const connection=useRef<RTCPeerConnection|null>(null);
  const session=useRef<string>('');
  const activeEventId=useRef<number|undefined>(eventId);
  const [quickTitle,setQuickTitle]=useState(title);
  const [streamProfile,setStreamProfile]=useState<StreamProfile>('hd');
  const [status,setStatus]=useState<'idle'|'preview'|'connecting'|'live'|'ended'>('idle');
  const [error,setError]=useState('');
  const [muted,setMuted]=useState(false);
  const [front,setFront]=useState(false);
  const [seconds,setSeconds]=useState(0);
  const [capture,setCapture]=useState('Unavailable');
  const [quality,setQuality]=useState<BroadcastQuality|null>(null);
  const [copied,setCopied]=useState(false);
  useEffect(()=>{
    if(status!=='live')return;
    const start=Date.now();
    const timer=setInterval(()=>setSeconds(Math.floor((Date.now()-start)/1000)),1000);
    return ()=>clearInterval(timer);
  },[status]);
  useEffect(()=>{
    if(status!=='live') return;
    let active=true;
    let measuring=false;
    let previous: OutboundSnapshot|null=null;
    async function poll() {
      const pc=connection.current;
      if(!pc || measuring) return;
      measuring=true;
      try {
        const stats=await pc.getStats();
        const rows: BroadcastStat[]=[];
        stats.forEach(row=>rows.push(row as unknown as BroadcastStat));
        const result=measureBroadcastQuality(rows,previous,pc.connectionState==='connected');
        previous=result.snapshot;
        if(active) setQuality(result.quality);
      } catch {
        // Telemetry must never interrupt an active broadcast.
        if(active) setQuality(null);
      } finally { measuring=false; }
    }
    void poll();
    const ticker=setInterval(()=>void poll(),3000);
    return ()=>{active=false;clearInterval(ticker)};
  },[status]);
  useEffect(()=>()=>{connection.current?.close();media.current?.getTracks().forEach(t=>t.stop())},[]);
  async function copyDiagnostics(){
    if(!quality) return;
    try {
      await navigator.clipboard.writeText(formatBroadcastDiagnostics(quality,capture));
      setCopied(true);
    } catch {setError('Could not copy the diagnostics. Please take a screenshot of the stream health panel.')}
  }
  async function preview(facing='environment'){
    setError('');
    try{
      if(!navigator.mediaDevices?.getUserMedia) throw new Error('A secure HTTPS connection and a camera-enabled browser are required');
      const profile=streamProfiles[streamProfile];
      const stream=await navigator.mediaDevices.getUserMedia({
        video:{
          facingMode:{ideal:facing},width:{ideal:profile.width},height:{ideal:profile.height},
          frameRate:{ideal:30,max:30}
        },
        audio:{echoCancellation:true,noiseSuppression:true}
      });
      const prior=media.current;
      media.current=stream;
      if(video.current){video.current.srcObject=stream;await video.current.play().catch(()=>{});}
      prior?.getTracks().forEach(t=>t.stop());
      const settings=stream.getVideoTracks()[0]?.getSettings();
      setCapture(settings ? [settings.width||'?',settings.height||'?'].join('×')+
        (settings.frameRate?' @ '+Math.round(settings.frameRate)+' FPS':'') : 'Unavailable');
      setQuality(null);setCopied(false);
      setStatus('preview');setMuted(false);
    }catch(e){setError(e instanceof Error?e.message:'Camera access denied')}
  }
  async function switchCamera(){
    if(status==='live' || status==='connecting')return;
    setFront(!front);
    await preview(front?'environment':'user');
  }
  function toggleMic(){
    const next=!muted;
    media.current?.getAudioTracks().forEach(t=>t.enabled=!next);
    setMuted(next);
  }
  async function goLive(){
    if(!media.current || status!=='preview')return;
    setError('');setStatus('connecting');setQuality(null);setCopied(false);
    try{
      const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
      connection.current=pc;
      const tracks=media.current.getTracks().map(track=>{
        const t=pc.addTransceiver(track,{direction:'sendonly'});
        return {trackName:track.kind==='video'?'camera':'microphone',transceiver:t};
      });
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      const videoSender=tracks.find(track=>track.trackName==='camera')?.transceiver.sender;
      if(videoSender) await configureVideoEncoder(videoSender,streamProfiles[streamProfile].maxBitrate);
      await gather(pc);
      if(!activeEventId.current) {
        const createdEvent=await signal(undefined,{action:'quick-create',title:quickTitle});
        activeEventId.current=createdEvent.eventId;
      }
      const currentId=activeEventId.current!;
      const created=await signal(currentId,{action:'start'});
      session.current=created.sessionId;
      const result=await signal(currentId,{action:'publish',sessionId:session.current,
        sessionDescription:pc.localDescription,
        tracks:tracks.map(t=>({trackName:t.trackName,mid:t.transceiver.mid}))});
      await pc.setRemoteDescription(result.sessionDescription);
      await connected(pc);
      await signal(currentId,{action:'go-live',sessionId:session.current});
      setSeconds(0);setStatus('live');
    }catch(e){
      connection.current?.close();connection.current=null;
      setError(e instanceof Error?e.message:'Could not start broadcasting');
      session.current='';
      setStatus('preview');
    }
  }
  async function end(){
    setError('');
    try{if(session.current&&activeEventId.current)await signal(activeEventId.current,{action:'stop',sessionId:session.current})}
    catch(e){setError(e instanceof Error?e.message:'Could not mark broadcast ended')}
    finally {
      connection.current?.close();connection.current=null;
      media.current?.getTracks().forEach(t=>t.stop());media.current=null;
      if(video.current) video.current.srcObject=null;
      session.current='';setQuality(null);setStatus('ended');
    }
  }
  const live=status==='live';
  return <section style={{maxWidth:800,margin:'32px auto 70px',padding:'0 18px',fontFamily:'system-ui'}}>
    <a href="/broadcast-studio" style={{color:'#8e2027'}}>← Broadcast studio</a>
    <h1 style={{fontSize:'clamp(28px,5vw,44px)',letterSpacing:'-.05em',margin:'22px 0 5px'}}>{eventId?title:'Go live'}</h1>
    <p style={{color:'#646967',marginBottom:22}}>Your camera, your story. Viewers watch directly on OgasTV.</p>
    {(status==='idle'||status==='ended')&&<label style={{display:'block',fontSize:13,fontWeight:700,marginBottom:18}}>
      Stream quality
      <select value={streamProfile} onChange={e=>setStreamProfile(e.target.value as StreamProfile)}
        style={{display:'block',width:'100%',padding:'12px 14px',marginTop:7,fontSize:15,borderRadius:10,border:'1px solid #d7ddd8',background:'#fff',color:'#222'}}>
        <option value="hd">HD · 720p — recommended for mobile data</option>
        <option value="fullhd">Full HD · 1080p — for strong Wi-Fi</option>
      </select>
      <span style={{fontWeight:400,fontSize:12,color:'#68716b',display:'block',marginTop:7}}>
        Full HD requires a capable phone, good lighting and stable upload. Actual camera resolution may be lower.
      </span>
    </label>}
    {(status==='preview'||status==='connecting'||status==='live')&&
      <p style={{fontSize:12,color:'#5a6560',margin:'-6px 0 16px'}}>Selected: {streamProfiles[streamProfile].label} · Camera: {capture}</p>}
    {!eventId&&status!=='live'&&status!=='ended'&&<label style={{display:'block',fontWeight:650,marginBottom:16}}>Broadcast title
      <input value={quickTitle} onChange={e=>setQuickTitle(e.target.value)} maxLength={120} placeholder="What are you covering?" required
        style={{display:'block',width:'100%',boxSizing:'border-box',fontSize:16,padding:'14px 16px',marginTop:7,border:'1px solid #dadbd8',borderRadius:12,background:'white'}}/>
    </label>}
    <div style={{position:'relative',aspectRatio:'9/13',maxHeight:'68vh',borderRadius:22,background:'#12191b',overflow:'hidden',margin:'0 auto',display:'grid',placeItems:'center'}}>
      <video ref={video} muted autoPlay playsInline style={{width:'100%',height:'100%',objectFit:'cover',transform:front?'scaleX(-1)':'none'}}/>
      {status==='idle'||status==='ended'?<div style={{position:'absolute',color:'#fff',textAlign:'center'}}><Camera size={36}/><p>Camera preview is off</p></div>:null}
      {live&&<span style={{position:'absolute',top:18,left:18,background:'#b22127',color:'white',padding:'8px 14px',borderRadius:99,fontSize:12,fontWeight:800}}>● LIVE · {Math.floor(seconds/60).toString().padStart(2,'0')}:{(seconds%60).toString().padStart(2,'0')}</span>}
    </div>
    <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'center',flexWrap:'wrap'}}>
      {status==='idle'||status==='ended'?<button onClick={()=>preview(front?'user':'environment')} style={primary}><Camera size={18}/> Enable camera</button>:null}
      {status==='preview'&&<><button onClick={switchCamera} style={secondary}><RotateCcw size={18}/> Switch camera</button><button onClick={toggleMic} style={secondary}>{muted?<MicOff size={18}/>:<Mic size={18}/>} {muted?'Unmute':'Mute'}</button><button onClick={goLive} disabled={!eventId&&quickTitle.trim().length<3} style={{...primary,opacity:!eventId&&quickTitle.trim().length<3?0.5:1}}><Radio size={18}/> Go live</button></>}
      {live&&<><button onClick={toggleMic} style={secondary}>{muted?<MicOff size={18}/>:<Mic size={18}/>} {muted?'Unmute':'Mute'}</button><button onClick={end} style={primary}><Square size={17}/> End broadcast</button></>}
      {status==='connecting'&&<span role="status" style={{padding:12}}>Connecting to Cloudflare…</span>}
    </div>
    {live&&<div aria-label="Live stream quality" style={{marginTop:18,padding:18,border:'1px solid #ddd',borderRadius:16,background:'#fafafa'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <strong style={{fontSize:15}}>Stream health</strong>
        <span role="status" aria-live="polite" style={{fontSize:13,fontWeight:700,color:quality?.level==='poor'?'#b4232c':quality?.level==='fair'?'#865300':'#376445'}}>
          ● {quality?.level==='good'?'Good':quality?.level==='fair'?'Needs attention':quality?.level==='poor'?'Weak connection':'Measuring…'}
        </span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginTop:14,fontSize:12,color:'#555'}}>
        <div>Sent video<strong style={{display:'block',fontSize:17,color:'#222',marginTop:3}}>{quality?.bitrateKbps!=null?(quality.bitrateKbps/1000).toFixed(2)+' Mbps':'—'}</strong></div>
        <div>Encoded FPS<strong style={{display:'block',fontSize:17,color:'#222',marginTop:3}}>{quality?.fps??'—'}</strong></div>
        <div>Video size<strong style={{display:'block',fontSize:17,color:'#222',marginTop:3}}>{quality?.width&&quality.height?quality.width+'×'+quality.height:'—'}</strong></div>
        <div>Packet loss<strong style={{display:'block',fontSize:17,color:'#222',marginTop:3}}>{quality?.packetLossPercent!=null?quality.packetLossPercent+'%':'—'}</strong></div>
        <div>Latency (RTT)<strong style={{display:'block',fontSize:17,color:'#222',marginTop:3}}>{quality?.rttMs!=null?quality.rttMs+' ms':'—'}</strong></div>
      </div>
      <p style={{fontSize:12,color:'#626666',margin:'12px 0'}}>
        Camera: {capture}. {quality?.limitation==='bandwidth'?'Network bandwidth is limiting picture quality.':quality?.limitation==='cpu'?'Phone processing is limiting picture quality.':quality?.level==='poor'?'Try a stronger connection or stop moving until the signal recovers.':'Move the camera slowly and keep a steady connection.'}
      </p>
      <button onClick={()=>void copyDiagnostics()} disabled={!quality} style={{...secondary,padding:'9px 12px',fontSize:12}}>
        {copied?'Diagnostics copied':'Copy stream diagnostics'}
      </button>
      <p style={{fontSize:11,color:'#777',margin:'8px 0 0'}}>These are encoder and network indicators, not an assessment of focus or lighting. Measurements may be unavailable in some browsers. Sent video is not an upload-speed test.</p>
    </div>}
    {error&&<p role="alert" style={{padding:14,color:'#a21d24',background:'#fff1f1',borderRadius:12,marginTop:15}}>{error}</p>}
    {live&&<p style={{textAlign:'center',marginTop:12}}><a href="/live" target="_blank" rel="noopener noreferrer" style={{color:'#a52227',fontWeight:700}}>View public live page ↗</a></p>}
    <p style={{fontSize:12,color:'#777',textAlign:'center',marginTop:15}}>Keep this tab open during your broadcast. You'll need a stable connection.</p>
  </section>;
}
const primary:React.CSSProperties={background:'#a52227',color:'white',border:0,borderRadius:99,padding:'12px 19px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer'};
const secondary:React.CSSProperties={background:'white',color:'#292b2a',border:'1px solid #ddd',borderRadius:99,padding:'12px 17px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer'};
