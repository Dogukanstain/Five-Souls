const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_, res) => res.json({ ok: true }));

const CHARACTERS = {
  dogukan: { name: 'Doğukan', color: '#f04452', dark: '#8d2436', role: 'Warrior · Savaşçı', hp: 135, atk: 27 },
  yaren: { name: 'Yaren', color: '#f3c84b', dark: '#a87522', role: 'Healer · Şifacı', hp: 110, atk: 17 },
  aysima: { name: 'Aysima', color: '#b47aff', dark: '#6338a1', role: 'Archer · Okçu', hp: 95, atk: 24 },
  berken: { name: 'Berken', color: '#ff78bb', dark: '#a93e79', role: 'Mage · Büyücü', hp: 90, atk: 29 },
  emre: { name: 'Emre', color: '#55d68b', dark: '#26794f', role: 'Fighter · Dövüşçü', hp: 120, atk: 23 }
};
const rooms = new Map();
const MAP_W = 28, MAP_H = 20, TILE = 32;
function newRoom(code) {
  const walls = new Set();
  for (let x=0;x<MAP_W;x++){ walls.add(`${x},0`); walls.add(`${x},${MAP_H-1}`); }
  for (let y=0;y<MAP_H;y++){ walls.add(`0,${y}`); walls.add(`${MAP_W-1},${y}`); }
  // Pillars and broken wall formations, leaving a navigable dungeon.
  [[5,4],[5,5],[5,6],[10,3],[11,3],[16,5],[16,6],[16,7],[22,4],[22,5],[8,12],[9,12],[18,13],[19,13],[20,13],[12,16],[13,16]].forEach(([x,y])=>walls.add(`${x},${y}`));
  return { code, players:{}, stage:1, enemies: makeEnemies(1), chests:[{id:'chest1',x:3,y:15,opened:false},{id:'chest2',x:24,y:3,opened:false}], gate:{x:25,y:17,unlocked:false}, walls, startedAt:Date.now(), lastReset:Date.now() };
}
function makeEnemies(stage=1){
 const waves = {
  1: [
   {id:'slime1',kind:'slime',x:8.5,y:6.5,hp:48,maxHp:48,atk:8},
   {id:'slime2',kind:'slime',x:13.5,y:9.5,hp:48,maxHp:48,atk:8},
   {id:'skeleton1',kind:'skeleton',x:20.5,y:8.5,hp:62,maxHp:62,atk:10}
  ],
  2: [
   {id:'bat1',kind:'bat',x:7.5,y:7.5,hp:52,maxHp:52,atk:11},
   {id:'orc1',kind:'orc',x:15.5,y:8.5,hp:95,maxHp:95,atk:14},
   {id:'bat2',kind:'bat',x:20.5,y:13.5,hp:52,maxHp:52,atk:11},
   {id:'skeleton2',kind:'skeleton',x:8.5,y:15.5,hp:72,maxHp:72,atk:12}
  ],
  3: [
   {id:'wraith1',kind:'wraith',x:7.5,y:6.5,hp:88,maxHp:88,atk:15},
   {id:'orc2',kind:'orc',x:14.5,y:8.5,hp:115,maxHp:115,atk:16},
   {id:'wraith2',kind:'wraith',x:20.5,y:9.5,hp:88,maxHp:88,atk:15},
   {id:'skeleton3',kind:'skeleton',x:10.5,y:15.5,hp:85,maxHp:85,atk:13}
  ],
  4: [
   {id:'orc3',kind:'orc',x:8.5,y:7.5,hp:135,maxHp:135,atk:18},
   {id:'wraith3',kind:'wraith',x:14.5,y:6.5,hp:105,maxHp:105,atk:17},
   {id:'orc4',kind:'orc',x:20.5,y:10.5,hp:135,maxHp:135,atk:18},
   {id:'skeleton4',kind:'skeleton',x:9.5,y:15.5,hp:100,maxHp:100,atk:15}
  ],
  5: [
   {id:'boss',kind:'golem',x:22.5,y:15.5,hp:520,maxHp:520,atk:24},
   {id:'guard1',kind:'orc',x:8.5,y:7.5,hp:150,maxHp:150,atk:18},
   {id:'guard2',kind:'wraith',x:14.5,y:8.5,hp:125,maxHp:125,atk:17}
  ]
 };
 return (waves[stage]||waves[1]).map(e=>({...e,alive:true,cd:0}));
}
const STAGE_NAMES = ['','Fısıltı Mahzeni','Yarasa Yuvası','Unutulmuş Ruhlar','Kara Kale','Kadim Muhafız'];
function getRoom(code){ if(!rooms.has(code)) rooms.set(code,newRoom(code)); return rooms.get(code); }
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function tileBlocked(room,x,y){ const tx=Math.floor(x),ty=Math.floor(y); return room.walls.has(`${tx},${ty}`); }
function publicState(room){
 return {code:room.code, stage:room.stage, stageName:STAGE_NAMES[room.stage], won:room.won||false, players:Object.values(room.players).map(p=>({...p})), enemies:room.enemies.map(e=>({...e})), chests:room.chests.map(c=>({...c})), gate:{...room.gate}, walls:[...room.walls], map:{w:MAP_W,h:MAP_H,tile:TILE}};
}
function broadcast(room){ io.to(room.code).emit('state',publicState(room)); }
io.on('connection', socket=>{
 socket.on('join', ({room:rawRoom='GECE', character='dogukan', name}={})=>{
   const code=String(rawRoom).toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,12)||'GECE';
   const room=getRoom(code); socket.join(code); socket.data.room=code;
   const char=CHARACTERS[character] ? character : 'dogukan';
   const base=CHARACTERS[char];
   room.players[socket.id]={id:socket.id,character:char,name:String(name||base.name).slice(0,18),x:2.5+Math.random()*2,y:2.5+Math.random()*2,hp:base.hp,maxHp:base.hp,atk:base.atk,color:base.color,dark:base.dark,role:base.role,level:1,xp:0,gold:0,dir:'down',moving:false,attackUntil:0,skillUntil:0,invulnUntil:0};
   socket.emit('joined',{id:socket.id,room:code,characters:CHARACTERS}); broadcast(room);
 });
 socket.on('move', data=>{
   const room=rooms.get(socket.data.room); if(!room)return; const p=room.players[socket.id]; if(!p||p.hp<=0)return;
   let dx=Math.max(-1,Math.min(1,Number(data?.dx)||0)),dy=Math.max(-1,Math.min(1,Number(data?.dy)||0));
   const len=Math.hypot(dx,dy)||1; dx/=len;dy/=len;
   p.moving=!!(dx||dy); if(Math.abs(dx)>Math.abs(dy))p.dir=dx<0?'left':'right'; else if(dy)p.dir=dy<0?'up':'down';
   const speed=0.095; const nx=p.x+dx*speed,ny=p.y+dy*speed;
   if(!tileBlocked(room,nx,p.y))p.x=Math.max(1.3,Math.min(MAP_W-1.3,nx));
   if(!tileBlocked(room,p.x,ny))p.y=Math.max(1.3,Math.min(MAP_H-1.3,ny));
   broadcast(room);
 });
 socket.on('attack',()=>{
   const room=rooms.get(socket.data.room);if(!room)return;const p=room.players[socket.id];if(!p||p.hp<=0||room.won)return;
   const now=Date.now();if(now-(p.lastAttack||0)<430)return;p.lastAttack=now;p.attackUntil=now+180;
   let target=null,best=1.75;
   for(const e of room.enemies){if(!e.alive)continue;const d=dist(p,e);if(d<best){best=d;target=e;}}
   if(target){let dmg=p.atk+(p.level-1)*4;target.hp=Math.max(0,target.hp-dmg);if(target.hp===0){target.alive=false;p.xp+=target.kind==='golem'?100:target.kind==='skeleton'?35:20;p.gold+=target.kind==='golem'?30:5;if(p.xp>=p.level*70){p.xp-=p.level*70;p.level++;p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+20);p.atk+=3;}io.to(room.code).emit('notice',`${p.name}, ${target.kind==='golem'?'Zindan Muhafızı':target.kind==='skeleton'?'iskeleti':'balçığı'} yendi!`);}}
   broadcast(room);
 });
 socket.on('skill',()=>{
   const room=rooms.get(socket.data.room);if(!room)return;const p=room.players[socket.id];if(!p||p.hp<=0)return;const now=Date.now();if(now<(p.skillReady||0))return;p.skillReady=now+5000;p.skillUntil=now+550;
   if(p.character==='yaren'){for(const ally of Object.values(room.players)){if(dist(p,ally)<4)ally.hp=Math.min(ally.maxHp,ally.hp+38);}io.to(room.code).emit('notice',`${p.name} şifa ışığı kullandı!`);}
   else if(p.character==='berken'){for(const e of room.enemies){if(e.alive&&dist(p,e)<3.8){e.hp=Math.max(0,e.hp-46);if(e.hp===0){e.alive=false;p.xp+=20;p.gold+=5;}}}io.to(room.code).emit('notice',`${p.name} büyü patlaması kullandı!`);}
   else if(p.character==='aysima'){let target=room.enemies.filter(e=>e.alive&&dist(p,e)<5.5).sort((a,b)=>dist(p,a)-dist(p,b))[0];if(target){target.hp=Math.max(0,target.hp-44);if(!target.hp){target.alive=false;p.xp+=20;p.gold+=5;}}io.to(room.code).emit('notice',`${p.name} keskin ok attı!`);}
   else if(p.character==='emre'){for(const e of room.enemies){if(e.alive&&dist(p,e)<2.7)e.hp=Math.max(0,e.hp-32);if(e.alive&&e.hp===0){e.alive=false;p.xp+=20;p.gold+=5;}}io.to(room.code).emit('notice',`${p.name} dövüş kombosu yaptı!`);}
   else {for(const e of room.enemies){if(e.alive&&dist(p,e)<2.7)e.hp=Math.max(0,e.hp-40);if(e.alive&&e.hp===0){e.alive=false;p.xp+=20;p.gold+=5;}}io.to(room.code).emit('notice',`${p.name} kızıl kılıç darbesi kullandı!`);}
   broadcast(room);
 });
 socket.on('interact',()=>{
   const room=rooms.get(socket.data.room);if(!room)return;const p=room.players[socket.id];if(!p)return;
   const chest=room.chests.find(c=>!c.opened&&dist(p,c)<1.8);
   if(chest){chest.opened=true;p.gold+=25;p.hp=Math.min(p.maxHp,p.hp+20);p.xp+=15;socket.emit('notice','Sandık açıldı: +25 altın, +20 can, +15 XP!');}
   else if(dist(p,room.gate)<2.1){if(room.enemies.every(e=>!e.alive)){room.gate.unlocked=true;if(room.stage<5){room.stage++;room.enemies=makeEnemies(room.stage);room.chests=[{id:'chest1',x:3,y:15,opened:false},{id:'chest2',x:24,y:3,opened:false}];room.gate={x:25,y:17,unlocked:false};for(const hero of Object.values(room.players)){hero.x=2.5;hero.y=2.5;hero.hp=Math.min(hero.maxHp,hero.hp+35);hero.invulnUntil=Date.now()+1800;}io.to(room.code).emit('notice',`BÖLÜM ${room.stage}/5: ${STAGE_NAMES[room.stage]}! Yeni canavarlar ortaya çıktı.`);}else{room.won=true;io.to(room.code).emit('notice','ZAFER! Kadim Muhafız düştü. Five Souls tamamlandı!');}}else socket.emit('notice','Kapı mühürlü. Bu bölümdeki tüm canavarları yen!');}
   else {socket.emit('notice','Yakında etkileşime geçilecek bir şey yok.');}
   broadcast(room);
 });
 socket.on('chat',msg=>{const room=rooms.get(socket.data.room);if(!room)return;const p=room.players[socket.id];if(!p)return;const text=String(msg||'').slice(0,120).trim();if(text)io.to(room.code).emit('chat',{name:p.name,color:p.color,text});});
 socket.on('respawn',()=>{const room=rooms.get(socket.data.room);if(!room)return;const p=room.players[socket.id];if(!p)return;p.hp=p.maxHp;p.x=2.5;p.y=2.5;p.invulnUntil=Date.now()+2500;broadcast(room);});
 socket.on('disconnect',()=>{const room=rooms.get(socket.data.room);if(!room)return;delete room.players[socket.id];if(!Object.keys(room.players).length){setTimeout(()=>{const r=rooms.get(room.code);if(r&&!Object.keys(r.players).length)rooms.delete(room.code);},60000);}else broadcast(room);});
});
// Enemy turns: move toward nearby heroes and deal contact damage.
setInterval(()=>{
 const now=Date.now();for(const room of rooms.values()){
  const players=Object.values(room.players).filter(p=>p.hp>0);
  for(const e of room.enemies){if(!e.alive||!players.length)continue;const target=players.slice().sort((a,b)=>dist(a,e)-dist(b,e))[0];const d=dist(target,e);
   if(d>1.05&&d<7){const dx=(target.x-e.x)/d,dy=(target.y-e.y)/d;const nx=e.x+dx*0.018,ny=e.y+dy*0.018;if(!tileBlocked(room,nx,e.y))e.x=nx;if(!tileBlocked(room,e.x,ny))e.y=ny;}
   if(d<1.15&&now>(e.cd||0)){e.cd=now+(e.kind==='golem'?1250:1600);if(now>(target.invulnUntil||0)){target.hp=Math.max(0,target.hp-e.atk);io.to(room.code).emit('notice',`${target.name} ${e.kind==='golem'?'muhafızdan':'canavardan'} hasar aldı!`);}}
  }
  if(players.length)broadcast(room);
 }
},180);
server.listen(PORT,()=>console.log(`Midnight Protocol Dungeon listening on ${PORT}`));
