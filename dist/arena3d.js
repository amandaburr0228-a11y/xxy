import * as THREE from './vendor/three/three.module.js';

const lerp=(a,b,t)=>a+(b-a)*t;
const ease=(t)=>1-Math.pow(1-t,3);
const mat=(color,roughness=.55,metalness=.05)=>new THREE.MeshStandardMaterial({color,roughness,metalness});

function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function beam(parent,a,b,r,material){const dir=new THREE.Vector3().subVectors(b,a),mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5);const m=mesh(new THREE.CylinderGeometry(r,r,dir.length(),8),material,parent,mid.x,mid.y,mid.z);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return m;}
function segment(parent,material,r){return mesh(new THREE.CylinderGeometry(r,r,1,10),material,parent);}
function placeSegment(m,a,b){const d=new THREE.Vector3().subVectors(b,a);m.position.copy(a).addScaledVector(d,.5);m.scale.y=d.length();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}

export class Arena3D{
  constructor(canvas){
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.6;
    this.renderer.shadowMap.enabled=true;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#10171e');this.scene.fog=new THREE.Fog('#10171e',8,18);
    this.camera=new THREE.PerspectiveCamera(50,1,.1,40);
    this.camera.position.set(0,1.78,5.1);this.camera.lookAt(0,1.42,-.8);
    this.baseCamera=this.camera.position.clone();
    this.clock=0;this.impact=0;this.shake=0;this.power=0;this.playerPunch=null;this.opponentAttack=null;this.defense='neutral';
    this.buildRoom();this.buildRing();this.buildOpponent();this.buildPlayer();
    this.resize();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
  }
  buildRoom(){
    this.scene.add(new THREE.AmbientLight(0x9ebad0,1.55));
    const main=new THREE.SpotLight(0xfff3d3,78,15,Math.PI/4,.45,1);main.position.set(-2.5,6,2.5);main.target.position.set(0,1,0);main.castShadow=true;main.shadow.mapSize.set(1024,1024);this.scene.add(main,main.target);
    const rim=new THREE.SpotLight(0x5ca4f4,55,14,Math.PI/3,.6,1);rim.position.set(3.8,5,-3);rim.target.position.set(0,1,0);this.scene.add(rim,rim.target);
    this.burstLight=new THREE.PointLight(0xeaff55,0,6);this.burstLight.position.set(0,2.6,1);this.scene.add(this.burstLight);
    const wall=mat(0x18232b);mesh(new THREE.BoxGeometry(16,6,.25),wall,this.scene,0,2,-7);
    for(let i=0;i<11;i++){const x=(i-5)*1.5;mesh(new THREE.BoxGeometry(.16,4.6,.32),mat(i%2?0x23303a:0x2c3940),this.scene,x,2.1,-6.8);}
    const sign=mesh(new THREE.BoxGeometry(4.4,.72,.14),mat(0x111820,.3),this.scene,0,3.5,-6.5);
    const stripe=mesh(new THREE.BoxGeometry(3.6,.06,.16),new THREE.MeshBasicMaterial({color:0xdfff35}),this.scene,0,3.26,-6.4);
    for(const x of [-3.6,3.6]){const lamp=new THREE.PointLight(0xdfff55,12,5);lamp.position.set(x,3.5,-5);this.scene.add(lamp);mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshBasicMaterial({color:0xeaff83}),this.scene,x,3.5,-5);}
    const crowdMat=mat(0x0b1218);for(let i=0;i<36;i++){const x=(i%18-8.5)*.62,z=-7.15-Math.floor(i/18)*.55;mesh(new THREE.SphereGeometry(.18,8,6),crowdMat,this.scene,x,1.72+Math.sin(i*6)*.08,z);mesh(new THREE.CylinderGeometry(.17,.22,.55,7),crowdMat,this.scene,x,1.17,z);}
  }
  buildRing(){
    const floor=mesh(new THREE.BoxGeometry(7.6,.22,7),mat(0x313d44,.9),this.scene,0,-.15,-.4);floor.receiveShadow=true;
    const canvasMat=mat(0x33434a,.95);mesh(new THREE.PlaneGeometry(7.1,6.6),canvasMat,this.scene,0,-.026,-.4).rotation.x=-Math.PI/2;
    const logo=mesh(new THREE.RingGeometry(.65,1.02,32),new THREE.MeshBasicMaterial({color:0x8a9d39,side:THREE.DoubleSide,transparent:true,opacity:.32}),this.scene,0,-.015,-.3);logo.rotation.x=-Math.PI/2;
    const postMat=mat(0x1a222b,.35,.45),red=mat(0xa6393e,.6),white=mat(0xc8d2c8,.6);
    for(const x of [-3.65,3.65])for(const z of [-3.7,2.9])mesh(new THREE.BoxGeometry(.2,2.1,.2),postMat,this.scene,x,1,z);
    for(const y of [.7,1.08,1.47]){for(const z of [-3.7,2.9])beam(this.scene,new THREE.Vector3(-3.65,y,z),new THREE.Vector3(3.65,y,z),.027,y===1.08?white:red);for(const x of [-3.65,3.65])beam(this.scene,new THREE.Vector3(x,y,-3.7),new THREE.Vector3(x,y,2.9),.027,y===1.08?white:red);}
    for(let i=-3;i<=3;i++){const line=mesh(new THREE.BoxGeometry(.025,.003,6),new THREE.MeshBasicMaterial({color:0x7a9095,transparent:true,opacity:.1}),this.scene,i,-.01,-.4);line.rotation.y=.02;}
  }
  buildOpponent(){
    this.opp=new THREE.Group();this.scene.add(this.opp);this.opp.position.set(0,0,-1.1);
    const skin=mat(0xb98363),shirt=mat(0x23344a),trim=mat(0xdfff35,.45),shorts=mat(0x1d2631),glove=mat(0xd95155,.33),gloveTrim=mat(0xf4a49c,.3);
    mesh(new THREE.CapsuleGeometry(.43,.73,5,12),shirt,this.opp,0,1.25,0);
    mesh(new THREE.BoxGeometry(.8,.15,.45),trim,this.opp,0,.76,0);
    mesh(new THREE.BoxGeometry(.76,.47,.48),shorts,this.opp,0,.55,0);
    for(const x of [-.23,.23]){mesh(new THREE.CylinderGeometry(.13,.14,.47,10),skin,this.opp,x,.15,0);mesh(new THREE.BoxGeometry(.25,.13,.36),mat(0x1a2029),this.opp,x,-.06,.12);}
    mesh(new THREE.CylinderGeometry(.13,.15,.19,10),skin,this.opp,0,1.86,0);
    this.head=mesh(new THREE.SphereGeometry(.31,20,16),skin,this.opp,0,2.14,.04);this.head.scale.set(1,.98,.9);
    mesh(new THREE.SphereGeometry(.31,18,9,0,Math.PI*2,0,Math.PI*.42),mat(0x182026),this.opp,0,2.22,.03);
    for(const x of [-.11,.11])mesh(new THREE.SphereGeometry(.028,8,8),mat(0x171817),this.opp,x,2.17,.31);
    mesh(new THREE.BoxGeometry(.16,.023,.03),mat(0x713e36),this.opp,0,2.02,.32);
    this.oppArms=[-1,1].map((sign)=>{const upper=segment(this.opp,shirt,.13),lower=segment(this.opp,skin,.115),hand=mesh(new THREE.SphereGeometry(.2,14,12),glove,this.opp),cuff=mesh(new THREE.CylinderGeometry(.14,.14,.14,12),gloveTrim,this.opp);return{sign,upper,lower,hand,cuff};});
    this.shadow=mesh(new THREE.CircleGeometry(.7,24),new THREE.MeshBasicMaterial({color:0x05090d,transparent:true,opacity:.4,depthWrite:false}),this.scene,0,.002,-1.1);this.shadow.rotation.x=-Math.PI/2;
  }
  buildPlayer(){
    const red=mat(0xd54a46,.32),cuff=mat(0x18232a,.45),highlight=mat(0xf79479,.35);
    this.playerGloves=[-1,1].map(sign=>{const g=new THREE.Group();this.scene.add(g);mesh(new THREE.SphereGeometry(.24,18,14),red,g,0,0,0).scale.set(1.1,.88,1.25);mesh(new THREE.BoxGeometry(.32,.16,.29),cuff,g,0,-.19,.11);mesh(new THREE.BoxGeometry(.25,.025,.12),highlight,g,0,.11,.2);return{sign,group:g};});
  }
  resize(){const w=this.canvas.clientWidth||960,h=this.canvas.clientHeight||540;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  playerStrike(side,type){this.playerPunch={side,type,t:0};}
  enemyStrike(side){this.opponentAttack={side,t:0};}
  enemyHit(side,type){this.impact=1;this.hitSide=side;this.hitType=type;this.shake=Math.max(this.shake,.09);}
  playerHit(){this.shake=.28;}
  burst(){this.power=1.2;this.impact=1;}
  setDefense(v){this.defense=v;}
  update(dt,state){
    this.clock+=dt;this.impact=Math.max(0,this.impact-dt*2.8);this.shake=Math.max(0,this.shake-dt*1.6);this.power=Math.max(0,this.power-dt*.8);this.burstLight.intensity=this.power*22;
    if(this.playerPunch){this.playerPunch.t+=dt*3.6;if(this.playerPunch.t>=1)this.playerPunch=null;}
    if(this.opponentAttack){this.opponentAttack.t+=dt*2.4;if(this.opponentAttack.t>=1)this.opponentAttack=null;}
    const idle=Math.sin(this.clock*2.4),recoil=this.impact;
    this.opp.position.x=Math.sin(this.clock*.82)*.2;this.opp.position.z=-1.1-recoil*.18;
    this.opp.rotation.y=Math.sin(this.clock*.7)*.08+(this.hitSide===0?.14:-.14)*recoil;
    this.opp.rotation.z=(this.hitSide===0?-.13:.13)*recoil;
    this.opp.position.y=Math.abs(idle)*.025;
    this.head.rotation.z=Math.sin(this.clock*1.5)*.035+(this.hitSide===0?-.22:.22)*recoil;
    this.oppArms.forEach((a,i)=>{
      const sign=a.sign;const shoulder=new THREE.Vector3(sign*.55,1.68,0);
      const elbow=new THREE.Vector3(sign*.75,1.34+idle*.03,.22);
      const hand=new THREE.Vector3(sign*.46,1.72+idle*.04,.55);
      if(this.opponentAttack&&this.opponentAttack.side===i){const phase=Math.sin(Math.PI*this.opponentAttack.t);hand.z+=phase*2.15;hand.x=lerp(hand.x,sign*.12,phase);hand.y+=phase*.03;elbow.z+=phase*.85;}
      placeSegment(a.upper,shoulder,elbow);placeSegment(a.lower,elbow,hand);a.hand.position.copy(hand);a.cuff.position.copy(hand).add(new THREE.Vector3(0,-.17,-.1));a.cuff.rotation.x=Math.PI/2;
    });
    const defendOffset=this.defense==='left'?-0.2:this.defense==='right'?.2:0;
    const duckOffset=this.defense==='duck'?-.18:0;
    this.playerGloves.forEach((g,i)=>{
      const sign=g.sign;let x=sign*.52+defendOffset,y=1.18+duckOffset+Math.sin(this.clock*2.5+i)*.03,z=3.15;
      if(this.defense==='block'){x=sign*.27;y=1.55;z=3.0;}
      if(this.playerPunch&&this.playerPunch.side===i){const phase=Math.sin(Math.PI*this.playerPunch.t);z-=phase*1.95;x=lerp(x,sign*.19,phase);y+=(this.playerPunch.type==='uppercut'?.58:this.playerPunch.type==='hook'?.12:.22)*phase;}
      g.group.position.set(x,y,z);g.group.rotation.z=sign*(this.playerPunch&&this.playerPunch.side===i?.23:0);
    });
    this.camera.position.set(this.baseCamera.x+defendOffset*.85+(Math.random()-.5)*this.shake,this.baseCamera.y+duckOffset+(Math.random()-.5)*this.shake*.5,this.baseCamera.z+(Math.random()-.5)*this.shake);
    this.camera.lookAt(defendOffset*.3,1.4+duckOffset*.5,-.7);
    this.renderer.render(this.scene,this.camera);
  }
}
