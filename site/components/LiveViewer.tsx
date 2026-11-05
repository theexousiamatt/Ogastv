'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio } from 'lucide-react';

async function call(eventId:number,body:object) {
  const response=await fetch('/api/ogas-live',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({eventId,...body}),cache:'no-store'});
  const json=await response.json();
  if(!response.ok) throw new Error(json.error||'Could not connect to broadcast');
  return json;
}
async function iceDone(pc:RTCPeerConnection){
  if(pc.iceGatheringState==='complete')return;
  await new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('Connection timeout'))},15000);
    const check=()=>{if(pc.iceGatheringState==='complete'){cleanup();resolve()}};
    function cleanup(){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check)}
    pc.addEventListener('icegatheringstatechange',check);
  });
}
export function LiveViewer({eventId}:{eventId:number}){
  const video=useRef<HTMLVideoElement>(null);
  const connection=useRef<RTCPeerConnection|null>(null);
  const [state,setState]=useState<'loading'|'playing'|'offline'|'error'>('loading');
  const [message,setMessage]=useState('');
  const [muted,setMuted]=useState(true);
  useEffect(()=>{
    let alive=true;
    async function join(){
      try {
        const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
        connection.current=pc;
        const stream=new MediaStream();
        pc.addEventListener('track',e=>{stream.addTrack(e.track);if(video.current)video.current.srcObject=stream});
        const init=await call(eventId,{action:'watch'});
        if(!alive)return pc.close();
        await pc.setRemoteDescription(init.sessionDescription);
        await pc.setLocalDescription(await pc.createAnswer());
        await iceDone(pc);
        await call(eventId,{action:'answer',sessionId:init.sessionId,ticket:init.ticket,sessionDescription:pc.localDescription});
        if(!alive)return pc.close();
        setState('playing');
        if(video.current)await video.current.play().catch(()=>{});
      }catch(error){
        if(!alive)return;
        const msg=error instanceof Error?error.message:'Stream unavailable';
        setMessage(msg);
        setState(msg.toLowerCase().includes('off air')?'offline':'error');
      }
    }
    void join();
    return ()=>{alive=false;connection.current?.close();connection.current=null};
  },[eventId]);
  return <div style={{background:'#121719',borderRadius:20,overflow:'hidden',position:'relative',aspectRatio:'16/9',display:'grid',placeItems:'center',color:'white'}}>
    <video ref={video} autoPlay playsInline muted={muted} controls={state==='playing'} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
    {state!=='playing'&&<div style={{position:'absolute',textAlign:'center',padding:25}}>
      <Radio size={35} style={{margin:'auto'}}/>
      <h2 style={{fontSize:22,margin:'12px 0'}}>{state==='loading'?'Connecting to live coverage…':state==='offline'?'Currently off air':'Unable to connect'}</h2>
      <p style={{fontSize:13,opacity:.75}}>{state==='loading'?'Please wait a moment.':message}</p>
    </div>}
    {state==='playing'&&<div style={{position:'absolute',top:13,left:13,background:'#b21e2c',borderRadius:99,padding:'6px 12px',fontSize:11,fontWeight:800}}>● LIVE</div>}
    {state==='playing'&&<button onClick={()=>{setMuted(!muted);if(video.current)video.current.muted=!muted}} aria-label={muted?'Unmute broadcast':'Mute broadcast'} style={{position:'absolute',right:14,top:14,border:0,background:'#151b1bbb',borderRadius:99,color:'white',padding:10,cursor:'pointer'}}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>}
  </div>;
}
