// Minimal Clash Royale-like MVP
(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Game constants
  const MAX_ELIXIR = 10;
  const ELIXIR_RATE = 1; // per second

  // Towers
  const towers = {
    playerLeft: { x: 120, y: H - 120, hp: 800, maxHp:800, side:'player' },
    playerRight: { x: W - 120, y: H - 120, hp: 800, maxHp:800, side:'player' },
    enemyLeft: { x: 120, y: 120, hp: 800, maxHp:800, side:'enemy' },
    enemyRight: { x: W - 120, y: 120, hp: 800, maxHp:800, side:'enemy' }
  };

  // Card definitions
  const CARD_TYPES = {
    Knight: { cost:3, hp:120, dmg:26, range:18, speed:50, size:18, color:'#c49a6c' },
    Archer: { cost:3, hp:70, dmg:18, range:120, speed:60, size:14, color:'#7ad7ff' },
    Giant: { cost:5, hp:350, dmg:44, range:22, speed:30, size:24, color:'#ffb86b' },
    Skeleton: { cost:1, hp:40, dmg:12, range:18, speed:80, size:10, color:'#dddddd' }
  };

  // UI
  const elixirEl = document.getElementById('elixirVal');
  const deckEl = document.getElementById('deck');
  const restartBtn = document.getElementById('restart');

  let elixir = 5, lastElixirTick = Date.now();
  let units = []; // active units
  let selectedCard = null;
  let hand = [];

  // Enemy AI state
  let enemyElixir = 5; let lastEnemyTick = Date.now();

  // helper utils
  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

  function resetGame(){
    // reset towers
    for(const k of Object.keys(towers)){ towers[k].hp = towers[k].maxHp }
    units = [];
    elixir = 5; enemyElixir = 5; lastElixirTick = lastEnemyTick = Date.now();
    hand = drawStartingHand(); selectedCard = null;
    renderHand();
  }

  function drawStartingHand(){
    const keys = Object.keys(CARD_TYPES);
    const h = [];
    for(let i=0;i<4;i++) h.push( keys[Math.floor(Math.random()*keys.length)] );
    return h;
  }

  function renderHand(){
    deckEl.innerHTML = '';
    hand.forEach((name, idx)=>{
      const def = CARD_TYPES[name];
      const div = document.createElement('div');
      div.className = 'card' + (elixir < def.cost ? ' disabled':'' ) + (selectedCard===idx? ' selected':'');
      div.style.background = def.color;
      div.innerText = name + '\n' + def.cost;
      div.title = name;
      div.onclick = ()=>{
        if(elixir < def.cost) return;
        selectedCard = idx; renderHand();
      };
      deckEl.appendChild(div);
    });
  }

  canvas.addEventListener('click', (ev)=>{
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width/rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height/rect.height);

    if(selectedCard===null) return;
    const cardName = hand[selectedCard];
    const def = CARD_TYPES[cardName];
    // allow deploy only on player's half
    if(y < H/2) return; // restrict to bottom half

    deployUnit(cardName, x, y, 'player');
    elixir -= def.cost;
    // replace card
    hand[selectedCard] = Object.keys(CARD_TYPES)[Math.floor(Math.random()*Object.keys(CARD_TYPES).length)];
    selectedCard = null;
    renderHand();
  });

  function deployUnit(name,x,y,side){
    const base = CARD_TYPES[name];
    units.push({ id: Math.random().toString(36).slice(2,9), name, x,y, vx:0, vy:0, hp: base.hp, maxHp: base.hp, dmg: base.dmg, range: base.range, speed: base.speed, size: base.size, side});
  }

  // Simple targeting: units target nearest enemy unit in range otherwise nearest enemy tower
  function findTarget(u){
    const enemies = units.filter(o=>o.side !== u.side);
    let close = null; let best = Infinity;
    for(const e of enemies){ const d = dist(u,e); if(d<best){ best=d; close=e }}
    if(close && dist(u,close) <= Math.max(u.range, close.size+u.size+6)) return close;
    // else choose nearest opposing tower
    const enemyTowers = Object.values(towers).filter(t=> t.side !== u.side && t.hp>0);
    if(enemyTowers.length===0) return null;
    let tbest = enemyTowers[0]; let td = dist(u,tbest);
    for(const t of enemyTowers){ const d = dist(u,t); if(d<td){ td=d; tbest=t }}
    return tbest;
  }

  function step(dt){
    // AI elixir regen
    if(Date.now() - lastEnemyTick >= 1000){ enemyElixir = Math.min(MAX_ELIXIR, enemyElixir + ELIXIR_RATE); lastEnemyTick = Date.now(); }
    if(Math.random() < 0.015){ // small chance each frame to try play
      // try to play a random card if enemy has enough elixir
      const types = Object.keys(CARD_TYPES);
      const choice = types[Math.floor(Math.random()*types.length)];
      if(enemyElixir >= CARD_TYPES[choice].cost){ enemyElixir -= CARD_TYPES[choice].cost;
        // spawn at enemy side (top half), near one of two spawn columns
        const spawnX = Math.random()<0.5 ? towers.enemyLeft.x + (Math.random()*30-15) : towers.enemyRight.x + (Math.random()*30-15);
        const spawnY = 120 + 30 + Math.random()*30;
        deployUnit(choice, spawnX, spawnY, 'enemy');
      }
    }

    // update units
    for(const u of units){
      if(u.hp<=0) continue;
      const target = findTarget(u);
      if(!target) continue;
      // compute desired velocity toward target
      const dx = target.x - u.x, dy = target.y - u.y;
      const d = Math.hypot(dx,dy);
      if(target && d > u.range){ // move closer
        const nx = (dx/d) || 0, ny = (dy/d) || 0;
        u.x += nx * u.speed * dt/1000;
        u.y += ny * u.speed * dt/1000;
      } else {
        // attack target
        // simple cooldown per unit (store lastAttack)
        u.lastAttack = u.lastAttack || 0;
        if(Date.now() - u.lastAttack > 500){ // attack interval
          u.lastAttack = Date.now();
          target.hp -= u.dmg;
        }
      }
    }

    // remove dead units and apply tower dmg
    units = units.filter(u=>{
      if(u.hp<=0) return false;
      // units that are close enough to tower may damage it
      for(const tkey of Object.keys(towers)){
        const t = towers[tkey];
        if(t.side !== u.side && t.hp>0 && Math.hypot(u.x - t.x, u.y - t.y) < u.range + tkey.includes('Left')? (u.size+20) : (u.size+20)){
          // handled by attack routine above when target was tower
        }
      }
      return true;
    });

    // remove dead towers (check hp <= 0) and end conditions
  }

  function draw(){
    ctx.clearRect(0,0,W,H);

    // draw arena dividing center
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(0,H/2-2,W,4);

    // draw towers
    for(const k of Object.keys(towers)){
      const t = towers[k];
      // tower base
      ctx.fillStyle = t.side==='player' ? '#3aaf5d' : '#af3a3a';
      ctx.beginPath(); ctx.arc(t.x, t.y, 28, 0, Math.PI*2); ctx.fill();
      // HP bar
      const w = 80;
      ctx.fillStyle = '#222'; ctx.fillRect(t.x - w/2, t.y - 45, w, 8);
      ctx.fillStyle = '#ff6b6b'; ctx.fillRect(t.x - w/2, t.y - 45, Math.max(0, w*(t.hp/t.maxHp)), 8);
    }

    // draw units
    for(const u of units){
      ctx.fillStyle = u.side === 'player' ? '#ffd76b' : '#7fbfff';
      ctx.beginPath(); ctx.arc(u.x, u.y, u.size, 0, Math.PI*2); ctx.fill();
      // HP
      ctx.fillStyle = '#222'; ctx.fillRect(u.x - u.size, u.y - u.size - 8, u.size*2, 5);
      ctx.fillStyle = '#4caf50'; ctx.fillRect(u.x - u.size, u.y - u.size - 8, Math.max(0, (u.hp/u.maxHp)*u.size*2),5);
    }

    // HUD text (elixir)
    ctx.fillStyle = '#fff'; ctx.font = '14px system-ui'; ctx.fillText('Enemy Elixir: ' + Math.floor(enemyElixir), 10, 18);
    ctx.fillText('Your Elixir: ' + Math.floor(elixir), 10, H-6);

    // check towers destroyed
    const playerTowersAlive = Object.values(towers).filter(t=>t.side==='player' && t.hp>0).length;
    const enemyTowersAlive = Object.values(towers).filter(t=>t.side==='enemy' && t.hp>0).length;
    if(playerTowersAlive===0 || enemyTowersAlive===0){
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff'; ctx.font='36px system-ui'; ctx.textAlign='center'; ctx.fillText(playerTowersAlive===0? 'You Lose' : 'You Win', W/2, H/2);
      running = false;
    }
  }

  // main loop
  let last = performance.now(); let running = true;
  function loop(t){
    const dt = t - last; last = t;
    // elixir regen
    if(Date.now() - lastElixirTick >= 1000){ elixir = Math.min(MAX_ELIXIR, elixir + ELIXIR_RATE); lastElixirTick = Date.now(); renderHand(); }

    step(dt);
    draw();
    if(running) requestAnimationFrame(loop);
  }

  restartBtn.onclick = ()=>{ running = true; resetGame(); last = performance.now(); requestAnimationFrame(loop); }

  // init
  hand = drawStartingHand(); renderHand(); resetGame(); requestAnimationFrame(loop);

})();
