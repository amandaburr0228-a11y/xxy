import assert from 'node:assert/strict';
import {PunchDetector} from '../dist/punch-detector.js';

function pose(kind='guard'){
  const p=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));
  const w=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:1}));
  p[0]={x:.5,y:.23,z:0,visibility:1};
  for(const [s,e,h,x] of [[11,13,15,.38],[12,14,16,.62]]){
    p[s]={x,y:.43,z:0,visibility:1};p[e]={x:x+(x<.5?-.08:.08),y:.52,z:-.02,visibility:1};p[h]={x:x+(x<.5?.04:-.04),y:.36,z:-.05,visibility:1};
    w[s]={x:x-.5,y:0,z:0};w[e]={x:x-.5+(x<.5?-.12:.12),y:-.1,z:-.07};w[h]={x:x-.5,y:.06,z:-.09};
  }
  if(kind==='left-straight'){
    p[15]={x:.34,y:.4,z:-.45,visibility:1};p[13]={x:.34,y:.42,z:-.2,visibility:1};
    w[15]={x:-.17,y:0,z:-.52};w[13]={x:-.22,y:-.05,z:-.28};
  }
  return [p,w];
}
const punches=[];const detector=new PunchDetector(p=>punches.push(p),()=>{});
for(let t=100;t<=2000;t+=100)detector.process(...pose(),t);
assert(detector.ready,'guard calibration should finish');
assert.equal(punches.length,0,'holding guard must not count as a punch');
detector.process(...pose('left-straight'),2100);
assert.equal(punches.length,1,'a straight punch toward the camera must register');
assert.equal(punches[0].side,0,'left arm must be identified');
detector.process(...pose('left-straight'),2200);
assert.equal(punches.length,1,'holding an extended arm must not double count');
detector.process(...pose(),2500);
detector.process(...pose('left-straight'),2700);
assert.equal(punches.length,2,'returning to guard must rearm the arm');
console.log('Punch detector: guard, forward punch, no double count, rearm OK');
