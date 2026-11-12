import test from 'node:test';
import assert from 'node:assert/strict';
import { publicBroadcastState } from '../lib/public-broadcast-state.ts';

test('published Cloudflare event with a publisher is live',()=>{
  assert.deepEqual(publicBroadcastState({_status:'published',sourceType:'cloudflare',broadcastStatus:'live',publisherSessionId:'opaque-id',actualStart:'2026-11-11T15:00:00Z'}),
    {state:'live',actualStart:'2026-11-11T15:00:00Z',actualEnd:null});
});
test('stop event returns exact saved end timestamp, no session identifier',()=>{
  const result=publicBroadcastState({_status:'published',sourceType:'cloudflare',broadcastStatus:'ended',publisherSessionId:'previous-id',actualStart:'2026-11-11T14:00:00Z',actualEnd:'2026-11-11T15:01:02Z'});
  assert.deepEqual(result,{state:'ended',actualStart:'2026-11-11T14:00:00Z',actualEnd:'2026-11-11T15:01:02Z'});
  assert.equal(JSON.stringify(result).includes('previous-id'),false);
});
test('historic manual ending remains ended without inventing a time',()=>{
  assert.deepEqual(publicBroadcastState({_status:'published',broadcastStatus:'ended',actualStart:'2026-11-09T10:55:45Z'}),
    {state:'ended',actualStart:'2026-11-09T10:55:45Z',actualEnd:null});
});
test('ended timestamp overrides stale live flag',()=>{
  assert.equal(publicBroadcastState({_status:'published',broadcastStatus:'live',actualEnd:'2026-11-11T15:00:00Z'}).state,'ended');
});
test('missing publisher never displays live',()=>{
  assert.equal(publicBroadcastState({_status:'published',sourceType:'cloudflare',broadcastStatus:'live'}).state,'offline');
});
test('unpublished events never reveal timings or status',()=>{
  assert.deepEqual(publicBroadcastState({_status:'draft',sourceType:'cloudflare',broadcastStatus:'live',actualStart:'2026-11-11T15:00:00Z',publisherSessionId:'opaque-id'}),
    {state:'offline',actualStart:null,actualEnd:null});
});
test('unknown events are offline',()=>{
  assert.deepEqual(publicBroadcastState(null),{state:'offline',actualStart:null,actualEnd:null});
});

test('published YouTube event with a valid video ID is live',()=>{
  assert.equal(publicBroadcastState({_status:'published',sourceType:'youtube',broadcastStatus:'live',youtubeVideoId:'AbC012_xY-z'}).state,'live');
});
test('YouTube event without a valid ID is not live',()=>{
  assert.equal(publicBroadcastState({_status:'published',sourceType:'youtube',broadcastStatus:'live',youtubeVideoId:'invalid'}).state,'offline');
});
test('ended YouTube event returns saved end time to connected viewers',()=>{
  assert.deepEqual(publicBroadcastState({_status:'published',sourceType:'youtube',broadcastStatus:'ended',
    youtubeVideoId:'AbC012_xY-z',actualStart:'2026-11-12T05:00:00Z',actualEnd:'2026-11-12T05:30:00Z'}),
    {state:'ended',actualStart:'2026-11-12T05:00:00Z',actualEnd:'2026-11-12T05:30:00Z'});
});
