import test from 'node:test';
import assert from 'node:assert/strict';
import { measureBroadcastQuality, formatBroadcastDiagnostics } from '../components/broadcastQuality.ts';

const first = {
  id:'video-1', type:'outbound-rtp', kind:'video',
  timestamp:1000, bytesSent:100000, framesEncoded:30,
  frameWidth:1280, frameHeight:720,
};
const moving = {
  ...first, timestamp:4000, bytesSent:1450000, framesEncoded:120,
};
const snapshot = {id:first.id,timestamp:first.timestamp,bytesSent:first.bytesSent,framesEncoded:30};

test('calculates measured send bitrate and encoded FPS during a moving scene', () => {
  const {quality}=measureBroadcastQuality([moving],snapshot,true);
  assert.equal(quality.bitrateKbps,3600);
  assert.equal(quality.fps,30);
  assert.equal(quality.width,1280);
  assert.equal(quality.height,720);
  assert.equal(quality.level,'good');
});

test('does not diagnose a static, low-bitrate scene as a bad connection', () => {
  const {quality}=measureBroadcastQuality([{...moving,bytesSent:115000,framesEncoded:120}],snapshot,true);
  assert.equal(quality.bitrateKbps,40);
  assert.equal(quality.level,'good');
});

test('shows connection quality as measuring before two usable samples', () => {
  const {quality,snapshot:next}=measureBroadcastQuality([first],null,true);
  assert.equal(quality.level,'measuring');
  assert.equal(quality.bitrateKbps,null);
  assert.equal(next?.bytesSent,100000);
});

test('resets the sample when the WebRTC sender ID changes', () => {
  const {quality}=measureBroadcastQuality([{...moving,id:'video-2'}],snapshot,true);
  assert.equal(quality.bitrateKbps,null);
  assert.equal(quality.level,'measuring');
});

test('reports encoder performance degradation before visible pauses', () => {
  const {quality}=measureBroadcastQuality([{...moving,framesEncoded:66,qualityLimitationReason:'cpu'}],snapshot,true);
  assert.equal(quality.fps,12);
  assert.equal(quality.level,'poor');
  assert.equal(quality.limitation,'cpu');
});

test('uses remote inbound feedback only from the matching published video track', () => {
  const rows = [
    moving,
    {type:'remote-inbound-rtp',localId:'audio-1',fractionLost:0.25,roundTripTime:1},
    {type:'remote-inbound-rtp',localId:'video-1',fractionLost:0.055,roundTripTime:0.38},
  ];
  const {quality}=measureBroadcastQuality(rows,snapshot,true);
  assert.equal(quality.packetLossPercent,5.5);
  assert.equal(quality.rttMs,380);
  assert.equal(quality.level,'fair');
});

test('marks significant packet loss as poor without inferring it from the bitrate', () => {
  const {quality}=measureBroadcastQuality(
    [moving,{type:'remote-inbound-rtp',localId:'video-1',fractionLost:.1}],snapshot,true);
  assert.equal(quality.level,'poor');
});

test('falls back to nominated candidate-pair RTT when remote feedback is unavailable', () => {
  const {quality}=measureBroadcastQuality(
    [moving,{type:'candidate-pair',state:'succeeded',nominated:true,currentRoundTripTime:.6}],
    snapshot,true);
  assert.equal(quality.rttMs,600);
  assert.equal(quality.level,'poor');
});

test('does not misidentify audio as a video measurement', () => {
  const {quality,snapshot:next}=measureBroadcastQuality(
    [{id:'audio',type:'outbound-rtp',kind:'audio',timestamp:4000,bytesSent:12000}],snapshot,true);
  assert.equal(next,null);
  assert.equal(quality.level,'measuring');
});

test('reports a broken peer connection even if the previous samples were good', () => {
  const {quality}=measureBroadcastQuality([moving],snapshot,false);
  assert.equal(quality.level,'poor');
});

test('diagnostic report contains no event credentials or user identifiers', () => {
  const {quality}=measureBroadcastQuality([moving],snapshot,true);
  const output=formatBroadcastDiagnostics(quality,'1280×720 @ 30 FPS');
  assert.match(output,/3600 kbps/);
  assert.match(output,/Capture: 1280×720 @ 30 FPS/);
  assert.match(output,/not an internet speed test/);
});
