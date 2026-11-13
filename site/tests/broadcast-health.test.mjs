import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeBroadcastHealth, cloudflareBroadcastHealth } from '../lib/broadcast-health.ts';

const youTubeId='a1B2c3D4e5F';
function mockFetch(body,status=200){
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  return ()=>{globalThis.fetch=previous};
}
test('YouTube: a completed stream carries its actual verified end time',async()=>{
  process.env.YOUTUBE_API_KEY='test-key';
  const end='2026-11-13T12:00:00Z';
  const restore=mockFetch({items:[{snippet:{liveBroadcastContent:'none'},liveStreamingDetails:{
    actualStartTime:'2026-11-13T10:00:00Z',actualEndTime:end}}]});
  try{
    const result=await youtubeBroadcastHealth(youTubeId);
    assert.equal(result.status,'ended');
    assert.equal(result.endedAt,end);
  }finally{restore();delete process.env.YOUTUBE_API_KEY}
});
test('YouTube: active livestream is live',async()=>{
  process.env.YOUTUBE_API_KEY='test-key';
  const restore=mockFetch({items:[{snippet:{liveBroadcastContent:'live'},liveStreamingDetails:{
    actualStartTime:'2026-11-13T10:00:00Z'}}]});
  try{assert.equal((await youtubeBroadcastHealth(youTubeId)).status,'live')}
  finally{restore();delete process.env.YOUTUBE_API_KEY}
});
test('YouTube: quota errors are unknown, never ended',async()=>{
  process.env.YOUTUBE_API_KEY='test-key';
  const restore=mockFetch({error:'quotaExceeded'},403);
  try{assert.equal((await youtubeBroadcastHealth(youTubeId)).status,'unknown')}
  finally{restore();delete process.env.YOUTUBE_API_KEY}
});
test('YouTube: missing credential and vanished private videos cannot end streams',async()=>{
  assert.equal((await youtubeBroadcastHealth(youTubeId)).status,'unknown');
  process.env.YOUTUBE_API_KEY='test-key';
  const restore=mockFetch({items:[]});
  try{assert.equal((await youtubeBroadcastHealth(youTubeId)).status,'unknown')}
  finally{restore();delete process.env.YOUTUBE_API_KEY}
});
test('Cloudflare: requires both active publisher tracks',async()=>{
  process.env.CLOUDFLARE_REALTIME_APP_ID='test-app';
  process.env.CLOUDFLARE_REALTIME_API_TOKEN='test-secret';
  const restore=mockFetch({tracks:[
    {location:'local',trackName:'camera',status:'active'},
    {location:'local',trackName:'microphone',status:'active'},
  ]});
  try{assert.equal((await cloudflareBroadcastHealth('12345678-aaaa-bbbb-cccc-ddddeeeeffff')).status,'live')}
  finally{restore();delete process.env.CLOUDFLARE_REALTIME_APP_ID;delete process.env.CLOUDFLARE_REALTIME_API_TOKEN}
});
test('Cloudflare: inactive camera reports offline',async()=>{
  process.env.CLOUDFLARE_REALTIME_APP_ID='test-app';
  process.env.CLOUDFLARE_REALTIME_API_TOKEN='test-secret';
  const restore=mockFetch({tracks:[
    {location:'local',trackName:'camera',status:'inactive'},
    {location:'local',trackName:'microphone',status:'active'},
  ]});
  try{assert.equal((await cloudflareBroadcastHealth('12345678-aaaa-bbbb-cccc-ddddeeeeffff')).status,'offline')}
  finally{restore();delete process.env.CLOUDFLARE_REALTIME_APP_ID;delete process.env.CLOUDFLARE_REALTIME_API_TOKEN}
});
test('Cloudflare: API outage is unknown, not offline',async()=>{
  process.env.CLOUDFLARE_REALTIME_APP_ID='test-app';
  process.env.CLOUDFLARE_REALTIME_API_TOKEN='test-secret';
  const restore=mockFetch({error:'unavailable'},503);
  try{assert.equal((await cloudflareBroadcastHealth('12345678-aaaa-bbbb-cccc-ddddeeeeffff')).status,'unknown')}
  finally{restore();delete process.env.CLOUDFLARE_REALTIME_APP_ID;delete process.env.CLOUDFLARE_REALTIME_API_TOKEN}
});
