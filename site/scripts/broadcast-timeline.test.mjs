import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLagosTimestamp, formatBroadcastDuration, addBroadcastTransitionTimes } from '../lib/broadcast-timeline.ts';

test('normal stop records a precise end time and clears the publisher',()=>{
  const event=addBroadcastTransitionTimes({broadcastStatus:'ended'},{broadcastStatus:'live',actualEnd:null},'2026-11-11T16:00:00Z');
  assert.equal(event.actualEnd,'2026-11-11T16:00:00Z');
  assert.equal(event.publisherSessionId,'');
});
test('a supplied stop timestamp is preserved',()=>{
  assert.equal(addBroadcastTransitionTimes({broadcastStatus:'ended',actualEnd:'2026-11-11T16:00:02Z'},{broadcastStatus:'live'},'2026-11-11T16:00:10Z').actualEnd,'2026-11-11T16:00:02Z');
});
test('editing an old ended event does not create a made-up end time',()=>{
  assert.equal(addBroadcastTransitionTimes({title:'Old broadcast',broadcastStatus:'ended'},{broadcastStatus:'ended',actualEnd:null},'2026-11-11T16:00:00Z').actualEnd,undefined);
});
test('starting a new broadcast resets end time',()=>{
  const event=addBroadcastTransitionTimes({broadcastStatus:'live'},{broadcastStatus:'scheduled',actualEnd:'2026-11-10T16:00:00Z'},'2026-11-11T16:00:00Z');
  assert.equal(event.actualStart,'2026-11-11T16:00:00Z');
  assert.equal(event.actualEnd,null);
});
test('format Lagos time without UTC mistakes',()=>{
  const out=formatLagosTimestamp('2026-11-11T14:41:27Z');
  assert.match(out,/3:41/i);
  assert.match(out,/WAT/);
});
test('display exact elapsed stream duration',()=>{
  assert.equal(formatBroadcastDuration('2026-11-11T14:41:27Z','2026-11-11T14:42:59Z'),'1 min 32 sec');
});
test('unknown or invalid end time is unavailable, never inferred',()=>{
  assert.equal(formatBroadcastDuration('2026-11-11T14:41:27Z',null),null);
  assert.equal(formatLagosTimestamp(null),null);
  assert.equal(formatBroadcastDuration('2026-11-11T14:41:27Z','bad'),null);
});
