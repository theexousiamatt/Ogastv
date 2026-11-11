import test from 'node:test';
import assert from 'node:assert/strict';
import { studioBroadcastStatus } from '../lib/broadcast-status.ts';

const now=Date.parse('2026-11-11T14:20:00.000Z');
test('ended status wins over a historic session id',()=>{
  assert.equal(studioBroadcastStatus({broadcastStatus:'ended',sourceType:'cloudflare',publisherSessionId:'historic-session'},now),'ended');
});
test('a recorded end time wins over a stale LIVE flag',()=>{
  assert.equal(studioBroadcastStatus({broadcastStatus:'live',sourceType:'cloudflare',actualEnd:'2026-11-09T15:00:00Z',publisherSessionId:'historic-session'},now),'ended');
});
test('current publishing session can display LIVE',()=>{
  assert.equal(studioBroadcastStatus({broadcastStatus:'live',sourceType:'cloudflare',actualStart:'2026-11-11T14:18:00Z',publisherSessionId:'live-session'},now),'live');
});
test('missing Cloudflare publisher session never displays LIVE',()=>{
  assert.equal(studioBroadcastStatus({broadcastStatus:'live',sourceType:'cloudflare',actualStart:'2026-11-11T14:18:00Z'},now),'interrupted');
});
test('a 48-hour-old orphaned session does not display LIVE',()=>{
  assert.equal(studioBroadcastStatus({broadcastStatus:'live',sourceType:'cloudflare',actualStart:'2026-11-09T12:00:00Z',publisherSessionId:'old-session'},now),'interrupted');
});
test('a scheduled event is not marked LIVE',()=>{
  assert.equal(studioBroadcastStatus({broadcastStatus:'scheduled',sourceType:'cloudflare'},now),'scheduled');
});
test('YouTube events do not require Cloudflare publisher identifiers',()=>{
  assert.equal(studioBroadcastStatus({broadcastStatus:'live',sourceType:'youtube'},now),'live');
});
