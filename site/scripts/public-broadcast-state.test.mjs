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
