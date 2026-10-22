import {recordMime,mergeSpeech} from './model.js';
export class AudioRecorder {
  constructor({getStream=()=>navigator.mediaDevices.getUserMedia({audio:true}),Recorder=globalThis.MediaRecorder,onState=()=>{},onChunk=()=>{},onError=()=>{}}={}) {Object.assign(this,{getStream,Recorder,onState,onChunk,onError});this.cancelled=false;this.chunks=[];this.elapsed=0;}
  async start() {
    this.cancelled=false;this.onState('requesting');
    try {
      const stream=await this.getStream();
      if(this.cancelled){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;const mimeType=recordMime(this.Recorder);
      this.recorder=new this.Recorder(stream,mimeType?{mimeType,audioBitsPerSecond:96000}:undefined);
      this.started=performance.now();this.pausedAt=0;this.pauseTotal=0;
      this.recorder.ondataavailable=e=>{if(e.data.size){this.chunks.push(e.data);this.onChunk(this.blob(),this.duration());}if(this.chunks.reduce((n,b)=>n+b.size,0)>40*1024*1024)this.stop();};
      this.recorder.onerror=e=>{this.onError(e.error||Error('Recording stopped unexpectedly. Your captured clip is kept.'));this.stop();};
      this.done=new Promise(resolve=>{this.recorder.onstop=()=>{this.elapsed=this.duration();this.release();const blob=this.blob();this.onState('ready',{blob,duration:this.elapsed});resolve(blob);};});
      this.recorder.start(1000);this.timer=setInterval(()=>{this.onState(this.recorder.state,{duration:this.duration()});if(this.duration()>=900)this.stop();},250);this.onState('recording',{duration:0});
    } catch(error){this.release();this.onState('idle');if(!this.cancelled)this.onError(error);}
  }
  duration(){const end=this.recorder?.state==='paused'?this.pausedAt:performance.now();return this.started?Math.max(0,(end-this.started-this.pauseTotal)/1000):this.elapsed;}
  blob(){return new Blob(this.chunks,{type:this.recorder?.mimeType||this.chunks[0]?.type||'audio/webm'});}
  pause(){if(this.recorder?.state==='recording'){this.pausedAt=performance.now();this.recorder.pause();this.onState('paused',{duration:this.duration()});}else if(this.recorder?.state==='paused'){this.pauseTotal+=performance.now()-this.pausedAt;this.recorder.resume();this.onState('recording',{duration:this.duration()});}}
  async stop(){if(this.recorder&&this.recorder.state!=='inactive'){if(this.recorder.state==='paused')this.pauseTotal+=performance.now()-this.pausedAt;this.recorder.stop();return this.done;}this.cancelled=true;this.release();this.onState('idle');}
  release(){clearInterval(this.timer);this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;}
  cancel(){this.cancelled=true;return this.stop();}
}
export class Dictation {
  constructor({Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition,onState=()=>{},onText=()=>{},onInterim=()=>{},onError=()=>{}}={}){Object.assign(this,{Recognition,onState,onText,onInterim,onError});}
  start(language='en-NG'){
    if(!this.Recognition)throw Error('Browser dictation is unavailable. You can still type or use your keyboard’s dictation.');
    const recognition=this.recognition=new this.Recognition(),committed=new Set();recognition.lang=language;recognition.continuous=true;recognition.interimResults=true;
    recognition.onstart=()=>this.onState('listening');
    recognition.onresult=event=>{const result=mergeSpeech(event,committed);if(result.final)this.onText(result.final);this.onInterim(result.interim);};
    recognition.onerror=event=>{this.onError(event.error);this.onState('idle');};
    recognition.onend=()=>{this.onInterim('');this.onState('idle');};
    this.onState('starting');try{recognition.start();}catch(error){this.onState('idle');throw error;}
  }
  stop(){this.recognition?.stop();}
  abort(){this.recognition?.abort();}
}
