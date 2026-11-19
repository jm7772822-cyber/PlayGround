(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const ui = {
    screen: document.getElementById('screen'), title: document.getElementById('screenTitle'),
    eyebrow: document.getElementById('screenEyebrow'), copy: document.getElementById('screenCopy'),
    play: document.getElementById('playBtn'), playText: document.getElementById('playText'),
    hint: document.getElementById('screenHint'), score: document.getElementById('score'),
    lives: document.getElementById('lives'), level: document.getElementById('level'),
    best: document.getElementById('bestScore'), status: document.getElementById('statusText'),
    pause: document.getElementById('pauseBadge'), sound: document.getElementById('soundBtn'), soundIcon: document.getElementById('soundIcon')
  };
  const colors = ['#ff6bab','#ff9d67','#ffd66b','#72f5b5','#62e9f4','#8290ff','#bd83ff'];
  let phase = 'ready', level = 1, score = 0, lives = 3, best = Number(localStorage.getItem('neonOrbitBest') || 0);
  let paddle, ball, bricks = [], particles = [], drops = [], stars = [], lastTime = 0, shake = 0, combo = 0, comboTimer = 0;
  let keys = {}, pointerX = null, wideTimer = 0, slowTimer = 0, soundOn = true, audio = null;

  ui.best.textContent = format(best);
  for (let i=0;i<100;i++) stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.25+.25,a:.18+Math.random()*.55,tw:Math.random()*6.28});
  function format(n){ return String(Math.max(0,Math.floor(n))).padStart(6,'0'); }
  function resetPaddle(){ paddle={x:W/2-58,y:H-48,w:116,h:12,speed:650}; }
  function resetBall(){ ball={x:paddle.x+paddle.w/2,y:paddle.y-12,r:8,vx:0,vy:0,trail:[]}; }
  function makeBricks(){
    bricks=[]; const cols=10, rows=Math.min(5+Math.floor((level-1)/2),7), gap=9, bw=75, bh=20;
    const total=cols*bw+(cols-1)*gap, left=(W-total)/2, top=83;
    for(let row=0;row<rows;row++) for(let col=0;col<cols;col++){
      if(level>2 && row>1 && (col+row+level)%11===0) continue;
      const hp=(level>1 && row<Math.min(2,Math.floor(level/2)))?2:1;
      bricks.push({x:left+col*(bw+gap),y:top+row*(bh+10),w:bw,h:bh,row,hp,maxHp:hp,color:colors[row%colors.length],alive:true});
    }
  }
  function setup(){resetPaddle();resetBall();makeBricks();}
  setup();
  function audioBeep(freq=420,duration=.06,type='sine',vol=.035){
    if(!soundOn)return;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch(_e){}
  }
  function updateHud(){ui.score.textContent=format(score);ui.lives.textContent='● '.repeat(Math.max(0,lives)).trim()||'—';ui.level.textContent=`SECTOR ${String(level).padStart(2,'0')}`;ui.best.textContent=format(best);}
  function showScreen(kind){
    ui.screen.classList.remove('hidden');
    if(kind==='start'){
      ui.eyebrow.textContent='A COSMIC ARCADE CLASSIC';ui.title.innerHTML='NEON<br><em>ORBIT</em>';ui.copy.innerHTML='Break through the grid. Catch the light.<br>How far can you go?';ui.playText.textContent='LAUNCH GAME';ui.hint.innerHTML='PRESS <kbd>SPACE</kbd> OR TAP TO LAUNCH';
    }else if(kind==='lost'){
      ui.eyebrow.textContent='SIGNAL INTERRUPTED';ui.title.innerHTML='ORB<br><em>LOST</em>';ui.copy.innerHTML=lives>0?'A little turbulence. Your run is still alive.':'The sector got the better of you.<br>Ready for another run?';ui.playText.textContent=lives>0?'TRY AGAIN':'PLAY AGAIN';ui.hint.innerHTML='PRESS <kbd>SPACE</kbd> TO CONTINUE';
    }else{
      ui.eyebrow.textContent='ALL SECTORS CLEARED';ui.title.innerHTML='NICE<br><em>FLIGHT</em>';ui.copy.innerHTML=`Final score: ${format(score)}<br>The universe is yours. For now.`;ui.playText.textContent='PLAY AGAIN';ui.hint.innerHTML='PRESS <kbd>SPACE</kbd> TO RESTART';
    }
  }
  function launch(){
    if(phase==='paused'){resume();return;}
    if(phase==='over'){level=1;score=0;lives=3;combo=0;wideTimer=slowTimer=0;setup();updateHud();}
    phase='playing';ui.screen.classList.add('hidden');ui.pause.hidden=true;ui.status.textContent='ORB IN FLIGHT';
    const angle=(-Math.PI/2)+(Math.random()-.5)*.62, speed=385+level*14;ball.x=paddle.x+paddle.w/2;ball.y=paddle.y-ball.r-1;ball.vx=Math.cos(angle)*speed;ball.vy=Math.sin(angle)*speed;audioBeep(580,.11,'triangle',.04);
  }
  function pause(){if(phase!=='playing')return;phase='paused';ui.pause.hidden=false;ui.status.textContent='FLIGHT PAUSED';}
  function resume(){if(phase!=='paused')return;phase='playing';ui.pause.hidden=true;ui.status.textContent='ORB IN FLIGHT';lastTime=performance.now();}
  ui.play.addEventListener('click',()=>launch());
  ui.sound.addEventListener('click',()=>{soundOn=!soundOn;ui.soundIcon.textContent=soundOn?'♫':'♪̸';ui.sound.setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');if(soundOn)audioBeep(660,.08);});
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();if([' ','arrowleft','arrowright'].includes(k))e.preventDefault();keys[k]=true;
    if(k===' '){if(phase==='ready'||phase==='over')launch();else if(phase==='paused')resume();}
    if(k==='p'||k==='escape'){if(phase==='playing')pause();else if(phase==='paused')resume();}
  });
  window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
  function toGameX(e){const rect=canvas.getBoundingClientRect();return (e.clientX-rect.left)*W/rect.width;}
  canvas.addEventListener('pointermove',e=>{pointerX=toGameX(e);});
  canvas.addEventListener('pointerdown',e=>{pointerX=toGameX(e);if(phase==='ready'||phase==='over')launch();});
  canvas.addEventListener('pointerleave',()=>{pointerX=null;});
  function burst(x,y,color,count=9){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*190;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.45,max:.8,size:1.5+Math.random()*2.5,color});}}
  function addScore(n){score+=n;if(score>best){best=score;localStorage.setItem('neonOrbitBest',String(best));}updateHud();}
  function collectDrop(d){if(d.type==='wide'){wideTimer=12;paddle.w=164;}else{slowTimer=9;ball.vx*=.72;ball.vy*=.72;}audioBeep(d.type==='wide'?760:280,.16,'sine',.055);burst(d.x,d.y,d.type==='wide'?'#62f5e5':'#ff69b4',13);}
  function update(dt){
    for(const s of stars)s.tw+=dt;
    if(phase!=='playing')return;
    if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=0;}
    if(wideTimer>0){wideTimer-=dt;if(wideTimer<=0)paddle.w=116;}
    if(slowTimer>0){slowTimer-=dt;if(slowTimer<=0){const speed=Math.hypot(ball.vx,ball.vy);if(speed>0){ball.vx*=1.32;ball.vy*=1.32;}}}
    const dir=(keys.arrowleft||keys.a?-1:0)+(keys.arrowright||keys.d?1:0);
    if(dir){paddle.x+=dir*paddle.speed*dt;}else if(pointerX!==null){paddle.x+=(pointerX-paddle.w/2-paddle.x)*Math.min(1,dt*17);}
    paddle.x=Math.max(38,Math.min(W-38-paddle.w,paddle.x));
    ball.trail.unshift({x:ball.x,y:ball.y});if(ball.trail.length>8)ball.trail.pop();
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x-ball.r<38){ball.x=38+ball.r;ball.vx=Math.abs(ball.vx);audioBeep(210,.025,'sine',.018);}else if(ball.x+ball.r>W-38){ball.x=W-38-ball.r;ball.vx=-Math.abs(ball.vx);audioBeep(210,.025,'sine',.018);}
    if(ball.y-ball.r<35){ball.y=35+ball.r;ball.vy=Math.abs(ball.vy);audioBeep(210,.025,'sine',.018);}
    if(ball.vy>0&&ball.y+ball.r>=paddle.y&&ball.y-ball.r<=paddle.y+paddle.h&&ball.x>=paddle.x-2&&ball.x<=paddle.x+paddle.w+2){
      ball.y=paddle.y-ball.r;const offset=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);const speed=Math.min(650,Math.hypot(ball.vx,ball.vy)*1.025);const angle=offset*1.12-Math.PI/2;ball.vx=Math.cos(angle)*speed;ball.vy=Math.sin(angle)*speed;audioBeep(340,.05,'triangle',.035);burst(ball.x,paddle.y,'#62f5e5',4);
    }
    for(const b of bricks){if(!b.alive)continue;if(ball.x+ball.r>b.x&&ball.x-ball.r<b.x+b.w&&ball.y+ball.r>b.y&&ball.y-ball.r<b.y+b.h){
      const prevX=ball.x-ball.vx*dt,prevY=ball.y-ball.vy*dt;
      if(prevY+ball.r<=b.y||prevY-ball.r>=b.y+b.h)ball.vy*=-1;else ball.vx*=-1;
      b.hp--;combo++;comboTimer=1.5;addScore((b.hp<=0?100:45)+Math.min(combo,8)*10);audioBeep(440+b.row*45,.055,'sine',.025);shake=2;
      if(b.hp<=0){b.alive=false;burst(b.x+b.w/2,b.y+b.h/2,b.color,12);if(Math.random()<.105)drops.push({x:b.x+b.w/2,y:b.y+b.h/2,vy:105,type:Math.random()<.62?'wide':'slow'});}else{burst(ball.x,ball.y,b.color,4);}
      break;
    }}
    for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.y+=d.vy*dt;if(d.y>paddle.y&&d.y<paddle.y+paddle.h+10&&d.x>paddle.x-5&&d.x<paddle.x+paddle.w+5){collectDrop(d);drops.splice(i,1);}else if(d.y>H)drops.splice(i,1);}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt);p.life-=dt;if(p.life<=0)particles.splice(i,1);}
    if(ball.y-ball.r>H){lives--;combo=0;updateHud();audioBeep(130,.25,'sawtooth',.045);if(lives<=0){phase='over';ui.status.textContent='SIGNAL LOST';showScreen('lost');}else{resetBall();phase='ready';ui.status.textContent='ORB RECOVERED';showScreen('lost');}return;}
    if(bricks.every(b=>!b.alive)){level++;addScore(500);makeBricks();ball.vx*=1.08;ball.vy*=1.08;burst(W/2,260,'#62f5e5',50);audioBeep(780,.25,'triangle',.055);ui.status.textContent='SECTOR CLEARED';if(level>8){phase='over';showScreen('win');}else{ui.level.textContent=`SECTOR ${String(level).padStart(2,'0')}`;}}
    if(shake>0)shake=Math.max(0,shake-dt*14);
  }
  function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function draw(){
    ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake*2,(Math.random()-.5)*shake*2);
    ctx.clearRect(-10,-10,W+20,H+20);
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0c1023');bg.addColorStop(1,'#090c1b');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    for(const s of stars){ctx.globalAlpha=s.a*(.72+.28*Math.sin(s.tw));ctx.fillStyle='#c9d6ff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    ctx.strokeStyle='#26304d55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(38,28);ctx.lineTo(38,H-20);ctx.moveTo(W-38,28);ctx.lineTo(W-38,H-20);ctx.stroke();
    ctx.fillStyle='#98a6d433';ctx.font='9px monospace';ctx.textAlign='left';ctx.fillText('ORBITAL FIELD / '+String(level).padStart(2,'0'),52,24);ctx.textAlign='right';ctx.fillText('X '+String(Math.floor(score)).padStart(6,'0'),W-52,24);ctx.textAlign='left';
    for(const b of bricks){if(!b.alive)continue;ctx.save();ctx.shadowColor=b.color;ctx.shadowBlur=b.hp<b.maxHp?5:12;roundedRect(b.x,b.y,b.w,b.h,3);ctx.fillStyle=b.hp<b.maxHp?'#252b45':b.color;ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#ffffff28';roundedRect(b.x+2,b.y+2,b.w-4,4,2);ctx.fill();if(b.hp>1){ctx.fillStyle='#0c1123';ctx.beginPath();ctx.arc(b.x+b.w/2,b.y+b.h/2,2,0,Math.PI*2);ctx.fill();}ctx.restore();}
    for(const d of drops){ctx.save();ctx.shadowColor=d.type==='wide'?'#62f5e5':'#ff69b4';ctx.shadowBlur=16;ctx.fillStyle=d.type==='wide'?'#62f5e5':'#ff69b4';ctx.beginPath();ctx.arc(d.x,d.y,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0b1020';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.type==='wide'?'↔':'◷',d.x,d.y);ctx.restore();}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;ctx.shadowBlur=0;
    if(ball){for(let i=ball.trail.length-1;i>=0;i--){const t=ball.trail[i];ctx.globalAlpha=(1-i/ball.trail.length)*.18;ctx.fillStyle='#62f5e5';ctx.beginPath();ctx.arc(t.x,t.y,ball.r*(1-i/ball.trail.length),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.shadowColor='#62f5e5';ctx.shadowBlur=23;ctx.fillStyle='#efffff';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    ctx.save();ctx.shadowColor=wideTimer>0?'#62f5e5':'#a78bfa';ctx.shadowBlur=18;const pg=ctx.createLinearGradient(paddle.x,paddle.y,paddle.x+paddle.w,paddle.y);pg.addColorStop(0,wideTimer>0?'#42cfcf':'#9d74e8');pg.addColorStop(.5,wideTimer>0?'#adfff2':'#eeeaff');pg.addColorStop(1,wideTimer>0?'#42cfcf':'#9d74e8');ctx.fillStyle=pg;roundedRect(paddle.x,paddle.y,paddle.w,paddle.h,6);ctx.fill();ctx.restore();
    if(combo>1&&comboTimer>0&&phase==='playing'){ctx.globalAlpha=Math.min(1,comboTimer);ctx.textAlign='center';ctx.fillStyle='#ffb3da';ctx.font='bold 12px monospace';ctx.fillText(`${combo}× COMBO`,W/2,H-82);ctx.globalAlpha=1;}
    if(wideTimer>0||slowTimer>0){ctx.fillStyle='#9199b9';ctx.font='8px monospace';if(wideTimer>0)ctx.fillText(`WIDE ${wideTimer.toFixed(1)}s`,54,H-24);if(slowTimer>0)ctx.fillText(`SLOW ${slowTimer.toFixed(1)}s`,54,H-36);}
    ctx.restore();
  }
  function frame(now){const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;update(dt);draw();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  showScreen('start');updateHud();
})();
