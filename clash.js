// Updated game.js — balance tweaks, projectiles, spell flashes, AI stalls until player deploy, elixir every 2s
(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Game constants
  const MAX_ELIXIR = 10;
  const ELIXIR_RATE = 1; // per interval
  const ELIXIR_INTERVAL = 2000; // milliseconds per elixir (1 elixir every 2 seconds)

  // Towers
  const towers = {
    playerLeft: { x: 120, y: H - 120, hp: 1200, maxHp:1200, side:'player' },
    playerRight: { x: W - 120, y: H - 120, hp: 1200, maxHp:1200, side:'player' },
    enemyLeft: { x: 120, y: 120, hp: 1200, maxHp:1200, side:'enemy' },
    enemyRight: { x: W - 120, y: 120, hp: 1200, maxHp:1200, side:'enemy' }
  };

  // New card definitions (tweaked balances)
  // attackType: 'melee' | 'shot' | 'spell'
  // targets: 'ground' | 'air' | 'all' | 'tower'
  const CARD_TYPES = {
    "trippi troppis": { cost:1, hp:120, dmg:70, range:18, speed:140, size:10, color:'#ffd17a', hitSpeed:300, targets:'ground', troopType:'ground', count:3, attackType:'melee' },
    "Brr Brr patapim": { cost:5, hp:4500, dmg:450, range:26, speed:28, size:34, color:'#c84b4b', hitSpeed:1000, targets:'tower', troopType:'ground', count:1, attackType:'melee' },
    "Lirili Larila": { cost:3, hp:700, dmg:140, range:160, speed:70, size:16, color:'#9ad7ff', hitSpeed:800, targets:'all', troopType:'ground', count:1, attackType:'shot', slow:true, projSpeed:420, projRadius:8 },
    "Tung sahur": { cost:4, hp:1600, dmg:650, range:20, speed:60, size:22, color:'#ff9f7a', hitSpeed:900, targets:'ground', troopType:'ground', count:1, attackType:'melee' },
    "Frulli frullas": { cost:2, hp:300, dmg:110, range:110, speed:90, size:12, color:'#ffd6ff', hitSpeed:700, targets:'all', troopType:'air', count:2, attackType:'shot', projSpeed:380, projRadius:6 },
    "Ballerina Cappuccina": { cost:4, hp:2200, dmg:380, range:18, speed:56, size:20, color:'#f6c6ff', hitSpeed:850, targets:'ground', troopType:'ground', count:1, attackType:'melee', splash:48 },
    "arrows": { cost:3, hp:null, dmg:420, towerMultiplier:0.5, range:0, speed:0, size:0, color:'#ffffff', hitSpeed:0, targets:'all', troopType:'spell', radius:110, flashColor:'rgba(255,255,255,0.95)' },
    "fireball": { cost:4, hp:null, dmg:900, towerMultiplier:0.5, range:0, speed:0, size:0, color:'#ffb27a', hitSpeed:0, targets:'all', troopType:'spell', radius:60, flashColor:'rgba(255,140,50,0.95)' }
  };

  // UI
  const elixirEl = document.getElementById('elixirVal');
  const deckEl = document.getElementById('deck');
  const restartBtn = document.getElementById('restart');

  let elixir = 5, lastElixirTick = Date.now();
  let units = []; // active units
  let projectiles = []; // active projectiles for ranged troops
  let flashes = []; // impact flashes for spells
  let selectedCard = null;
  // each deck contains all 8 cards (in fixed order for predictability)
  const ALL_CARDS = Object.keys(CARD_TYPES);
  let hand = [...ALL_CARDS];

  // Enemy AI state
  let enemyElixir = 5; let lastEnemyTick = Date.now();
  let playerHasDeployed = false; let aiStartTime = 0;

  // helper utils
  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

  function resetGame(){
    // reset towers
    for(const k of Object.keys(towers)){ towers[k].hp = towers[k].maxHp }
    units = [];
    projectiles = []; flashes = [];
    elixir = 5; enemyElixir = 5; lastElixirTick = lastEnemyTick = Date.now();
    hand = [...ALL_CARDS]; selectedCard = null;
    playerHasDeployed = false; aiStartTime = 0;
    renderHand();
  }

  function renderHand(){
    deckEl.innerHTML = '';
    hand.forEach((name, idx)=>{
      const def = CARD_TYPES[name];
      const div = document.createElement('div');
      const disabled = def.cost > elixir;
      div.className = 'card' + (disabled ? ' disabled':'' ) + (selectedCard===idx? ' selected':'');
      div.style.background = def.color;
      div.innerText = name + '\n' + def.cost;
      div.title = name;
      div.onclick = ()=>{
        if(def.cost > elixir) return;
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

    // only allow deploy on player's half for troops; spells can be placed anywhere
    if(def.troopType !== 'spell' && y < H/2) return;

    // spend elixir
    if(elixir < def.cost) { selectedCard = null; renderHand(); return; }
    elixir -= def.cost;

    // mark that player has deployed at least once (unlocks AI)
    if(!playerHasDeployed){ playerHasDeployed = true; aiStartTime = Date.now() + 800; }

    if(def.troopType === 'spell'){
      // apply spell at clicked location and spawn flash
      applySpell(cardName, x, y, 'player');
      flashes.push({ x, y, r: def.radius, life: 450, color: def.flashColor || 'rgba(255,255,255,0.9)' });
    } else {
      // spawn one or more units
      for(let i=0;i<def.count;i++){
        // small lateral offset so multiple units don't overlap exactly
        const offsetX = (i - (def.count-1)/2) * (def.size + 6);
        deployUnit(cardName, x + offsetX, y + Math.random()*6 - 3, 'player');
      }
    }

    selectedCard = null;
    renderHand();
  });

  function applySpell(name, x, y, side){
    const def = CARD_TYPES[name];
    // spawn a visual flash (handled by flashes array); do damage similar to before
    if(name === 'arrows' || name === 'fireball'){
      for(const u of units){
        if(u.hp <= 0) continue;
        if(Math.hypot(u.x - x, u.y - y) <= def.radius){
          u.hp -= def.dmg;
        }
      }
      for(const t of Object.values(towers)){
        if(Math.hypot(t.x - x, t.y - y) <= def.radius){
          t.hp -= Math.floor(def.dmg * (def.towerMultiplier||1));
        }
      }
    }
  }

  function deployUnit(name,x,y,side){
    const base = CARD_TYPES[name];
    const unit = { id: Math.random().toString(36).slice(2,9), name, x,y, vx:0, vy:0, hp: base.hp, maxHp: base.hp, dmg: base.dmg, range: base.range, speed: base.speed, size: base.size, side, troopType: base.troopType, targets: base.targets, lastAttack:0, hitSpeed: base.hitSpeed, slowUntil:0, slowFactor:1, splash: base.splash||0, canFly: base.troopType==='air', projSpeed: base.projSpeed||0, projRadius: base.projRadius||0, attackType: base.attackType || (base.projSpeed ? 'shot' : 'melee') };
    units.push(unit);
  }

  // Projectile creation for ranged troops
  function spawnProjectile(fromUnit, tx, ty){
    const angle = Math.atan2(ty - fromUnit.y, tx - fromUnit.x);
    const speed = fromUnit.projSpeed || 420;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    projectiles.push({ x: fromUnit.x, y: fromUnit.y, vx, vy, dmg: fromUnit.dmg, source: fromUnit, radius: fromUnit.projRadius || 6, life: 3000 });
  }

  // Simple targeting: units target nearest valid enemy unit in range otherwise nearest enemy tower
  function canTarget(u, target){
    if(!target) return false;
    if(target.side && target.side === u.side) return false;
    const isTower = !target.troopType;
    if(isTower){
      if(u.targets === 'tower' || u.targets === 'all') return true;
      return false;
    }
    if(u.targets === 'all') return true;
    if(u.targets === 'ground' && target.troopType === 'ground') return true;
    if(u.targets === 'air' && target.troopType === 'air') return true;
    return false;
  }

  function findTarget(u){
    // find nearby units first
    let best = null; let bd = Infinity;
    for(const o of units){ if(o.side !== u.side && o.hp>0 && canTarget(u,o)){ const d = dist(u,o); if(d < bd){ bd=d; best=o }} }
    if(best && bd <= u.range) return best;
    // if not in range or none, return nearest tower of the opposing side
    const enemyTowers = Object.values(towers).filter(t=> t.side !== u.side && t.hp>0);
    if(enemyTowers.length===0) return null;
    let tbest = enemyTowers[0]; let td = dist(u,tbest);
    for(const t of enemyTowers){ const d = dist(u,t); if(d<td){ td=d; tbest=t }}
    return tbest;
  }

  function step(dt){
    // handle elixir regen on interval (1 elixir per ELIXIR_INTERVAL)
    if(Date.now() - lastElixirTick >= ELIXIR_INTERVAL){ elixir = Math.min(MAX_ELIXIR, elixir + ELIXIR_RATE); lastElixirTick = Date.now(); renderHand(); }

    // AI elixir regen (same pacing)
    if(Date.now() - lastEnemyTick >= ELIXIR_INTERVAL){ enemyElixir = Math.min(MAX_ELIXIR, enemyElixir + ELIXIR_RATE); lastEnemyTick = Date.now(); }

    // AI: stall until player deploys
    const aiEnabled = playerHasDeployed && Date.now() >= aiStartTime;

    if(aiEnabled && Math.random() < 0.018){
      const affordable = ALL_CARDS.filter(n => CARD_TYPES[n].cost <= enemyElixir);
      if(affordable.length){
        const choice = affordable[Math.floor(Math.random()*affordable.length)];
        const def = CARD_TYPES[choice];
        if(def.troopType === 'spell'){
          const tx = Math.random() < 0.5 ? towers.playerLeft.x + Math.random()*80-40 : towers.playerRight.x + Math.random()*80-40;
          const ty = H - 120 - 20 + Math.random()*40;
          applySpell(choice, tx, ty, 'enemy');
          flashes.push({ x: tx, y: ty, r: def.radius, life: 450, color: def.flashColor || 'rgba(255,255,255,0.9)' });
          enemyElixir -= def.cost;
        } else {
          const spawnX = Math.random()<0.5 ? towers.enemyLeft.x + (Math.random()*30-15) : towers.enemyRight.x + (Math.random()*30-15);
          const spawnY = 120 + 30 + Math.random()*30;
          for(let i=0;i<def.count;i++){
            const offsetX = (i - (def.count-1)/2) * (def.size + 6);
            deployUnit(choice, spawnX + offsetX, spawnY + Math.random()*6 - 3, 'enemy');
          }
          enemyElixir -= def.cost;
        }
      }
    }

    // update projectiles
    for(const p of projectiles){
      p.x += p.vx * dt/1000;
      p.y += p.vy * dt/1000;
      p.life -= dt;
      if(p.life <= 0) p._dead = true;
      if(!p._dead){
        let hit = false;
        for(const u of units){
          if(!u._dead && u.side !== p.source.side && u.hp>0){
            if(Math.hypot(u.x - p.x, u.y - p.y) <= p.radius + (u.size||6)){
              // hit
              u.hp -= p.dmg;
              // if projectile came from Lirili, apply slow
              if(p.source && p.source.name === 'Lirili Larila'){
                if(!u.slowUntil || Date.now() + 2000 > u.slowUntil){ u.slowUntil = Date.now() + 2000; u.slowFactor = 0.5; }
              }
              p._dead = true;
              hit = true;
              break;
            }
          }
        }
        if(!hit){
          for(const t of Object.values(towers)){
            if(Math.hypot(t.x - p.x, t.y - p.y) <= p.radius + 28){
              t.hp -= Math.floor(p.dmg * 0.5);
              p._dead = true;
              break;
            }
          }
        }
      }
    }
    projectiles = projectiles.filter(p=>!p._dead);

    // update units
    for(const u of units){
      if(u.hp<=0) continue;
      // expire slow
      if(u.slowUntil && Date.now() > u.slowUntil){ u.slowUntil = 0; u.slowFactor = 1; }

      const target = findTarget(u);
      if(!target) continue;
      const dx = target.x - u.x, dy = target.y - u.y;
      const d = Math.hypot(dx,dy);
      // ranged units will spawn projectiles when attacking
      if(d <= u.range){
        if(Date.now() - (u.lastAttack||0) > (u.hitSpeed||600)){
          u.lastAttack = Date.now();
          if(u.attackType === 'shot' || u.projSpeed){
            // target coordinates for projectile
            const tx = target.x + (Math.random()*6 - 3);
            const ty = target.y + (Math.random()*6 - 3);
            spawnProjectile(u, tx, ty);
          } else {
            // splash or direct melee
            if(u.splash){
              for(const o of units){ if(o.side !== u.side && Math.hypot(o.x - u.x, o.y - u.y) <= u.splash){ o.hp -= u.dmg; } }
              for(const tkey of Object.keys(towers)){
                const t = towers[tkey]; if(t.side !== u.side && Math.hypot(u.x - t.x, u.y - t.y) <= u.splash){ t.hp -= u.dmg; }
              }
            } else {
              if(!target.troopType){ target.hp -= u.dmg; } else { target.hp -= u.dmg; }
            }
          }
        }
      } else {
        // move closer
        const nx = (dx/d) || 0, ny = (dy/d) || 0;
        const effectiveSpeed = u.speed * (u.slowFactor || 1);
        u.x += nx * effectiveSpeed * dt/1000;
        u.y += ny * effectiveSpeed * dt/1000;
      }
    }

    // cleanup dead units
    units = units.filter(u=>u.hp>0);

    // update flashes (visuals)
    for(const f of flashes){ f.life -= dt; }
    flashes = flashes.filter(f=>f.life>0);
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
      const w = 100;
      ctx.fillStyle = '#222'; ctx.fillRect(t.x - w/2, t.y - 52, w, 8);
      ctx.fillStyle = '#ff6b6b'; ctx.fillRect(t.x - w/2, t.y - 52, Math.max(0, w*(t.hp/t.maxHp)), 8);
    }

    // draw flashes (spell impacts)
    for(const f of flashes){
      const alpha = Math.max(0, f.life / 450);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.color || 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - alpha*0.25), 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // draw projectiles
    for(const p of projectiles){
      ctx.beginPath(); ctx.fillStyle = (p.source.side==='player')? '#00f' : '#ff6b6b'; ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
    }

    // draw units
    for(const u of units){
      ctx.fillStyle = u.side === 'player' ? '#ffd76b' : '#7fbfff';
      ctx.beginPath(); ctx.arc(u.x, u.y, u.size, 0, Math.PI*2); ctx.fill();
      // HP
      ctx.fillStyle = '#222'; ctx.fillRect(u.x - u.size, u.y - u.size - 8, u.size*2, 5);
      ctx.fillStyle = '#4caf50'; ctx.fillRect(u.x - u.size, u.y - u.size - 8, Math.max(0, (u.hp/u.maxHp)*u.size*2),5);
      // slow indicator
      if(u.slowUntil && u.slowUntil > Date.now()){
        ctx.fillStyle = 'rgba(0,150,255,0.6)'; ctx.fillRect(u.x - u.size, u.y + u.size + 2, u.size*2, 4);
      }
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
    // elixir regen handled in step
    step(dt);
    draw();
    if(running) requestAnimationFrame(loop);
  }

  restartBtn.onclick = ()=>{ running = true; resetGame(); last = performance.now(); requestAnimationFrame(loop); }

  // init
  renderHand(); resetGame(); requestAnimationFrame(loop);

})();
