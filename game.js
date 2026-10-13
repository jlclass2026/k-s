/* Fier Learners: browser-only game rules, also used by the Node test suite. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FierGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'fier-learners-care-v1';
  const AVATARS = [
    ['strawberry', 'Strawberry'], ['grape', 'Grape'], ['watermelon', 'Watermelon'],
    ['bubbletea', 'Bubble tea'], ['guineapig', 'Guinea pig'], ['bunny', 'Bunny'],
    ['egg', 'Egg'], ['apple', 'Apple'], ['hermitcrab', 'Hermit crab'],
    ['cat', 'Cat'], ['fish', 'Fish'], ['dog', 'Dog'], ['coral', 'Coral'], ['lemon', 'Lemon']
  ];
  const COLOURS = [['rose', 'Rose', '#f3afbc'], ['lilac', 'Lilac', '#c9b7ee'], ['sky', 'Sky', '#add5e5'], ['mint', 'Mint', '#b2d8bf'], ['peach', 'Peach', '#f3c19c'], ['sunshine', 'Sunshine', '#edda8d']];
  const MODES = [['gentle', 'Little steps', 'Add and subtract up to 20'], ['multi', 'Number garden', 'Two-digit addition and subtraction'], ['tables', 'Times-table trail', 'Multiplication from 3 to 12'], ['twostep', 'Two-step adventure', 'Addition, then subtraction']];
  const TROPHIES = [
    {id:'designer', name:'Made by me', description:'Choose your avatar and save its style.', icon:'flower', test:p=>p.customised},
    {id:'collector', name:'Little explorer', description:'Collect supplies from 6 garden spots.', icon:'leaf', test:p=>p.stats.gathered>=6},
    {id:'carer', name:'Kind heart', description:'Give your avatar a snack or a drink.', icon:'heart', test:p=>p.stats.cared>=1},
    {id:'playmate', name:'Play pals', description:'Play together 3 times.', icon:'star', test:p=>p.stats.played>=3},
    {id:'maths', name:'Bright idea', description:'Solve your first maths question.', icon:'sun', test:p=>p.stats.solved>=1},
    {id:'thinker', name:'Growing thinker', description:'Solve 10 maths questions at your own pace.', icon:'trophy', test:p=>p.stats.solved>=10},
    {id:'trailblazer', name:'Try something new', description:'Solve a question in all 4 maths activities.', icon:'spark', test:p=>MODES.every(m=>p.modes.includes(m[0]))},
    {id:'allrounder', name:'A lovely day', description:'Collect, care, play and solve a question.', icon:'rainbow', test:p=>p.stats.gathered>0&&p.stats.cared>0&&p.stats.played>0&&p.stats.solved>0}
  ];
  const seedEvo = [167,150,149,127,119,99,85,72];
  function profile(i, initial=true) {
    return {id:i+1, nickname:'', avatar:AVATARS[i][0], colour:COLOURS[i%6][0], evo:initial?seedEvo[i]:0,
      inventory:{snack:2, water:2, star:1}, stats:{solved:0,gathered:0,cared:0,played:0}, modes:[], trophies:[], customised:false};
  }
  const defaults = () => ({version:1, profiles:Array.from({length:8},(_,i)=>profile(i)), settings:{motion:true}});
  const int = (v, fallback=0) => Number.isSafeInteger(v) && v>=0 ? Math.min(v,9999999):fallback;
  const safeName = v => typeof v==='string' ? Array.from(v.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim()).slice(0,24).join('') : '';
  function sanitize(raw) {
    if (!raw || raw.version!==1 || !Array.isArray(raw.profiles) || raw.profiles.length!==8) throw new Error('Unsupported save');
    const state=defaults();
    state.settings.motion=raw.settings?.motion!==false;
    state.profiles=state.profiles.map((p,i)=>{
      const r=raw.profiles[i];
      if(!r||typeof r!=='object') return p;
      p.nickname=safeName(r.nickname);
      if(AVATARS.some(a=>a[0]===r.avatar)) p.avatar=r.avatar;
      if(COLOURS.some(c=>c[0]===r.colour)) p.colour=r.colour;
      p.evo=int(r.evo,p.evo);
      for(const k of Object.keys(p.inventory)) p.inventory[k]=int(r.inventory?.[k],p.inventory[k]);
      for(const k of Object.keys(p.stats)) p.stats[k]=int(r.stats?.[k]);
      p.customised=r.customised===true;
      p.modes=MODES.filter(m=>Array.isArray(r.modes)&&r.modes.includes(m[0])).map(m=>m[0]);
      // Derive awards from achievements rather than trusting an arbitrary saved list.
      p.trophies=TROPHIES.filter(t=>t.test(p)).map(t=>t.id);
      return p;
    });
    return state;
  }
  function load(storage) {
    let text;
    try { text=storage.getItem(KEY); } catch(e) { return {state:defaults(),status:'unavailable'}; }
    if(!text) return {state:defaults(),status:'new'};
    try { return {state:sanitize(JSON.parse(text)),status:'loaded'}; }
    catch(e) { return {state:defaults(),status:'invalid'}; }
  }
  function save(storage,state) {
    try {const text=JSON.stringify(state); storage.setItem(KEY,text); return storage.getItem(KEY)===text; } catch(e) { return false; }
  }
  function award(p) {
    const earned=[];
    for(const t of TROPHIES) if(t.test(p)&&!p.trophies.includes(t.id)) {p.trophies.push(t.id); earned.push(t.name);}
    return earned;
  }
  function customise(p, draft) {
    p.nickname=safeName(draft.nickname);
    if(AVATARS.some(a=>a[0]===draft.avatar)) p.avatar=draft.avatar;
    if(COLOURS.some(c=>c[0]===draft.colour)) p.colour=draft.colour;
    p.customised=true;
    return award(p);
  }
  function care(p, kind) {
    if(!['snack','water','star'].includes(kind)) return {ok:false};
    if(p.inventory[kind]<1) return {ok:false,empty:true};
    p.inventory[kind]--;
    if(kind==='star') p.stats.played=int(p.stats.played+1); else p.stats.cared=int(p.stats.cared+1);
    return {ok:true,trophies:award(p)};
  }
  function question(mode, random=Math.random) {
    const r=(lo,hi)=>Math.floor(random()*(hi-lo+1))+lo;
    let a,b,c,answer,label,hint;
    if(mode==='gentle') {
      a=r(1,12); b=r(1,8);
      if(r(0,1)) {if(a<b)[a,b]=[b,a];answer=a-b;label=`${a} − ${b}`;hint=`Start at ${a}. Count back ${b} steps. Try drawing ${a} dots and crossing out ${b}.`;}
      else {answer=a+b;label=`${a} + ${b}`;hint=`Start at ${a} and count on ${b}. You can use counters or draw two groups of dots.`;}
    } else if(mode==='tables') {
      a=r(3,12);b=r(3,12);answer=a*b;label=`${a} × ${b}`;hint=`Think of ${a} groups of ${b}. Add ${b} again for each group, or use a times table you know.`;
    } else if(mode==='twostep') {
      a=r(10,39);b=r(10,29);c=r(5,19);answer=a+b-c;label=`${a} + ${b} − ${c}`;hint=`First work out ${a} + ${b}. Then take away ${c} from that total.`;
    } else {
      mode='multi';a=r(25,74);b=r(20,64);
      if(r(0,1)) {if(a<b)[a,b]=[b,a];answer=a-b;label=`${a} − ${b}`;hint=`Try taking away ${Math.floor(b/10)*10} first, then ${b%10} more. You can use a number line.`;}
      else {answer=a+b;label=`${a} + ${b}`;hint=`Split ${b} into ${Math.floor(b/10)*10} and ${b%10}. Add the tens to ${a}, then add the ones.`;}
    }
    return {mode,answer,label,hint,solved:false};
  }
  function answer(p,q,value) {
    if(!q||q.solved) return {ok:false,already:true};
    const v=String(value).trim();
    if(!/^\d+$/.test(v)||!Number.isSafeInteger(Number(v))) return {ok:false,invalid:true};
    if(Number(v)!==q.answer) return {ok:false,hint:q.hint};
    q.solved=true;
    p.evo=int(p.evo+2);p.stats.solved=int(p.stats.solved+1);
    if(!p.modes.includes(q.mode)) p.modes.push(q.mode);
    const supply=['snack','water','star'][(p.stats.solved-1)%3];
    p.inventory[supply]=int(p.inventory[supply]+1);
    return {ok:true,supply,trophies:award(p)};
  }
  function garden(random=Math.random) {
    const supplies=['snack','water','star','snack','water','star'];
    for(let i=supplies.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[supplies[i],supplies[j]]=[supplies[j],supplies[i]];}
    return supplies.map((supply,i)=>({id:i,supply,amount:supply==='star'?1:2,collected:false}));
  }
  function collect(p,spots,id) {
    const s=spots.find(x=>x.id===id);
    if(!s||s.collected) return {ok:false};
    s.collected=true;p.inventory[s.supply]=int(p.inventory[s.supply]+s.amount);p.stats.gathered=int(p.stats.gathered+1);
    return {ok:true,supply:s.supply,amount:s.amount,trophies:award(p)};
  }
  return {KEY,AVATARS,COLOURS,MODES,TROPHIES,defaults,profile,sanitize,safeName,load,save,award,customise,care,question,answer,garden,collect};
});
