import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeLiveId,isYouTubeLiveVideoId } from '../lib/youtube-live.ts';
const id='AbC012_xY-z';
for(const link of [
  id,'https://www.youtube.com/watch?v='+id,'https://youtube.com/live/'+id,
  'https://m.youtube.com/live/'+id+'?feature=share',
  'https://youtu.be/'+id+'?t=12','https://www.youtube-nocookie.com/embed/'+id
])test('accepts '+link,()=>assert.equal(parseYouTubeLiveId(link),id));
for(const invalid of [
  '',null,'not-a-valid-link','https://youtube.com/live/',
  'http://youtube.com/watch?v='+id,'https://notyoutube.com/watch?v='+id,
  'https://youtube.com.evil.test/watch?v='+id,
  'https://youtube.com/playlist?list='+id,
  'https://youtu.be/'+id+'/extra',
  'https://user:pass@youtube.com/live/'+id,
  'https://youtube.com:444/live/'+id,'https://youtube.com/live/INJECT<script>',
  'https://evil.test/?next=https://youtube.com/live/'+id
])test('rejects unsafe or invalid '+String(invalid),()=>assert.equal(parseYouTubeLiveId(invalid),null));
test('validated video id remains strict',()=>{
  assert.equal(isYouTubeLiveVideoId(id),true);
  assert.equal(isYouTubeLiveVideoId('bad'),false);
});
