'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio, RefreshCw } from 'lucide-react';

async function call(eventId:number,body:object) {
  const response=await fetch('/api/ogas-live',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
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

/** WebRTC SDP negotiation is not proof that any video actually arrived.
 * Resolve only when the viewer has decoded a first frame, and stop waiting
 * if the peer fails or the original stream went away. */
function waitForFirstVideoFrame(video:HTMLVideoElement,pc:RTCPeerConnection,timeoutMs=18000):Promise<void>{
  return new Promise((resolve,reject)=>{
    let finished=false;
    const finish=(error?:Error)=>{
      if(finished)return;
      finished=true;
      clearTimeout(deadline);clearInterval(poll);
      video.removeEventListener('loadeddata',check);
      video.removeEventListener('playing',check);
      pc.removeEventListener('connectionstatechange',onConnection);
      if(error)reject(error);else resolve();
    };
    const check=()=>{
      if(video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA&&video.videoWidth>0&&video.videoHeight>0)finish();
    };
    const onConnection=()=>{
      if(pc.connectionState==='failed'||pc.connectionState==='closed'){
        finish(new Error('The live connection ended before video arrived.'));
      }
    };
    const deadline=setTimeout(()=>finish(new Error(
      'No live video has arrived. The broadcaster may be offline or the connection may be interrupted.'
    )),timeoutMs);
    const poll=setInterval(check,300);
    video.addEventListener('loadeddata',check);
    video.addEventListener('playing',check);
    pc.addEventListener('connectionstatechange',onConnection);
    check();onConnection();
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
    const fail=(description:string)=>{
      if(!alive)return;
      close();
      setMessage(description);
      setState(description.toLowerCase().includes('off air')?'offline':'error');
    };
    setState('loading');setMessage('');
    async function join(){
      try {
        const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
        connection.current=pc;
        pc.addEventListener('connectionstatechange',()=>{
          if(!alive||pc!==connection.current)return;
          if(pc.connectionState==='connected'){
            if(disconnectTimer){clearTimeout(disconnectTimer);disconnectTimer=null;}
          }else if(pc.connectionState==='failed'||pc.connectionState==='closed'){
            fail('The live connection was interrupted. Please reconnect.');
          }else if(pc.connectionState==='disconnected'&&!disconnectTimer){
            // Mobile networks can momentarily disconnect without losing the broadcast.
            disconnectTimer=setTimeout(()=>{
              disconnectTimer=null;
              if(pc.connectionState==='disconnected')fail('Your connection to the broadcast was interrupted. Please reconnect.');
            },7000);
          }
        });
        const stream=new MediaStream();
        pc.addEventListener('track',e=>{
          stream.addTrack(e.track);
          if(video.current){
            video.current.srcObject=stream;
            void video.current.play().catch(()=>{});
          }
        });
        const init=await call(eventId,{action:'watch'});
        if(!alive)return pc.close();
        await pc.setRemoteDescription(init.sessionDescription);
        await pc.setLocalDescription(await pc.createAnswer());
        await iceDone(pc);
        await call(eventId,{action:'answer',sessionId:init.sessionId,ticket:init.ticket,sessionDescription:pc.localDescription});
        if(!alive)return pc.close();
        const element=video.current;
        if(!element)throw new Error('The live player is unavailable.');
        void element.play().catch(()=>{});
        await waitForFirstVideoFrame(element,pc);
        if(!alive||pc!==connection.current)return;
        setState('playing');
      }catch(error){
        if(!alive)return;
        fail(error instanceof Error?error.message:'Stream unavailable');
      }
    }
    void join();
    return ()=>{alive=false;close()};
  },[eventId,attempt]);
  return <div className={'ogas-live-viewer'+(portrait?' ogas-live-viewer--portrait':'')} style={{background:'#121719',overflow:'hidden',position:'relative',display:'grid',placeItems:'center',color:'white'}}>
    <video ref={video} autoPlay playsInline muted={muted} controls={state==='playing'} onLoadedMetadata={event=>setPortrait(event.currentTarget.videoHeight>event.currentTarget.videoWidth)} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
    {state!=='playing'&&<div role="status" aria-live="polite" style={{position:'absolute',textAlign:'center',padding:25,maxWidth:420}}>
      <Radio size={35} style={{margin:'auto'}}/>
      <h2 style={{fontSize:22,margin:'12px 0'}}>{state==='loading'?'Connecting to live coverage…':state==='offline'?'Currently off air':'Broadcast unavailable'}</h2>
      <p style={{fontSize:13,opacity:.75}}>{state==='loading'?'Checking the video feed.':message}</p>
      {state!=='loading'&&<div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:10,marginTop:14}}>
        <button type="button" onClick={()=>setAttempt(value=>value+1)} style={{display:'flex',alignItems:'center',gap:6,border:'1px solid #ffffff55',borderRadius:999,color:'white',background:'#ffffff17',padding:'10px 16px',fontWeight:700,cursor:'pointer'}}><RefreshCw size={15}/> Try reconnecting</button>
        <button type="button" onClick={()=>window.location.reload()} style={{border:'1px solid #ffffff55',borderRadius:999,color:'white',background:'transparent',padding:'10px 16px',fontWeight:700,cursor:'pointer'}}>Check for a new broadcast</button>
      </div>}
    </div>}
    {state==='playing'&&<div style={{position:'absolute',top:13,left:13,background:'#b21e2c',borderRadius:99,padding:'6px 12px',fontSize:11,fontWeight:800}}>● LIVE</div>}
    {state==='playing'&&<button onClick={()=>{setMuted(!muted);if(video.current)video.current.muted=!muted}} aria-label={muted?'Unmute broadcast':'Mute broadcast'} style={{position:'absolute',right:14,top:14,border:0,background:'#151b1bbb',borderRadius:99,color:'white',padding:10,cursor:'pointer'}}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>}
  </div>;
}
