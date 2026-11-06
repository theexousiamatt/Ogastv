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
  if(pc.iceGatheringState!=='complete'){
    await new Promise<void>(resolve=>{
      const timer=setTimeout(finish,8000);
      function finish(){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);resolve()}
      function check(){if(pc.iceGatheringState==='complete')finish()}
      pc.addEventListener('icegatheringstatechange',check);
      check();
    });
  }
  if(!pc.localDescription?.sdp.includes('a=candidate:'))throw new Error('Unable to establish a WebRTC network path. Try another network.');
}
export function LiveViewer({eventId}:{eventId:number}){
  const video=useRef<HTMLVideoElement>(null);
  const connection=useRef<RTCPeerConnection|null>(null);
  const [state,setState]=useState<'loading'|'playing'|'offline'|'error'>('loading');
  const [message,setMessage]=useState('');
  const [muted,setMuted]=useState(true);
  const [portrait,setPortrait]=useState(false);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let alive=true;
    const close=()=>{connection.current?.close();connection.current=null;if(video.current)video.current.srcObject=null};
    setState('loading');setMessage('');
    async function join(){
      try {
        const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
        connection.current=pc;
        pc.addEventListener('connectionstatechange',()=>{
          if(!alive)return;
          if(pc.connectionState==='failed'||pc.connectionState==='disconnected'||pc.connectionState==='closed'){
            setMessage('The live connection was interrupted. Try reconnecting.');
            setState('error');
          }
        });
        const stream=new MediaStream();
        pc.addEventListener('track',e=>{stream.addTrack(e.track);if(video.current)video.current.srcObject=stream});
        const init=await call(eventId,{action:'watch'});
        if(!alive)return pc.close();
        await pc.setRemoteDescription(init.sessionDescription);
        await pc.setLocalDescription(await pc.createAnswer());
        await iceDone(pc);
        await call(eventId,{action:'answer',sessionId:init.sessionId,ticket:init.ticket,sessionDescription:pc.localDescription});
        if(!alive)return pc.close();
        if(pc.connectionState==='failed'||pc.connectionState==='closed')throw new Error('The live connection ended. Try reconnecting.');
        setState('playing');
        if(video.current)await video.current.play().catch(()=>{});
      }catch(error){
        if(!alive)return;
        close();
        const msg=error instanceof Error?error.message:'Stream unavailable';
        setMessage(msg);
        setState(msg.toLowerCase().includes('off air')?'offline':'error');
      }
    }
    void join();
    return ()=>{alive=false;close()};
  },[eventId,attempt]);
  return <div className={'ogas-live-viewer'+(portrait?' ogas-live-viewer--portrait':'')} style={{background:'#121719',overflow:'hidden',position:'relative',display:'grid',placeItems:'center',color:'white'}}>
    <video ref={video} autoPlay playsInline muted={muted} controls={state==='playing'} onLoadedMetadata={event=>setPortrait(event.currentTarget.videoHeight>event.currentTarget.videoWidth)} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
    {state!=='playing'&&<div style={{position:'absolute',textAlign:'center',padding:25}}>
      <Radio size={35} style={{margin:'auto'}}/>
      <h2 style={{fontSize:22,margin:'12px 0'}}>{state==='loading'?'Connecting to live coverage…':state==='offline'?'Currently off air':'Unable to connect'}</h2>
      <p style={{fontSize:13,opacity:.75}}>{state==='loading'?'Please wait a moment.':message}</p>
      {state!=='loading'&&<button type="button" onClick={()=>setAttempt(value=>value+1)} style={{border:'1px solid #ffffff55',borderRadius:999,color:'white',background:'#ffffff17',padding:'10px 16px',marginTop:14,fontWeight:700,cursor:'pointer'}}>Try reconnecting</button>}
    </div>}
    {state==='playing'&&<div style={{position:'absolute',top:13,left:13,background:'#b21e2c',borderRadius:99,padding:'6px 12px',fontSize:11,fontWeight:800}}>● LIVE</div>}
    {state==='playing'&&<button onClick={()=>{setMuted(!muted);if(video.current)video.current.muted=!muted}} aria-label={muted?'Unmute broadcast':'Mute broadcast'} style={{position:'absolute',right:14,top:14,border:0,background:'#151b1bbb',borderRadius:99,color:'white',padding:10,cursor:'pointer'}}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>}
  </div>;
}
