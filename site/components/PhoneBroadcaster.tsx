'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, Radio, RotateCcw, Square } from 'lucide-react';

async function signal(eventId:number,body:object) {
  const response=await fetch('/api/ogas-live',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,...body})});
  const json=await response.json();
  if(!response.ok) throw new Error(json.error||'Broadcast request failed');
  return json;
}
async function gather(pc:RTCPeerConnection){
  if(pc.iceGatheringState==='complete') return;
  await new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('Network setup timed out'))},15000);
    const change=()=>{if(pc.iceGatheringState==='complete'){cleanup();resolve()}};
    function cleanup(){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',change)}
    pc.addEventListener('icegatheringstatechange',change);
  });
}
function connected(pc:RTCPeerConnection){
  if(pc.connectionState==='connected') return Promise.resolve();
  return new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('Could not connect to streaming network'))},20000);
    const onChange=()=>{
      if(pc.connectionState==='connected'){cleanup();resolve()}
      else if(['failed','closed','disconnected'].includes(pc.connectionState)){cleanup();reject(new Error('Streaming connection failed'))}
    };
    function cleanup(){clearTimeout(timer);pc.removeEventListener('connectionstatechange',onChange)}
    pc.addEventListener('connectionstatechange',onChange);
  });
}
export function PhoneBroadcaster({eventId,title}:{eventId:number;title:string}){
  const video=useRef<HTMLVideoElement>(null);
  const media=useRef<MediaStream|null>(null);
  const connection=useRef<RTCPeerConnection|null>(null);
  const session=useRef<string>('');
  const [status,setStatus]=useState<'idle'|'preview'|'connecting'|'live'|'ended'>('idle');
  const [error,setError]=useState('');
  const [muted,setMuted]=useState(false);
  const [front,setFront]=useState(false);
  const [seconds,setSeconds]=useState(0);
  useEffect(()=>{
    if(status!=='live')return;
    const start=Date.now();
    const timer=setInterval(()=>setSeconds(Math.floor((Date.now()-start)/1000)),1000);
    return ()=>clearInterval(timer);
  },[status]);
  useEffect(()=>()=>{connection.current?.close();media.current?.getTracks().forEach(t=>t.stop())},[]);
  async function preview(facing='environment'){
    setError('');
    try{
      if(!navigator.mediaDevices?.getUserMedia) throw new Error('A secure HTTPS connection and a camera-enabled browser are required');
      const stream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},
        audio:{echoCancellation:true,noiseSuppression:true}
      });
      const prior=media.current;
      media.current=stream;
      if(video.current){video.current.srcObject=stream;await video.current.play().catch(()=>{});}
      prior?.getTracks().forEach(t=>t.stop());
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
    setError('');setStatus('connecting');
    try{
      const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
      connection.current=pc;
      const tracks=media.current.getTracks().map(track=>{
        const t=pc.addTransceiver(track,{direction:'sendonly'});
        return {trackName:track.kind==='video'?'camera':'microphone',transceiver:t};
      });
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      await gather(pc);
      const created=await signal(eventId,{action:'start'});
      session.current=created.sessionId;
      const result=await signal(eventId,{action:'publish',sessionId:session.current,
        sessionDescription:pc.localDescription,
        tracks:tracks.map(t=>({trackName:t.trackName,mid:t.transceiver.mid}))});
      await pc.setRemoteDescription(result.sessionDescription);
      await connected(pc);
      await signal(eventId,{action:'go-live',sessionId:session.current});
      setSeconds(0);setStatus('live');
    }catch(e){
      connection.current?.close();connection.current=null;
      setError(e instanceof Error?e.message:'Could not start broadcasting');
      setStatus('preview');
    }
  }
  async function end(){
    setError('');
    try{if(session.current)await signal(eventId,{action:'stop',sessionId:session.current})}
    catch(e){setError(e instanceof Error?e.message:'Could not mark broadcast ended')}
    finally {
      connection.current?.close();connection.current=null;
      media.current?.getTracks().forEach(t=>t.stop());media.current=null;
      if(video.current) video.current.srcObject=null;
      session.current='';setStatus('ended');
    }
  }
  const live=status==='live';
  return <section style={{maxWidth:800,margin:'32px auto 70px',padding:'0 18px',fontFamily:'system-ui'}}>
    <a href="/broadcast-studio" style={{color:'#8e2027'}}>← Broadcast studio</a>
    <h1 style={{fontSize:'clamp(28px,5vw,44px)',letterSpacing:'-.05em',margin:'22px 0 5px'}}>{title}</h1>
    <p style={{color:'#646967',marginBottom:22}}>Report from your phone. Your viewers watch directly on OgasTV Africa.</p>
    <div style={{position:'relative',aspectRatio:'9/13',maxHeight:'68vh',borderRadius:22,background:'#12191b',overflow:'hidden',margin:'0 auto',display:'grid',placeItems:'center'}}>
      <video ref={video} muted autoPlay playsInline style={{width:'100%',height:'100%',objectFit:'cover',transform:front?'scaleX(-1)':'none'}}/>
      {status==='idle'||status==='ended'?<div style={{position:'absolute',color:'#fff',textAlign:'center'}}><Camera size={36}/><p>Camera preview is off</p></div>:null}
      {live&&<span style={{position:'absolute',top:18,left:18,background:'#b22127',color:'white',padding:'8px 14px',borderRadius:99,fontSize:12,fontWeight:800}}>● LIVE · {Math.floor(seconds/60).toString().padStart(2,'0')}:{(seconds%60).toString().padStart(2,'0')}</span>}
    </div>
    <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'center',flexWrap:'wrap'}}>
      {status==='idle'||status==='ended'?<button onClick={()=>preview(front?'user':'environment')} style={primary}><Camera size={18}/> Enable camera</button>:null}
      {status==='preview'&&<><button onClick={switchCamera} style={secondary}><RotateCcw size={18}/> Switch camera</button><button onClick={toggleMic} style={secondary}>{muted?<MicOff size={18}/>:<Mic size={18}/>} {muted?'Unmute':'Mute'}</button><button onClick={goLive} style={primary}><Radio size={18}/> Go live</button></>}
      {live&&<><button onClick={toggleMic} style={secondary}>{muted?<MicOff size={18}/>:<Mic size={18}/>} {muted?'Unmute':'Mute'}</button><button onClick={end} style={primary}><Square size={17}/> End broadcast</button></>}
      {status==='connecting'&&<span role="status" style={{padding:12}}>Connecting to Cloudflare…</span>}
    </div>
    {error&&<p role="alert" style={{padding:14,color:'#a21d24',background:'#fff1f1',borderRadius:12,marginTop:15}}>{error}</p>}
    <p style={{fontSize:12,color:'#777',textAlign:'center',marginTop:15}}>Keep this page open and your phone awake while broadcasting. A stable Wi-Fi or mobile data connection is recommended.</p>
  </section>;
}
const primary:React.CSSProperties={background:'#a52227',color:'white',border:0,borderRadius:99,padding:'12px 19px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer'};
const secondary:React.CSSProperties={background:'white',color:'#292b2a',border:'1px solid #ddd',borderRadius:99,padding:'12px 17px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer'};
