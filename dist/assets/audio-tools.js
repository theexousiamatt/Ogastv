import {AudioRecorder} from './voice.js';
import {safeURL,uid} from './model.js';
const $=id=>document.getElementById(id),formatDuration=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
export function createAudioTools({getStore,getStory,urls,onInsert,isDictating,openDialog,notify}) {
  let recorder=null,pending=null,editing=null,busy=false,method='record',previewURL='',recoveryWrites=Promise.resolve();
  const error=text=>{$('audio-error').textContent=text;$('audio-error').hidden=!text;};
  const active=()=>busy||['requesting','recording','paused'].includes($('audio-dialog').dataset.recordState);
  const showPending=asset=>{pending=asset;$('audio-ready').hidden=!asset;$('audio-insert').disabled=!asset||active();$('audio-file-name').textContent=asset?.name||'';if(previewURL){URL.revokeObjectURL(previewURL);previewURL='';}$('audio-preview').pause();$('audio-preview').removeAttribute('src');if(asset){const src=asset.url||(previewURL=URL.createObjectURL(asset.blob));$('audio-preview').src=src;if(asset.title)$('audio-title').value=asset.title;if(asset.caption)$('audio-caption').value=asset.caption;if(asset.transcript)$('audio-transcript').value=asset.transcript;}};
  const recover=asset=>{const store=getStore(),key=`audio-recovery:${getStory().id}`;if(store){recoveryWrites=recoveryWrites.catch(()=>{}).then(()=>store.setMeta(key,asset)).catch(()=>notify('The recording is in memory. Local recovery storage is unavailable; insert it and download a backup.',{persistent:true}));}return recoveryWrites;};
  function setMethod(next){if(active()){error('Stop recording before switching audio sources.');return;}method=next;document.querySelectorAll('[data-audio-method]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.audioMethod===next)));for(const name of ['record','upload','link'])$(`audio-${name}-panel`).hidden=name!==next;error('');}
  function onRecordState(state,data={}){
    $('audio-dialog').dataset.recordState=state;
    const capturing=['recording','paused'].includes(state),requesting=state==='requesting';
    $('record-start').hidden=capturing;$('record-start').disabled=requesting||!!pending;
    $('record-stop').hidden=!capturing;$('record-pause').hidden=!capturing;$('record-pause').textContent=state==='paused'?'Resume':'Pause';
    $('record-indicator').classList.toggle('active',state==='recording');$('audio-insert').disabled=!pending||capturing||requesting;
    if(data.duration!==undefined)$('record-time').textContent=formatDuration(data.duration);
    $('record-status').textContent=state==='requesting'?'Waiting for microphone permission…':state==='recording'?'Recording. Your clip is kept locally as it is captured.':state==='paused'?'Recording paused.':state==='ready'?'Recording stopped. The microphone is off. Listen, then insert the clip.':'Microphone is off.';
    if(state==='ready'&&data.blob?.size){const asset={id:uid(),kind:'audio',blob:data.blob,name:`Voice note (${formatDuration(data.duration)})`,duration:data.duration,title:$('audio-title').value||'Voice note',caption:$('audio-caption').value,transcript:$('audio-transcript').value};showPending(asset);void recover(asset);$('record-start').disabled=true;}
  }
  $('record-start').onclick=async()=>{
    error('');if(isDictating()){error('Stop dictation before recording an audio clip.');return;}
    if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder||!isSecureContext){error('Microphone recording needs a supported browser on HTTPS or localhost. Upload a clip or use an audio link here.');return;}
    if(pending){error('Insert or discard the current clip before recording another.');return;}
    recorder=new AudioRecorder({onState:onRecordState,onChunk:(blob,duration)=>void recover({id:uid(),kind:'audio',blob,duration,name:'Recovered voice note',title:$('audio-title').value||'Voice note'}),onError:e=>error(e.name==='NotAllowedError'?'Microphone access was not allowed. Enable it in your browser’s site settings, or upload an audio file.':e.name==='NotFoundError'?'No microphone was found. Connect one or upload an audio file.':e.message||'Recording failed. Try again or upload a clip.')});await recorder.start();
  };
  $('record-stop').onclick=()=>recorder?.stop();$('record-pause').onclick=()=>recorder?.pause();
  document.querySelectorAll('[data-audio-method]').forEach(b=>b.onclick=()=>setMethod(b.dataset.audioMethod));
  $('audio-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;error('');if(file.size>40*1024*1024||(!file.type.startsWith('audio/')&&!/\.(mp3|m4a|wav|ogg|webm)$/i.test(file.name))){error('Choose an audio file up to 40 MB (MP3, M4A, WAV, OGG or WebM).');return;}const asset={id:uid(),kind:'audio',blob:file,name:file.name,title:file.name.replace(/\.[^.]+$/,'')};showPending(asset);await recover(asset);};
  $('audio-load-url').onclick=async()=>{error('');const url=safeURL($('audio-url').value.trim(),true);if(!url){error('Enter a direct HTTPS audio URL. Links cannot contain usernames or passwords.');return;}if(/(^|\.)(spotify\.com|soundcloud\.com)$/i.test(new URL(url).hostname)){error('Use a direct audio file URL, not a Spotify or SoundCloud page. You can also upload the audio file.');return;}const asset={id:uid(),kind:'audio',url,name:new URL(url).pathname.split('/').pop()||'Linked audio',title:$('audio-title').value||'Audio clip'};showPending(asset);await recover(asset);};
  $('audio-preview').onerror=()=>error('This clip could not be loaded or decoded. Check the audio URL or try an MP3 file.');
  $('discard-audio').onclick=async()=>{showPending(null);editing=null;$('audio-title').value='';$('audio-caption').value='';$('audio-transcript').value='';$('record-start').disabled=false;await recover(null);onRecordState('idle');};
  $('audio-insert').onclick=async()=>{if(!pending||active())return;error('');busy=true;$('audio-insert').disabled=true;
    try{await onInsert({...pending,id:editing||pending.id,title:$('audio-title').value.trim()||pending.name||'Audio clip',caption:$('audio-caption').value.trim(),transcript:$('audio-transcript').value.trim()});await recover(null);showPending(null);editing=null;$('audio-dialog').close();notify('Audio clip added to the story.');}catch(e){error(e.message);}finally{busy=false;$('audio-insert').disabled=!pending;}
  };
  $('audio-dialog').addEventListener('cancel',()=>{if(active())void recorder?.cancel();});
  $('audio-dialog').addEventListener('close',()=>{if(active())void recorder?.cancel();$('audio-preview').pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active())void recorder?.stop();});
  return {
    active,
    async open(asset){
      if(isDictating()){notify('Stop dictation before opening audio recording.');return;}
      error('');editing=asset?.id||null;$('audio-title').value='';$('audio-caption').value='';$('audio-transcript').value='';onRecordState('idle');
      const recovery=asset||await getStore()?.getMeta(`audio-recovery:${getStory().id}`);
      showPending(recovery||null);if(recovery&&!asset)$('record-status').textContent='A previous clip was recovered. Listen, then insert it or discard it.';
      setMethod(asset?.url?'link':asset?'upload':'record');
      const available=!!navigator.mediaDevices?.getUserMedia&&!!globalThis.MediaRecorder&&isSecureContext;$('record-capability').textContent=available?'The browser will ask for microphone access when you start.':'Recording is unavailable in this browser or connection. Upload audio or use a link instead.';$('record-start').disabled=!available||!!pending;
      openDialog('audio-dialog');
    },
    async stop(){await recorder?.cancel();},
    async flushRecovery(){await recoveryWrites;}
  };
}
