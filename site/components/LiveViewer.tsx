'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio, CheckCircle2 } from 'lucide-react';

type PublicStatus={state:'live'|'ended'|'offline';actualEnd:string|null};
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
      pc.addEventListener('icegatheringstatechange',check);check();
    });
  }
  if(!pc.localDescription?.sdp.includes('a=candidate:'))throw new Error('Unable to establish a WebRTC network path. Try another network.');
}
async function firstFrame(video:HTMLVideoElement,pc:RTCPeerConnection){
  if(video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA&&video.videoWidth>0)return;
  await new Promise<void>((resolve,reject)=>{
    let finished=false;
    const done=(error?:Error)=>{
      if(finished)return;finished=true;
      clearTimeout(timeout);clearInterval(ticker);
      pc.removeEventListener('connectionstatechange',check);
      if(error)reject(error);else resolve();
    };
    const check=()=>{
      if(pc.connectionState==='failed'||pc.connectionState==='closed'){
        done(new Error('Live connection ended before video arrived.'));
      }else if(video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA&&video.videoWidth>0){
        done();
      }
    };
    const timeout=setTimeout(()=>done(new Error('No live video has arrived. Try reconnecting.')),18000);
    const ticker=setInterval(check,250);
    pc.addEventListener('connectionstatechange',check);
    check();
  });
}

export function LiveViewer({eventId,onEnded}:{eventId:number;onEnded?:(timestamp:string|null)=>void}){
  const video=useRef<HTMLVideoElement>(null);
  const connection=useRef<RTCPeerConnection|null>(null);
  const onEndedRef=useRef(onEnded);
  useEffect(()=>{onEndedRef.current=onEnded},[onEnded]);
  const [state,setState]=useState<'loading'|'playing'|'offline'|'error'|'ended'>('loading');
  const [message,setMessage]=useState('');
  const [muted,setMuted]=useState(true);
  const [portrait,setPortrait]=useState(false);
  const [attempt,setAttempt]=useState(0);

  useEffect(()=>{
    let alive=true;
    let terminated=false;
    let checking=false;
    let disconnected:ReturnType<typeof setTimeout>|null=null;
    const clearDisconnect=()=>{if(disconnected){clearTimeout(disconnected);disconnected=null}};
    const close=()=>{
      clearDisconnect();
      connection.current?.close();connection.current=null;
      if(video.current)video.current.srcObject=null;
    };
    const finish=(status:'ended'|'offline',endedAt:string|null)=>{
      if(!alive||terminated)return;
      terminated=true;
      close();
      setState(status);
      setMessage(status==='offline'?'This broadcast is no longer on air.':'');
      if(status==='ended')onEndedRef.current?.(endedAt);
    };
    // Current viewers need a server-authoritative end signal. Poll without caching;
    // the stop API commits actualEnd before the next response.
    async function checkStatus(){
      if(!alive||terminated||checking)return;
      checking=true;
      try{
        const response=await fetch('/api/ogas-live/status?eventId='+eventId,{
          cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}
        });
        if(!response.ok)return; // A temporary network error must never end a broadcast.
        const data=await response.json() as PublicStatus;
        if(data.state==='ended')finish('ended',typeof data.actualEnd==='string'?data.actualEnd:null);
        else if(data.state==='offline')finish('offline',null);
      }catch {
        // Keep playing on transient fetch errors; the next poll can recover.
      }finally{checking=false}
    }
    setState('loading');setMessage('');
    void checkStatus();
    const poll=setInterval(()=>void checkStatus(),2000);
    async function join(){
      try{
        const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
        connection.current=pc;
        pc.addEventListener('connectionstatechange',()=>{
          if(!alive||terminated||pc!==connection.current)return;
          if(pc.connectionState==='connected')clearDisconnect();
          if(pc.connectionState==='failed'||pc.connectionState==='closed'){
            setMessage('The live connection was interrupted. Try reconnecting.');
            setState('error');
          }else if(pc.connectionState==='disconnected'&&!disconnected){
            // Short mobile-network dips need not end a broadcast.
            disconnected=setTimeout(()=>{
              disconnected=null;
              if(alive&&!terminated&&pc.connectionState==='disconnected'){
                setMessage('The connection was interrupted. Try reconnecting.');
                setState('error');
              }
            },7000);
          }
        });
        const stream=new MediaStream();
        pc.addEventListener('track',event=>{
          if(!alive||terminated)return;
          stream.addTrack(event.track);
          if(video.current){
            video.current.srcObject=stream;
            void video.current.play().catch(()=>{});
          }
        });
        const init=await call(eventId,{action:'watch'});
        if(!alive||terminated){pc.close();return}
        await pc.setRemoteDescription(init.sessionDescription);
        await pc.setLocalDescription(await pc.createAnswer());
        await iceDone(pc);
        if(!alive||terminated){pc.close();return}
        await call(eventId,{action:'answer',sessionId:init.sessionId,ticket:init.ticket,sessionDescription:pc.localDescription});
        if(!alive||terminated){pc.close();return}
        const el=video.current;
        if(!el)throw new Error('Live player unavailable');
        void el.play().catch(()=>{});
        await firstFrame(el,pc);
        if(!alive||terminated||pc!==connection.current)return;
        setState('playing');
      }catch(error){
        if(!alive||terminated)return;
        close();
        const msg=error instanceof Error?error.message:'Stream unavailable';
        setMessage(msg);
        setState(msg.toLowerCase().includes('off air')?'offline':'error');
      }
    }
    void join();
    return ()=>{alive=false;terminated=true;clearInterval(poll);close()};
  },[eventId,attempt]);

  return <div className={'ogas-live-viewer'+(portrait?' ogas-live-viewer--portrait':'')}
      style={{background:'#121719',overflow:'hidden',position:'relative',display:'grid',placeItems:'center',color:'#fff'}}>
    <video ref={video} autoPlay playsInline muted={muted} controls={state==='playing'}
      onLoadedMetadata={event=>setPortrait(event.currentTarget.videoHeight>event.currentTarget.videoWidth)}
      style={{width:'100%',height:'100%',objectFit:'contain',display:state==='ended'||state==='offline'?'none':'block'}}/>
    {state!=='playing'&&<div role="status" aria-live="polite"
      style={{position:'absolute',textAlign:'center',padding:'20px',maxWidth:380,display:'grid',gap:8,justifyItems:'center'}}>
      {state==='ended'?<CheckCircle2 size={38} color="#d6e7d8"/>:<Radio size={35}/>}
      <h2 style={{fontSize:'clamp(21px,4.8vw,27px)',lineHeight:1.2,margin:'6px 0 0'}}>
        {state==='loading'?'Connecting to live coverage…':state==='ended'?'This broadcast has ended':state==='offline'?'Broadcast is off air':'Unable to connect'}
      </h2>
      <p style={{fontSize:13,lineHeight:1.5,opacity:.8,margin:0}}>
        {state==='loading'?'Checking the live video feed.':state==='ended'?'Thank you for watching OgasTV Nigeria.':message}
      </p>
      {state==='error'&&<button type="button" onClick={()=>setAttempt(value=>value+1)}
        style={{border:'1px solid #ffffff55',borderRadius:999,color:'#fff',background:'#ffffff17',padding:'10px 16px',marginTop:10,fontWeight:700,cursor:'pointer'}}>Try reconnecting</button>}
    </div>}
    {state==='playing'&&<div style={{position:'absolute',top:13,left:13,background:'#b21e2c',borderRadius:99,padding:'6px 12px',fontSize:11,fontWeight:800}}>● LIVE</div>}
    {state==='playing'&&<button type="button" onClick={()=>setMuted(value=>!value)}
      aria-label={muted?'Unmute broadcast':'Mute broadcast'}
      style={{position:'absolute',right:14,top:14,border:0,background:'#151b1bbb',borderRadius:99,color:'#fff',padding:10,cursor:'pointer'}}>
      {muted?<VolumeX size={18}/>:<Volume2 size={18}/>}
    </button>}
  </div>;
}
