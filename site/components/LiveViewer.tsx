'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio } from 'lucide-react';

async function call(eventId:number,body:object) {
  const response=await fetch('/api/ogas-live',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({eventId,...body}),cache:'no-store',
    signal:AbortSignal.timeout(15000),
  });
  const json=await response.json().catch(()=>null);
  if(!response.ok) throw new Error(json?.error||'Broadcast connection is unavailable');
  if(!json)throw new Error('Broadcast service returned an invalid response');
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
  if(!pc.localDescription?.sdp.includes('a=candidate:'))
    throw new Error('Unable to establish a WebRTC network path. Try another network.');
}

/** Signaling success is not proof that a viewer can see video.
 * Wait for a connected WebRTC transport AND a decoded video frame.
 */
function firstVideoFrame(pc:RTCPeerConnection,element:HTMLVideoElement,timeoutMs=16000){
  return new Promise<void>((resolve,reject)=>{
    const timeout=setTimeout(()=>finish(new Error('No video received from the broadcaster. The live session may have ended.')),timeoutMs);
    const events=['loadeddata','playing','timeupdate','resize'] as const;
    const check=()=>{
      if(pc.connectionState==='failed'||pc.connectionState==='closed') {
        finish(new Error('The live video connection failed. Try reconnecting.'));
      } else if(pc.connectionState==='connected'&&element.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA&&
        element.videoWidth>0&&element.videoHeight>0) finish();
    };
    function finish(error?:Error){
      clearTimeout(timeout);
      events.forEach(name=>element.removeEventListener(name,check));
      pc.removeEventListener('connectionstatechange',check);
      if(error)reject(error);else resolve();
    }
    events.forEach(name=>element.addEventListener(name,check));
    pc.addEventListener('connectionstatechange',check);
    check();
  });
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
    let disconnectTimer:ReturnType<typeof setTimeout>|null=null;
    const close=()=>{
      if(disconnectTimer){clearTimeout(disconnectTimer);disconnectTimer=null;}
      connection.current?.close();connection.current=null;
      if(video.current)video.current.srcObject=null;
    };
    const fail=(text:string)=>{
      if(!alive)return;
      close();
      setMessage(text);
      setState(text.toLowerCase().includes('off air')?'offline':'error');
    };
    setState('loading');setMessage('');
    async function join(){
      try {
        const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
        connection.current=pc;
        pc.addEventListener('connectionstatechange',()=>{
          if(!alive||connection.current!==pc)return;
          if(pc.connectionState==='failed'||pc.connectionState==='closed') {
            fail('The live connection failed. Try reconnecting.');
          } else if(pc.connectionState==='disconnected'){
            // Short mobile-data handovers can recover without a new session.
            if(!disconnectTimer){
              disconnectTimer=setTimeout(()=>{
                disconnectTimer=null;
                if(alive&&pc.connectionState==='disconnected')
                  fail('The live connection was interrupted. Try reconnecting.');
              },5000);
            }
          } else if(pc.connectionState==='connected'&&disconnectTimer){
            clearTimeout(disconnectTimer);disconnectTimer=null;
          }
        });
        const stream=new MediaStream();
        pc.addEventListener('track',event=>{
          stream.addTrack(event.track);
          if(video.current){
            video.current.srcObject=stream;
            void video.current.play().catch(()=>{});
          }
          event.track.addEventListener('ended',()=>{
            if(alive&&event.track.kind==='video'&&connection.current===pc)
              fail('The broadcaster stopped sending video. Try reconnecting.');
          },{once:true});
        });
        const init=await call(eventId,{action:'watch'});
        if(!alive)return pc.close();
        await pc.setRemoteDescription(init.sessionDescription);
        await pc.setLocalDescription(await pc.createAnswer());
        await iceDone(pc);
        await call(eventId,{action:'answer',sessionId:init.sessionId,ticket:init.ticket,sessionDescription:pc.localDescription});
        if(!alive)return pc.close();
        if(!video.current)throw new Error('The video player is not available.');
        void video.current.play().catch(()=>{});
        await firstVideoFrame(pc,video.current);
        if(alive&&connection.current===pc) setState('playing');
      } catch(error){
        if(!alive)return;
        const msg=error instanceof Error?error.message:'Stream unavailable';
        fail(msg);
      }
    }
    void join();
    return ()=>{alive=false;close()};
  },[eventId,attempt]);

  return <div className={'ogas-live-viewer'+(portrait?' ogas-live-viewer--portrait':'')}
    style={{background:'#121719',overflow:'hidden',position:'relative',display:'grid',placeItems:'center',color:'white'}}>
    <video ref={video} autoPlay playsInline muted={muted} controls={state==='playing'}
      onLoadedMetadata={event=>setPortrait(event.currentTarget.videoHeight>event.currentTarget.videoWidth)}
      style={{width:'100%',height:'100%',objectFit:'contain'}}/>
    {state!=='playing'&&<div role="status" aria-live="polite" style={{position:'absolute',textAlign:'center',padding:25}}>
      <Radio size={35} style={{margin:'auto'}}/>
      <h2 style={{fontSize:22,margin:'12px 0'}}>{state==='loading'?'Connecting to live coverage…':state==='offline'?'Currently off air':'Live video unavailable'}</h2>
      <p style={{fontSize:13,opacity:.75}}>{state==='loading'?'Checking the broadcast video connection…':message}</p>
      {state!=='loading'&&<button type="button" onClick={()=>setAttempt(value=>value+1)}
        style={{border:'1px solid #ffffff55',borderRadius:999,color:'white',background:'#ffffff17',
          padding:'10px 16px',marginTop:14,fontWeight:700,cursor:'pointer'}}>Try reconnecting</button>}
    </div>}
    {state==='playing'&&<div style={{position:'absolute',top:13,left:13,background:'#b21e2c',borderRadius:99,padding:'6px 12px',fontSize:11,fontWeight:800}}>● LIVE</div>}
    {state==='playing'&&<button onClick={()=>setMuted(!muted)}
      aria-label={muted?'Unmute broadcast':'Mute broadcast'} style={{position:'absolute',right:14,top:14,
        border:0,background:'#151b1bbb',borderRadius:99,color:'white',padding:10,cursor:'pointer'}}>
      {muted?<VolumeX size={18}/>:<Volume2 size={18}/>}
    </button>}
  </div>;
}
