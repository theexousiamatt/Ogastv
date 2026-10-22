const q=new URLSearchParams(location.search);
if(!q.has('workspace'))history.replaceState(null,'','?workspace=voice-ui-test');
const mode=q.get('mode');
if(mode==='storage-error')Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){const r={};queueMicrotask(()=>{r.error=new DOMException('Test storage unavailable','UnknownError');r.onerror?.();});return r;}}});
if(mode==='unsupported'){Object.defineProperty(window,'SpeechRecognition',{value:undefined,configurable:true});Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined,configurable:true});Object.defineProperty(window,'MediaRecorder',{value:undefined,configurable:true});}
else{
 class Recognition{
  constructor(){Recognition.active=this;this.results=[];}
  start(){queueMicrotask(()=>this.onstart?.());}
  stop(){queueMicrotask(()=>this.onend?.());}
  abort(){this.onend?.();}
 }
 Object.defineProperty(window,'SpeechRecognition',{value:Recognition,configurable:true});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
  if(mode==='denied')throw new DOMException('Test denied','NotAllowedError');
  const context=new AudioContext();await context.resume();const oscillator=context.createOscillator(),destination=context.createMediaStreamDestination();oscillator.frequency.value=220;oscillator.connect(destination);oscillator.start();const stream=destination.stream;
  for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{stop();oscillator.stop();void context.close();};}return stream;
 }}});
 document.querySelector('#test-final').onclick=()=>{const r=Recognition.active;if(!r)return;const result=Object.assign([{transcript:'This sentence was dictated into the story.'}],{isFinal:true});r.results=[result];r.onresult?.({resultIndex:0,results:r.results});};
 document.querySelector('#test-repeat').onclick=()=>{const r=Recognition.active;r?.onresult?.({resultIndex:0,results:r.results});};
 document.querySelector('#test-denied').onclick=()=>{Recognition.active?.onerror?.({error:'not-allowed'});Recognition.active?.onend?.();};
}
await import('../dist/assets/editor.js');
