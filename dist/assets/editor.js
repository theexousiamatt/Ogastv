import {newStory,uid,cleanHTML,storyText,wordCount,validateStory,transition,statuses,escapeHTML,safeURL} from './model.js';
import {openWorkspace} from './storage.js';
import {MediaURLs,prepareImage,cropImage,createFigure,hydrateMedia,readerMarkup} from './media.js';
import {createAudioTools} from './audio-tools.js';
import {createDictationTools} from './dictation-tools.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),workspace=params.get('workspace')?.replace(/[^a-z0-9-]/gi,'').slice(0,80),dbName='ogas-writer-desk-v1'+(workspace?`-${workspace}`:'');
const content=$('content'),urls=new MediaURLs();
const compactDesk=matchMedia('(max-width: 860px)');
function setFormattingOpen(open){$('formatting-extra').hidden=compactDesk.matches&&!open;$('formatting-toggle').setAttribute('aria-expanded',String(open));$('formatting-toggle').querySelector('span').textContent=open?'Less formatting':'More formatting';$('formatting-toggle').lastElementChild.textContent=open?'−':'+';}
$('formatting-toggle').onclick=()=>{rememberSelection();setFormattingOpen($('formatting-toggle').getAttribute('aria-expanded')!=='true');};
document.querySelector('.toolbar').addEventListener('keydown',e=>{if(e.key==='Escape'&&compactDesk.matches){setFormattingOpen(false);$('formatting-toggle').focus();e.stopPropagation();}});
compactDesk.addEventListener('change',()=>setFormattingOpen(false));
setFormattingOpen(false);

let store=null,story=null,role='writer',generation=0,savedGeneration=0,saveTimer=null,historyTimer=null,saveQueue=Promise.resolve(),saving=0,saveFailure=false,selection=null,imageDraft=null,imageTarget='cover',listMode=false,allStories=[],imageBusy=false,lastFocus=null,toastTimer=null;
let past=[],future=[],lastHistory=null;
let tabId;
try{tabId=sessionStorage.getItem('ogas-tab')||uid();sessionStorage.setItem('ogas-tab',tabId);}catch{tabId=uid();}
const recoveryKey=`${dbName}:recovery:${tabId}`;
const snapshot=()=>structuredClone({...story,html:cleanHTML(content.innerHTML,story.media.map(m=>m.id))});
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
function notify(text,{persistent=false}={}){clearTimeout(toastTimer);$('toast').replaceChildren();const message=document.createElement('span');message.textContent=text;$('toast').append(message);if(persistent){const close=document.createElement('button');close.type='button';close.textContent='Dismiss';close.onclick=()=>$('toast').replaceChildren();$('toast').append(close);}else toastTimer=setTimeout(()=>$('toast').textContent='',5000);}
function showError(error){saveFailure=true;$('save-status').textContent='Not saved — download a backup';$('storage-error').hidden=false;$('storage-error-copy').textContent=error?.message||String(error);}
function emergencySave(){if(!story)return;try{const current=snapshot();localStorage.setItem(recoveryKey,JSON.stringify({id:current.id,headline:current.headline,html:current.html,section:current.section,byline:current.byline,source:current.source,coverId:current.coverId,status:current.status,baseRevision:story.revision,updatedAt:current.updatedAt,mediaIds:current.media.map(m=>m.id)}));}catch{/* IndexedDB remains authoritative; the UI never claims emergency storage succeeded. */}}
function updateSavedLabel(){if(saveFailure)return;$('save-status').textContent=saving?'Saving on this browser…':generation!==savedGeneration?'Unsaved changes':`Saved on this browser${story?.updatedAt?' at '+new Date(story.updatedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):''}`;}
async function save(manual=false){
  if(!story)return;
  clearTimeout(saveTimer);const capture=snapshot(),capturedGeneration=generation;
  const job=saveQueue.catch(()=>{}).then(async()=>{
    if(!store)throw Error('Browser storage is unavailable. Download a story backup to keep this work.');
    if(capturedGeneration<=savedGeneration&&capture.id===story?.id){if(manual)notify('Your draft and media are saved on this browser.');return;}
    if(!store)throw Error('Browser storage is unavailable. Download a story backup to keep this work.');
    saving++;updateSavedLabel();
    try{
      const result=await store.save(capture,story.id===capture.id?story.revision:capture.revision);
      if(story.id===capture.id){story.revision=result.revision;savedGeneration=Math.max(savedGeneration,capturedGeneration);saveFailure=false;$('storage-error').hidden=true;if(generation===capturedGeneration){try{localStorage.removeItem(recoveryKey);}catch{}}}
      if(manual)notify('Draft and media saved on this browser.');
    }finally{saving--;updateSavedLabel();}
  });
  saveQueue=job;try{await job;}catch(error){showError(error);throw error;}
}
function checkpoint(){clearTimeout(historyTimer);if(!story)return;const next=snapshot();if(JSON.stringify({...next,revision:0,updatedAt:0})!==JSON.stringify({...lastHistory,revision:0,updatedAt:0})){past.push(lastHistory);if(past.length>30)past.shift();lastHistory=next;future=[];}updateUndo();}
function updateUndo(){$('undo').disabled=!past.length;$('redo').disabled=!future.length;}
function changed({immediate=false,reopen=true}={}){
  if(!story)return;
  if(reopen&&['review','approved'].includes(story.status)){story.status='draft';notify('Editing reopened this as a draft. Submit it again when it is ready.');}
  story.html=cleanHTML(content.innerHTML,story.media.map(m=>m.id));story.updatedAt=Date.now();generation++;saveFailure=false;updateSavedLabel();updateSummary();emergencySave();
  clearTimeout(historyTimer);if(immediate)checkpoint();else historyTimer=setTimeout(checkpoint,350);
  clearTimeout(saveTimer);saveTimer=setTimeout(()=>void save().catch(()=>{}),650);
}
function updateSummary(){
  if(!story)return;$('word-count').textContent=`${wordCount(content.innerHTML)} words`;$('draft-status').textContent=statuses[story.status]||'Draft';$('draft-status').dataset.status=story.status;$('details-summary').textContent=`${story.section} · ${story.byline||'Add byline'}`;
  const cover=story.media.find(m=>m.id===story.coverId),checks=[['Headline',!!story.headline.trim()],['Story text',!!storyText(content.innerHTML)],['Featured image',!!cover],['Image descriptions',story.media.filter(m=>m.kind==='image').every(m=>!!m.alt?.trim())&&!!cover]];
  $('readiness').innerHTML=checks.map(([label,done])=>`<li class="${done?'done':''}"><span class="check-mark" role="img" aria-label="${done?'Complete':'Missing'}">${done?icon('check'):''}</span>${label}</li>`).join('');
  const approved=story.status==='approved',reviewing=story.status==='review';
  $('submit-story').textContent=approved?'Reopen draft':reviewing?'In review':story.status==='changes'?'Resubmit for review':'Submit for review';$('submit-story').disabled=reviewing;$('mobile-submit').textContent=role==='editor'&&reviewing?'Review story':$('submit-story').textContent;$('mobile-submit').disabled=reviewing&&role!=='editor';
  $('review-panel').hidden=role!=='editor'||!reviewing;$('writing-actions').hidden=role==='editor'&&reviewing;$('workflow-description').textContent=approved?'Approved in this local preview. A CMS connection is needed to publish online.':reviewing?'This story is in the local review queue. Switch to the editor preview to leave feedback.':'Save your reporting, preview the article, then send it for review.';
  $('comments-panel').hidden=!story.comments.length;$('review-comments').innerHTML=story.comments.map(c=>`<div class="review-comment"><small>${escapeHTML(c.role==='editor'?'Editor':'Writer')} · ${new Date(c.createdAt).toLocaleString()}</small><p>${escapeHTML(c.text)}</p></div>`).join('');
  const last=story.comments.at(-1);$('feedback-banner').hidden=story.status!=='changes';if(story.status==='changes')$('feedback-banner').innerHTML=`<strong>Changes requested</strong><p>${escapeHTML(last?.text||'Review the editor’s feedback below.')}</p>`;
  $('media-count').textContent=`(${story.media.length})`;
}
function connection(){const offline=!navigator.onLine;$('connection-status').textContent=offline?' · Offline — drafts still save locally':'';}
function rememberSelection(){const selected=window.getSelection();if(selected?.rangeCount&&content.contains(selected.anchorNode)){const range=selected.getRangeAt(0);if(content.contains(range.commonAncestorContainer))selection=range.cloneRange();}}
function restoreSelection(){content.focus({preventScroll:true});const selected=window.getSelection();selected.removeAllRanges();try{if(selection&&content.contains(selection.commonAncestorContainer)){selected.addRange(selection);return;}}catch{}const range=document.createRange();range.selectNodeContents(content);range.collapse(false);selected.addRange(range);selection=range.cloneRange();}
function insertHTML(html){restoreSelection();if(!document.execCommand('insertHTML',false,html)){const range=window.getSelection().getRangeAt(0);range.deleteContents();const fragment=range.createContextualFragment(html),last=fragment.lastChild;range.insertNode(fragment);if(last){range.setStartAfter(last);range.collapse(true);window.getSelection().removeAllRanges();window.getSelection().addRange(range);}}rememberSelection();changed({immediate:true});}
function insertDictatedText(text){
  restoreSelection();const selected=window.getSelection(),range=selected.getRangeAt(0),before=range.cloneRange();before.selectNodeContents(content);before.setEnd(range.startContainer,range.startOffset);const prefix=before.toString(),value=(prefix&&!/\s$/.test(prefix)?' ':'')+text+' ';
  if(!document.execCommand('insertText',false,value)){const node=document.createTextNode(value);range.deleteContents();range.insertNode(node);range.setStartAfter(node);range.collapse(true);selected.removeAllRanges();selected.addRange(range);}rememberSelection();changed({immediate:true});
}
function openDialog(id){rememberSelection();lastFocus=document.activeElement;$(id).showModal();}
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{dialog.querySelectorAll('audio').forEach(a=>a.pause());if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}));
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$(button.dataset.close).close());
function renderBody(html=story.html){content.innerHTML=cleanHTML(html,story.media.map(m=>m.id));hydrateMedia(content,story,urls,{editable:true,onRemove:figure=>{figure.remove();selection=null;changed({immediate:true});}});}
function renderCover(){
  const cover=story.media.find(m=>m.id===story.coverId);$('cover-display').replaceChildren();$('cover-zone').classList.toggle('has-image',!!cover);$('cover-add').hidden=!!cover;$('cover-edit').hidden=!cover;$('cover-remove').hidden=!cover;$('cover-help').hidden=!!cover;
  if(cover)$('cover-display').append(createFigure(cover,urls));
}
function renderAttachments(){const target=$('attachment-list');target.replaceChildren();for(const file of story.media.filter(m=>m.kind==='attachment')){const row=document.createElement('div');row.className='attachment';const link=document.createElement('a');link.href=urls.get(file.blob);link.download=file.name;link.textContent=file.name;const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${file.name}`);remove.onclick=()=>{story.media=story.media.filter(m=>m.id!==file.id);renderAttachments();changed({immediate:true});};row.append(link,remove);target.append(row);}}
function fitHeadline(){const field=$('headline');field.style.height='auto';if(field.offsetWidth)field.style.height=field.scrollHeight+'px';}
function renderStory(){
  $('headline').value=story.headline;fitHeadline();$('category').value=story.section;$('byline').value=story.byline;$('source-url').value=story.source;renderBody();renderCover();renderAttachments();updateSummary();updateSavedLabel();$('page-title').textContent=story.headline?'Edit story':'New story';document.title=`${story.headline||'New story'} — OGAs TV Africa`;clearValidation();
}
function clearValidation(){$('validation').hidden=true;for(const id of ['headline','content','byline','source-url'])$(id).removeAttribute('aria-invalid');for(const id of ['headline-error','content-error','byline-error','source-error','cover-error'])$(id).hidden=true;}
function showValidation(errors){clearValidation();$('validation').innerHTML=`<strong>Check these details first</strong><ul>${errors.map(e=>`<li>${escapeHTML(e.message)}</li>`).join('')}</ul>`;$('validation').hidden=false;const map={headline:'headline-error',content:'content-error',byline:'byline-error','source-url':'source-error','cover-add':'cover-error'};for(const e of errors){$(e.field)?.setAttribute('aria-invalid','true');const el=$(map[e.field]);if(el){el.textContent=e.message;el.hidden=false;}}if(errors.some(e=>['byline','source-url'].includes(e.field)))$('story-details').open=true;$(errors[0]?.field)?.focus();}
async function loadStory(next,{newlyCreated=false}={}){
  dictation?.abort();await audio?.stop();await audio?.flushRecovery();checkpoint();urls.clear();story=next;selection=null;past=[];future=[];generation=newlyCreated?1:0;savedGeneration=0;saveFailure=false;$('storage-error').hidden=true;renderStory();lastHistory=snapshot();updateUndo();
  if(store&&!newlyCreated)await store.setMeta('active-story',story.id);if(newlyCreated)await save();
}
async function newDraft(){if(story)await save();await loadStory(newStory(story?.byline||'Desk Editor'),{newlyCreated:true});history.pushState(null,'',`#story/${story.id}`);showEditor();await refreshList();$('headline').focus();}
function showEditor(){setFormattingOpen(false);document.title=`${story.headline||'New story'} — OGAs TV Africa`;listMode=false;$('list-view').hidden=true;$('editor-view').hidden=false;$('mobile-actions').hidden=false;$('desk-nav').classList.remove('open');$('nav-toggle').setAttribute('aria-expanded','false');$('nav-toggle').setAttribute('aria-label','Open navigation');fitHeadline();document.querySelectorAll('[data-route]').forEach(a=>a.setAttribute('aria-current',a.dataset.route==='new'?'page':'false'));}
async function refreshList(){if(!store)return;allStories=await store.list();$('story-count').textContent=allStories.length;$('review-count').textContent=allStories.filter(s=>s.status==='review').length;if(listMode)renderList();}
function renderList(){
  const review=location.hash==='#review',search=$('story-search').value.toLowerCase(),filter=$('story-filter').value;
  const stories=allStories.filter(s=>(!review||['review','changes'].includes(s.status))&&(filter==='all'||s.status===filter)&&(!search||`${s.headline} ${s.byline}`.toLowerCase().includes(search)));
  $('list-title').textContent=review?'Review queue':'My stories';$('list-description').textContent=review?'Review and feedback in this browser. Nothing is sent to the live site.':'Your drafts and media, saved on this browser.';
  $('story-list').innerHTML=stories.length?stories.map(s=>`<div class="story-row"><div><h2>${escapeHTML(s.headline||'Untitled story')}</h2><p>${escapeHTML(s.byline)} · ${escapeHTML(s.section)} · ${new Date(s.updatedAt).toLocaleString()}</p></div><div><span class="status" data-status="${s.status}">${escapeHTML(statuses[s.status])}</span><a class="button" href="#story/${s.id}">Open story</a></div></div>`).join(''):`<div class="empty-list"><h2>${search?'No matching stories':review?'No stories waiting here':'Your next story starts here'}</h2><p>${search?'Try another headline or byline.':review?'Submit a draft for review to see it here.':'Start a draft. It will save as you write.'}</p><button class="button primary" data-new-story>New story</button></div>`;
}
async function route(){
  if(location.hash==='#main'){$('main').focus();return;}
  try{
    if(['#stories','#review','#dashboard'].includes(location.hash)){
      dictation.abort();await audio.stop();await audio.flushRecovery();await save();listMode=true;$('editor-view').hidden=true;$('mobile-actions').hidden=true;$('list-view').hidden=false;await refreshList();renderList();$('list-title').focus();document.title=`${$('list-title').textContent} — OGAs TV Africa`;
    }else{
      const id=location.hash.match(/^#story\/([a-f0-9-]+)$/)?.[1];if(location.hash==='#new'){await newDraft();return;}
      if(id&&id!==story.id){await save();const target=await store?.read(id);if(!target){notify('This story was not found on this browser.');history.replaceState(null,'',`#story/${story.id}`);}else await loadStory(target);}
      showEditor();$('page-title').focus();
    }
    $('desk-nav').classList.remove('open');$('nav-toggle').setAttribute('aria-expanded','false');$('nav-toggle').setAttribute('aria-label','Open navigation');document.querySelectorAll('[data-route]').forEach(a=>{const current=listMode?(location.hash==='#review'?'review':'stories'):'new';if(a.dataset.route===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  }catch(e){showError(e);}
}
function ensureMediaBudget(asset){const total=story.media.filter(m=>m.id!==asset.id).reduce((n,m)=>n+(m.blob?.size||0)+(m.displayBlob?.size||0),0)+(asset.blob?.size||0)+(asset.displayBlob?.size||0);if(total>80*1024*1024)throw Error('This story exceeds the 80 MB local media limit. Use smaller files or link to hosted audio.');}
async function commitMedia(asset,{cover=false}={}){
  checkpoint();ensureMediaBudget(asset);const existing=story.media.some(m=>m.id===asset.id);
  if(existing)story.media=story.media.map(m=>m.id===asset.id?asset:m);else story.media=[...story.media,asset];
  if(cover){story.coverId=asset.id;renderCover();}
  else if(existing){hydrateMedia(content,story,urls,{editable:true,onRemove:figure=>{figure.remove();changed({immediate:true});}});if(story.coverId===asset.id)renderCover();}
  else insertHTML(`<figure data-media-id="${asset.id}" contenteditable="false"></figure><p><br></p>`);
  hydrateMedia(content,story,urls,{editable:true,onRemove:figure=>{figure.remove();changed({immediate:true});}});changed({immediate:true});await save();
}
let dictation,audio;
dictation=createDictationTools({insertText:insertDictatedText,saveSelection:rememberSelection,isRecording:()=>audio?.active(),notify,save:()=>save().catch(()=>{})});
audio=createAudioTools({getStore:()=>store,getStory:()=>story,urls,onInsert:asset=>commitMedia(asset),isDictating:()=>dictation.active(),openDialog,notify});
$('audio-open').onclick=()=>{rememberSelection();void audio.open();};
function openImage(asset,target='inline'){
  imageDraft=structuredClone(asset);imageTarget=target;$('image-dialog-title').textContent=target==='cover'?'Prepare featured image':'Prepare story image';$('crop-enabled').checked=asset.crop?.enabled??target==='cover';$('crop-x').value=asset.crop?.x??50;$('crop-y').value=asset.crop?.y??50;$('image-alt').value=asset.alt||'';$('image-caption').value=asset.caption||'';$('image-credit').value=asset.credit||'';$('crop-preview').src=urls.get(asset.blob);$('image-error').hidden=true;$('image-size').textContent=`${asset.width} × ${asset.height} px · ${Math.round(asset.blob.size/1024)} KB prepared${asset.originalSize?` (original ${Math.round(asset.originalSize/1024)} KB)`:''}`;updateCrop();openDialog('image-dialog');
}
function updateCrop(){$('crop-controls').hidden=!$('crop-enabled').checked;$('crop-preview').style.objectFit=$('crop-enabled').checked?'cover':'contain';$('crop-preview').style.objectPosition=`${$('crop-x').value}% ${$('crop-y').value}%`;}
for(const id of ['crop-enabled','crop-x','crop-y'])$(id).addEventListener('input',updateCrop);
let imageDestination='cover';
function chooseImage(target){rememberSelection();imageDestination=target;$('image-input').click();}
$('cover-add').onclick=()=>chooseImage('cover');$('inline-image').onclick=()=>chooseImage('inline');$('cover-edit').onclick=()=>openImage(story.media.find(m=>m.id===story.coverId),'cover');
$('cover-remove').onclick=()=>{checkpoint();story.coverId=null;renderCover();changed({immediate:true});};
async function handleImage(file,target){if(imageBusy)return;imageBusy=true;try{notify('Preparing image…');const asset=await prepareImage(file);asset.crop.enabled=target==='cover';openImage(asset,target);}catch(e){notify(e.message,{persistent:true});}finally{imageBusy=false;}}
$('image-input').onchange=e=>{const file=e.target.files[0];e.target.value='';if(file)void handleImage(file,imageDestination);};
$('image-form').onsubmit=async e=>{e.preventDefault();if(!imageDraft||imageBusy)return;if(!$('image-alt').value.trim()){$('image-error').textContent='Add a short description of the image.';$('image-error').hidden=false;$('image-alt').focus();return;}imageBusy=true;$('image-apply').disabled=true;
  try{const crop={enabled:$('crop-enabled').checked,x:Number($('crop-x').value),y:Number($('crop-y').value)},asset={...imageDraft,crop,alt:$('image-alt').value.trim(),caption:$('image-caption').value.trim(),credit:$('image-credit').value.trim()};asset.displayBlob=await cropImage(asset,crop);await commitMedia(asset,{cover:imageTarget==='cover'});$('image-dialog').close();notify('Image prepared and saved with the story.');}catch(error){$('image-error').textContent=error.message;$('image-error').hidden=false;}finally{imageBusy=false;$('image-apply').disabled=false;}
};
for(const [element,target] of [[$('cover-zone'),'cover'],[content,'inline']]){
  element.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();element.classList.add('drag-over');}});element.addEventListener('dragleave',()=>element.classList.remove('drag-over'));
  element.addEventListener('drop',e=>{if(!e.dataTransfer.files.length)return;e.preventDefault();element.classList.remove('drag-over');const file=e.dataTransfer.files[0];rememberSelection();void handleImage(file,target);});
}
content.addEventListener('paste',e=>{const image=[...e.clipboardData.files].find(f=>f.type.startsWith('image/'));if(image){e.preventDefault();rememberSelection();void handleImage(image,'inline');return;}const html=e.clipboardData.getData('text/html'),text=e.clipboardData.getData('text/plain');if(html||text){e.preventDefault();rememberSelection();insertHTML(html?cleanHTML(html):text.split(/\n/).map(line=>`<p>${escapeHTML(line)||'<br>'}</p>`).join(''));if(html&&/<img\b|<iframe\b/i.test(html))notify('Text pasted. Add images or audio using the media buttons to keep them saved with the draft.',{persistent:true});}});
content.addEventListener('input',()=>changed());document.addEventListener('selectionchange',rememberSelection);
$('headline').addEventListener('input',()=>{const field=$('headline');field.value=field.value.replace(/[\r\n]+/g,' ');fitHeadline();});
for(const id of ['headline','category','byline','source-url'])$(id).addEventListener('input',()=>{story[id==='category'?'section':id==='source-url'?'source':id]=$(id).value;changed();});
$('byline').addEventListener('change',()=>{if(story.byline.trim())void store?.setMeta('byline',story.byline.trim());});
document.querySelectorAll('[data-command]').forEach(button=>{button.onmousedown=e=>e.preventDefault();button.onclick=()=>{restoreSelection();document.execCommand(button.dataset.command,false);rememberSelection();changed({immediate:true});};});
$('format-block').onchange=e=>{restoreSelection();document.execCommand('formatBlock',false,e.target.value);rememberSelection();changed({immediate:true});e.target.value='P';};
$('alignment').onchange=e=>{restoreSelection();document.execCommand(e.target.value,false,null);rememberSelection();changed({immediate:true});e.target.value='justifyLeft';};
$('add-link').onclick=()=>{rememberSelection();$('link-panel').hidden=false;$('link-error').hidden=true;$('link-url').value='';$('link-url').focus();};$('cancel-link').onclick=()=>{$('link-panel').hidden=true;restoreSelection();};
$('insert-link').onclick=()=>{const url=safeURL($('link-url').value.trim());if(!url){$('link-error').textContent='Use a complete http or https link.';$('link-error').hidden=false;return;}restoreSelection();const selected=window.getSelection().toString();if(selected)document.execCommand('createLink',false,url);else insertHTML(`<a href="${escapeHTML(url)}">${escapeHTML(url)}</a>`);$('link-panel').hidden=true;rememberSelection();changed({immediate:true});};
function undo(){checkpoint();if(!past.length)return;future.push(snapshot());const previous=past.pop();story={...previous,revision:story.revision};renderStory();lastHistory=snapshot();generation++;emergencySave();void save().catch(()=>{});updateUndo();}
function redo(){if(!future.length)return;past.push(snapshot());const next=future.pop();story={...next,revision:story.revision};renderStory();lastHistory=snapshot();generation++;emergencySave();void save().catch(()=>{});updateUndo();}
$('undo').onclick=undo;$('redo').onclick=redo;
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void save(true).catch(()=>{});}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!document.querySelector('dialog[open]')&&(!e.target.matches('input,textarea')||e.target===content)){e.preventDefault();e.shiftKey?redo():undo();}});
$('save').onclick=$('mobile-save').onclick=$('review-save').onclick=()=>void save(true).catch(()=>{});$('storage-retry').onclick=async()=>{try{store ||= await openWorkspace(dbName);if(!generation)generation=1;await save(true);}catch(e){showError(e);}};
function preview(){rememberSelection();const phone=compactDesk.matches;$('reader-article').classList.toggle('phone',phone);$('preview-phone').setAttribute('aria-pressed',String(phone));$('preview-desktop').setAttribute('aria-pressed',String(!phone));const draft=snapshot();$('reader-article').innerHTML=readerMarkup(draft,cleanHTML(draft.html,draft.media.map(m=>m.id)));const cover=draft.media.find(m=>m.id===draft.coverId);if(cover)$('reader-cover').append(createFigure(cover,urls));hydrateMedia($('reader-article'),draft,urls);openDialog('reader-dialog');}
$('preview-open').onclick=$('mobile-preview').onclick=$('review-preview').onclick=preview;
for(const mode of ['desktop','phone'])$(`preview-${mode}`).onclick=()=>{$('reader-article').classList.toggle('phone',mode==='phone');for(const other of ['desktop','phone'])$(`preview-${other}`).setAttribute('aria-pressed',String(mode===other));};
async function workflow(action){
  if(audio.active()||dictation.active()){notify('Stop recording or dictation before changing review status.');return;}
  checkpoint();const draft=snapshot(),errors=validateStory(draft,action==='approve');if(action!=='changes'&&action!=='reopen'&&errors.length){showValidation(errors);return;}
  try{story=transition(draft,action,role,$('review-note').value);$('review-error').hidden=true;$('review-note').value='';clearValidation();generation++;story.updatedAt=Date.now();updateSummary();checkpoint();emergencySave();await save();await refreshList();notify(action==='submit'?'Submitted to the local review queue.':action==='changes'?'Feedback saved. The writer can revise and resubmit.':action==='approve'?'Approved locally. Nothing was published online.':'Story reopened as a draft.');}catch(error){$('review-error').textContent=error.message;$('review-error').hidden=false;}
}
$('submit-story').onclick=()=>void workflow(story.status==='approved'?'reopen':'submit');$('mobile-submit').onclick=()=>{if(role==='editor'&&story.status==='review'){$('review-note').focus();$('review-panel').scrollIntoView({block:'center',behavior:'auto'});}else void workflow(story.status==='approved'?'reopen':'submit');};$('request-changes').onclick=()=>void workflow('changes');$('approve-story').onclick=()=>void workflow('approve');$('story-form').onsubmit=e=>{e.preventDefault();void save(true).catch(()=>{});};
$('preview-role').onchange=()=>{role=$('preview-role').value;updateSummary();void store?.setMeta('role',role);};
$('supporting-files').onchange=async e=>{const files=[...e.target.files];e.target.value='';try{checkpoint();const additions=[];for(const file of files){if(file.size>25*1024*1024)throw Error(`${file.name} is over the 25 MB attachment limit.`);const asset={id:uid(),kind:'attachment',blob:file,name:file.name};ensureMediaBudget(asset);additions.push(asset);}if(story.media.reduce((n,m)=>n+(m.blob?.size||0)+(m.displayBlob?.size||0),0)+additions.reduce((n,m)=>n+m.blob.size,0)>80*1024*1024)throw Error('These files exceed the 80 MB story limit.');story.media.push(...additions);renderAttachments();changed({immediate:true});await save();notify('Supporting files saved with the draft.');}catch(error){notify(error.message,{persistent:true});}};
function manageMedia(){const root=$('media-list');root.replaceChildren();if(!story.media.length){const p=document.createElement('p');p.textContent='No media yet. Add an image, audio clip or supporting file to this story.';root.append(p);}for(const asset of story.media){const item=document.createElement('section');item.className='media-item';const title=document.createElement('h3');title.textContent=asset.title||asset.name;item.append(title);if(['audio','image'].includes(asset.kind))item.append(createFigure(asset,urls));const actions=document.createElement('div');actions.className='media-actions';if(asset.kind==='image'||asset.kind==='audio'){const edit=document.createElement('button');edit.className='button';edit.textContent=asset.kind==='image'?'Edit image details':'Edit audio details';edit.onclick=()=>{$('media-dialog').close();if(asset.kind==='image')openImage(asset,asset.id===story.coverId?'cover':'inline');else void audio.open(asset);};actions.append(edit);}if(asset.blob){const link=document.createElement('a');link.className='button';link.href=urls.get(asset.blob);link.download=asset.name||'audio-clip';link.textContent='Download file';actions.append(link);}item.append(actions);root.append(item);}openDialog('media-dialog');}
$('manage-media').onclick=manageMedia;
async function downloadBackup(){if(!story)return;checkpoint();try{const draft=snapshot(),media=await Promise.all(draft.media.map(async m=>{const encoded={...m};for(const key of ['blob','displayBlob'])if(m[key])encoded[key]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(m[key]);});return encoded;})),blob=new Blob([JSON.stringify({version:1,story:{...draft,media}},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(draft.headline||'Untitled story').replace(/[^a-z0-9 -]/gi,'').slice(0,70)+'.ogas-story.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);notify('Story backup downloaded, including local media.');}catch(error){notify('Could not create the backup: '+error.message,{persistent:true});}}
$('backup').onclick=$('error-backup').onclick=()=>void downloadBackup();
$('import-backup-open').onclick=()=>$('import-backup').click();
$('import-backup').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>120*1024*1024)throw Error('This backup is over 120 MB.');const parsed=JSON.parse(await file.text());if(parsed.version!==1||!parsed.story||typeof parsed.story.headline!=='string'||typeof parsed.story.html!=='string'||!Array.isArray(parsed.story.media)||parsed.story.media.length>100)throw Error('Choose a valid OgasTV story backup.');const input=parsed.story,media=[];for(const value of input.media){if(!['image','audio','attachment'].includes(value.kind)||typeof value.id!=='string'||value.id.length>100)throw Error('This backup has invalid media.');const m={...value};for(const key of ['blob','displayBlob'])if(typeof m[key]==='string'){if(!/^data:[^,;]+;base64,/.test(m[key]))throw Error('Invalid media encoding in backup.');const [header,data]=m[key].split(','),mime=header.slice(5,header.indexOf(';')),binary=atob(data),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(bytes.length>40*1024*1024)throw Error('A backup media file is too large.');if(m.kind==='image'&&!['image/webp','image/jpeg','image/png'].includes(mime))throw Error('Unsupported image in backup.');if(m.kind==='audio'&&!mime.startsWith('audio/'))throw Error('Unsupported audio in backup.');m[key]=new Blob([bytes],{type:mime});}if(m.url&&!safeURL(m.url,true))throw Error('Invalid audio URL in backup.');media.push(m);}await save();const restored={...newStory(),headline:input.headline.slice(0,240),html:cleanHTML(input.html,media.map(m=>m.id)),section:['News','Politics','Business','Entertainment','Sports','Lagos Watch'].includes(input.section)?input.section:'News',byline:String(input.byline||'Desk Editor').slice(0,100),source:safeURL(input.source)||'',media,coverId:input.coverId,status:'draft'};await loadStory(restored,{newlyCreated:true});history.pushState(null,'',`#story/${story.id}`);showEditor();notify('Backup restored as a new draft.');}catch(error){notify('Could not open this backup. '+error.message,{persistent:true});}};
$('story-search').oninput=renderList;$('story-filter').onchange=renderList;document.addEventListener('click',e=>{if(e.target.closest('[data-new-story]'))void newDraft().catch(showError);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('desk-nav').classList.contains('open')){$('desk-nav').classList.remove('open');$('nav-toggle').setAttribute('aria-expanded','false');$('nav-toggle').setAttribute('aria-label','Open navigation');$('nav-toggle').focus();}});
$('nav-toggle').onclick=()=>{const open=$('desk-nav').classList.toggle('open');$('nav-toggle').setAttribute('aria-expanded',String(open));$('nav-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');};
window.addEventListener('hashchange',()=>void route());window.addEventListener('online',connection);window.addEventListener('offline',connection);
document.addEventListener('visibilitychange',()=>{if(document.hidden){emergencySave();void save().catch(()=>{});}});window.addEventListener('pagehide',()=>{emergencySave();void audio.stop();dictation.abort();});
window.addEventListener('beforeunload',e=>{if(generation!==savedGeneration||saving||audio.active()||dictation.active()){emergencySave();e.preventDefault();e.returnValue='';}});
function viewport(){fitHeadline();const v=window.visualViewport;document.documentElement.style.setProperty('--viewport-height',`${v?.height||window.innerHeight}px`);document.documentElement.style.setProperty('--viewport-top',`${v?.offsetTop||0}px`);const offset=v?Math.max(0,window.innerHeight-v.height-v.offsetTop):0;document.documentElement.style.setProperty('--keyboard-offset',offset>100?`${offset}px`:'0px');}
window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);
async function boot(){
  try{
    store=await openWorkspace(dbName);role=(await store.getMeta('role'))==='editor'?'editor':'writer';$('preview-role').value=role;
    const activeId=location.hash.match(/^#story\/([a-f0-9-]+)$/)?.[1]||await store.getMeta('active-story');let saved=activeId?await store.read(activeId):null;
    let recovery;try{recovery=JSON.parse(localStorage.getItem(recoveryKey)||'null');}catch{}
    if(recovery&&(!saved||recovery.id===saved.id)&&(!saved||recovery.baseRevision===saved.revision)&&(!saved||recovery.updatedAt>saved.updatedAt)){
      saved={...(saved||newStory()),...recovery,media:saved?.media||[],revision:saved?.revision||0};saved.html=cleanHTML(saved.html,saved.media.map(m=>m.id));
      await loadStory(saved);generation++;emergencySave();notify('Recovered your latest unsaved writing from this tab.');await save();
    }else if(saved)await loadStory(saved);else await loadStory(newStory(await store.getMeta('byline')||'Desk Editor'),{newlyCreated:true});
    await refreshList();
  }catch(error){if(!story){story=newStory();renderStory();lastHistory=snapshot();}showError(error);}
  $('boot').hidden=true;connection();viewport();if(!location.hash||location.hash==='#new')history.replaceState(null,'',`#story/${story.id}`);await route();
}
void boot();
