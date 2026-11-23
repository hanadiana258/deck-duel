// Deck Duel — a small original card battler. Play attack, guard or heal cards
// against The Arcanist, an AI opponent that keeps a hand and plays by simple
// rules. Keyboard (N ends the turn) and mouse both drive the game.

const $ = (id) => document.getElementById(id);

const CARDS = [
  { name: 'Firebolt', icon: '🔥', cost: 1, atk: 4, text: '4 damage' },
  { name: 'Heavy Blade', icon: '⚔️', cost: 3, atk: 8, text: '8 damage' },
  { name: 'Frost Shield', icon: '❄️', cost: 1, guard: 4, text: 'block 4' },
  { name: 'Iron Wall', icon: '🛡️', cost: 2, guard: 7, text: 'block 7' },
  { name: 'Cure Salve', icon: '🌿', cost: 1, heal: 4, text: 'heal 4' },
  { name: 'Life Spring', icon: '💧', cost: 3, heal: 8, text: 'heal 8' },
  { name: 'Twin Darts', icon: '🎯', cost: 2, atk: 5, text: '5 damage' },
  { name: 'Doomhammer', icon: '🔨', cost: 5, atk: 13, text: '13 damage' },
  { name: 'Elixir', icon: '⚗️', cost: 2, heal: 5, guard: 2, text: 'heal 5, block 2' },
  { name: 'Ember Lance', icon: '🔥', cost: 4, atk: 10, text: '10 damage' },
];

const MAX_HP = 20, MAX_MANA = 8, HAND = 5;

let player, foe, turn, guardP, guardE, roundNo, plays;

function freshSide(hp) { return { hp, mana: 3, deck: shuffled(), hand: [] }; }

function shuffled() {
  const d = [];
  while (d.length < 18) d.push(CARDS[Math.floor(Math.random() * CARDS.length)]);
  return d;
}

function draw(side, n) { while (side.hand.length < HAND && side.deck.length) side.hand.push(side.deck.pop()); }

function startGame() {
  player = freshSide(MAX_HP); foe = freshSide(MAX_HP);
  draw(player, HAND); draw(foe, HAND);
  turn = 'p'; guardP = 0; guardE = 0; roundNo = 1; plays = 0;
  show('table'); log('Round 1 — the Arcanist eyes her hand.'); render();
  if (new URLSearchParams(location.search).get('screen') === 'win') finish(true);
  if (new URLSearchParams(location.search).get('screen') === 'lose') finish(false);
}

function show(id) {
  for (const s of ['title', 'table', 'end']) $(s).classList.toggle('hidden', s !== id);
}

// Icon badge: a coloured disc with a letter — readable in any font.
function badge(c) {
  const kind = c.atk ? 'a' : c.guard ? 'd' : 'h';
  const colour = kind === 'a' ? 'var(--red)' : kind === 'd' ? 'var(--blue)' : 'var(--green)';
  const letter = kind === 'a' ? 'ATK' : kind === 'd' ? 'DEF' : 'HEAL';
  return `<span style="display:inline-block;width:62px;height:56px;border-radius:10px;background:${colour};color:#fff;font-size:15px;font-weight:bold;line-height:56px;text-align:center">${letter}</span>`;
}

function log(t) { $('log').textContent = t; }

function render() {
  $('phpn').textContent = player.hp; $('ehpn').textContent = foe.hp;
  $('php').style.width = (player.hp / MAX_HP * 100) + '%';
  $('ehp').style.width = (foe.hp / MAX_HP * 100) + '%';
  $('manaN').textContent = `${player.mana}/${Math.min(MAX_MANA, 2 + roundNo)}`;
  $('turnlbl').textContent = turn === 'p' ? `Your turn — round ${roundNo}` : 'The Arcanist thinks…';
  const hand = $('hand'); hand.innerHTML = '';
  player.hand.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'card' + (turn !== 'p' || c.cost > player.mana ? ' unplayable' : '');
    el.innerHTML = `<div class="cost">${c.cost}</div><h3>${c.name}</h3><div class="icon">${badge(c)}</div>` +
      `<div class="stats"><span>${c.atk ? '⚔' + c.atk : ''}</span><span>${c.guard ? '🛡' + c.guard : ''}${c.heal ? '＋' + c.heal : ''}</span></div>`;
    el.onclick = () => playCard(i);
    hand.appendChild(el);
  });
}

function playCard(i) {
  if (turn !== 'p') return;
  const c = player.hand[i];
  if (!c || c.cost > player.mana) return;
  player.mana -= c.cost;
  player.hand.splice(i, 1);
  resolve(c, 'p');
  plays++;
  render();
  if (player.hand.length === 0 || player.mana === 0) endTurn();
  else render();
}

function resolve(c, who) {
  const atk = c.atk || 0, heal = c.heal || 0;
  if (who === 'p') {
    if (heal) player.hp = Math.min(MAX_HP, player.hp + heal);
    if (atk) {
      const blocked = Math.min(guardE, atk);
      guardE -= blocked;
      foe.hp -= atk - blocked;
      $('pplayed').innerHTML = badge(c);
      log(`${c.name} hits the Arcanist for ${atk - blocked}${blocked ? ` (${blocked} blocked)` : ''}.`);
    } else {
      $('pplayed').innerHTML = badge(c);
      log(`${c.name}: ${c.text}.`);
    }
    if (c.guard) guardP += c.guard;
  } else {
    if (heal) foe.hp = Math.min(MAX_HP, foe.hp + heal);
    if (atk) {
      const blocked = Math.min(guardP, atk);
      guardP -= blocked;
      player.hp -= atk - blocked;
      $('eplayed').innerHTML = badge(c);
      log(`The Arcanist plays ${c.name} — ${atk - blocked} damage to you.`);
    } else {
      $('eplayed').innerHTML = badge(c);
      log(`The Arcanist plays ${c.name}: ${c.text}.`);
    }
    if (c.guard) guardE += c.guard;
  }
  if (player.hp <= 0 || foe.hp <= 0) finish(foe.hp <= 0 && player.hp > 0 ? player.hp > 0 : foe.hp <= 0);
}

function foeTurn() {
  turn = 'e'; render();
  let guard = 0;
  const step = () => {
    const playable = foe.hand.filter((c) => c.cost <= foe.mana);
    if (playable.length === 0 || foe.hp <= 0 || player.hp <= 0) return endFoe();
    // Simple AI: heal when low, otherwise the biggest affordable attack.
    const low = foe.hp <= 8;
    const pick = playable.sort((a, b) => (low && a.heal ? -1 : 1) || (b.atk || 0) - (a.atk || 0) || b.cost - a.cost)[0];
    foe.mana -= pick.cost;
    foe.hand.splice(foe.hand.indexOf(pick), 1);
    resolve(pick, 'e');
    render();
    setTimeout(step, 900);
  };
  setTimeout(step, 900);
}

function endFoe() {
  turn = 'p'; roundNo++;
  guardP = 0; guardE = 0;
  player.mana = Math.min(MAX_MANA, 2 + roundNo);
  foe.mana = Math.min(MAX_MANA, 2 + roundNo);
  draw(player, HAND); draw(foe, HAND);
  $('pplayed').innerHTML = badge({atk:0}); $('eplayed').innerHTML = badge({atk:0});
  log(`Round ${roundNo} — fresh mana, fresh cards.`);
  render();
}

function endTurn() {
  if (turn !== 'p') return;
  foeTurn();
}

function finish(win) {
  show('end');
  $('endmsg').textContent = win ? 'Victory — you win the duel!' : 'Defeat — the Arcanist wins.';
  $('endmsg').style.color = win ? 'var(--gold)' : 'var(--red)';
  $('endstats').textContent = `Rounds survived: ${roundNo} — cards played: ${plays}`;
}

$('startBtn').onclick = startGame;
$('againBtn').onclick = startGame;
$('endBtn').onclick = endTurn;
addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'n') endTurn(); });
// startGame(); — the title screen deals first
show('title');
