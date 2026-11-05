// Camera motion is interpreted relative to the player's own guard stance.
// One webcam cannot measure real impact force; these signals estimate a punch.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=(a,b,c)=>{const u={x:a.x-b.x,y:a.y-b.y,z:(a.z||0)-(b.z||0)},v={x:c.x-b.x,y:c.y-b.y,z:(c.z||0)-(b.z||0)};return Math.acos(clamp((u.x*v.x+u.y*v.y+u.z*v.z)/(Math.hypot(u.x,u.y,u.z)*Math.hypot(v.x,v.y,v.z)||1),-1,1));};
const median=(values)=>{const a=[...values].sort((x,y)=>x-y);return a[Math.floor(a.length/2)]||0;};

export class PunchDetector{
  constructor(onPunch,onUpdate){this.onPunch=onPunch;this.onUpdate=onUpdate;this.sensitivity=3;this.reset();}
  reset(){this.baseline=null;this.samples=[[],[]];this.start=0;this.arms=[{armed:true,prev:null,last:0},{armed:true,prev:null,last:0}];this.headBase=null;this.defense='neutral';this.lastSeen=0;this.ready=false;}
  calibrate(){this.reset();this.onUpdate({state:'calibrating',progress:0,left:0,right:0,defense:'neutral'});}
  setSensitivity(v){this.sensitivity=clamp(Number(v)||3,1,5);}
  process(p,w,ts){
    if(!p||!p[16]||!p[12])return;
    const width=Math.max(.12,Math.abs(p[11].x-p[12].x));
    const good=[11,12,13,14,15,16].every(i=>(p[i].visibility??1)>.35);
    if(!good){this.onUpdate({state:'reposition',left:0,right:0,defense:'neutral'});return;}
    this.lastSeen=ts;
    const metrics=[0,1].map(side=>{
      const s=side?12:11,e=side?14:13,h=side?16:15;
      const world=w?.[h]&&w?.[s]&&w?.[e];
      const ang=world?angle(w[s],w[e],w[h]):angle(p[s],p[e],p[h]);
      const depth=world?w[s].z-w[h].z:p[s].z-p[h].z;
      return {angle:ang,depth,reach:dist(p[s],p[h])/width,x:p[h].x,y:p[h].y,elbowY:p[e].y,shoulderY:p[s].y,side,world:!!world};
    });
    if(!this.ready){
      if(!this.start)this.start=ts;
      for(let i=0;i<2;i++)this.samples[i].push(metrics[i]);
      const progress=clamp((ts-this.start)/1800,0,1);
      this.onUpdate({state:'calibrating',progress,left:0,right:0,defense:'neutral'});
      if(progress>=1&&this.samples[0].length>=12){
        this.baseline=this.samples.map(samples=>({angle:median(samples.map(s=>s.angle)),depth:median(samples.map(s=>s.depth)),reach:median(samples.map(s=>s.reach))}));
        this.headBase=(p[0].x-(p[11].x+p[12].x)/2)/width;
        this.ready=true;this.arms.forEach((a,i)=>a.prev={...metrics[i],ts});
        this.onUpdate({state:'ready',progress:1,left:0,right:0,defense:'neutral'});
      }
      return;
    }
    const sensitivityScale=1-(this.sensitivity-3)*.12;
    const signals=[];
    for(let i=0;i<2;i++){
      const m=metrics[i],b=this.baseline[i],arm=this.arms[i],prev=arm.prev;
      const dt=prev?clamp((ts-prev.ts)/1000,.03,.3):.07;
      const angleGain=m.angle-b.angle,depthGain=m.depth-b.depth,reachGain=m.reach-b.reach;
      const angleSignal=clamp(angleGain/(.72*sensitivityScale),0,1.5);
      const depthSignal=clamp(depthGain/((m.world?.16:.22)*sensitivityScale),0,1.5);
      const reachSignal=clamp(reachGain/(.52*sensitivityScale),0,1.5);
      const signal=Math.max(angleSignal,depthSignal,reachSignal);
      signals.push(clamp(signal/1.3,0,1));
      const rise=prev?Math.max((m.angle-prev.angle)/dt/.9,(m.depth-prev.depth)/dt/(m.world?.55:.7),(m.reach-prev.reach)/dt/1.8):0;
      const lateral=prev?(m.x-prev.x)/width/dt:0;
      const vertical=prev?(prev.y-m.y)/width/dt:0;
      const moving=Math.max(rise,Math.abs(lateral)/1.4,vertical/1.1);
      if(!arm.armed&&signal<.33&&ts-arm.last>270)arm.armed=true;
      if(arm.armed&&ts-arm.last>350&&signal>.62*sensitivityScale&&moving>.55*sensitivityScale){
        let type='straight';
        if(vertical>.85*sensitivityScale&&m.angle<2.25)type='uppercut';
        else if(Math.abs(lateral)>1.1*sensitivityScale&&m.angle<2.35)type='hook';
        const quality=clamp(.55+Math.max(rise,signal)*.15,.55,1.4);
        arm.armed=false;arm.last=ts;
        this.onPunch({side:i,type,quality,metrics:{angleGain,depthGain,reachGain,lateral,vertical}});
      }
      arm.prev={...m,ts};
    }
    const center=(p[11].x+p[12].x)/2;
    const head=(p[0].x-center)/width;
    const lean=head-this.headBase;
    const headDrop=(p[0].y-(p[11].y+p[12].y)/2)/width;
    const wristNearHead=[15,16].every(i=>dist(p[i],p[0])/width<.78);
    const duck=headDrop>-.35;
    this.defense=duck?'duck':lean>.27*sensitivityScale?'left':lean<-.27*sensitivityScale?'right':wristNearHead?'block':'neutral';
    // Slowly adapt to a changed stance only when the player is centered.
    if(Math.abs(lean)<.12&&signals.every(s=>s<.3))this.headBase=this.headBase*.995+head*.005;
    this.onUpdate({state:'ready',progress:1,left:signals[0],right:signals[1],defense:this.defense});
  }
}
