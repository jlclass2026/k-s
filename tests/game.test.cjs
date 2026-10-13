'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const G=require('../game.js');
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('eight isolated profiles keep the previous starting EVO values',()=>{
 const s=G.defaults();assert.equal(s.profiles.length,8);assert.deepEqual(s.profiles.map(p=>p.evo),[167,150,149,127,119,99,85,72]);
 const other=JSON.stringify(s.profiles.slice(1));G.care(s.profiles[0],'snack');G.customise(s.profiles[0],{nickname:'Sprout',avatar:'cat',colour:'sky'});assert.equal(JSON.stringify(s.profiles.slice(1)),other);
});
test('all 14 avatars and all six home colours round-trip through saving',()=>{
 const storage=memory();
 for(const [avatar] of G.AVATARS)for(const[colour]of G.COLOURS){const s=G.defaults();G.customise(s.profiles[0],{nickname:'Little friend',avatar,colour});assert.equal(G.save(storage,s),true);const r=G.load(storage);assert.equal(r.status,'loaded');assert.equal(r.state.profiles[0].avatar,avatar);assert.equal(r.state.profiles[0].colour,colour);assert.equal(r.state.profiles[0].nickname,'Little friend');}
 assert.equal(G.AVATARS.length,14);
});
test('nickname and save validation restrict length, controls, keys and non-finite numbers',()=>{
 assert.equal(Array.from(G.safeName('🪴'.repeat(30))).length,24);assert.equal(G.safeName('  A\u202eB\u0000  '),'AB');
 let s=G.defaults();s.profiles[0].avatar='<img>';s.profiles[0].colour='url(evil)';s.profiles[0].evo=Infinity;s.profiles[0].inventory.snack=-1;s.profiles[0].trophies=['made-up','maths','maths'];
 let r=G.sanitize(s);assert.equal(r.profiles[0].avatar,'strawberry');assert.equal(r.profiles[0].colour,'rose');assert.equal(r.profiles[0].evo,167);assert.equal(r.profiles[0].inventory.snack,2);assert.deepEqual(r.profiles[0].trophies,[]);
 assert.throws(()=>G.sanitize({version:7,profiles:[]}));
});
test('storage failures are caught without ending play or falsely reporting saved',()=>{
 const fail={getItem(){throw Error('Blocked');},setItem(){throw Error('Quota');}};
 const r=G.load(fail);assert.equal(r.status,'unavailable');assert.equal(r.state.profiles.length,8);assert.equal(G.save(fail,r.state),false);
 assert.equal(G.load(null).status,'unavailable');assert.equal(G.save(null,G.defaults()),false);
 const lying={getItem(){return null;},setItem(){}};assert.equal(G.save(lying,G.defaults()),false);
 const corrupt=memory();corrupt.setItem(G.KEY,'{bad');assert.equal(G.load(corrupt).status,'invalid');
 const writeOnlyFailure={getItem(){return null;},setItem(){throw Error('Private');}};assert.equal(G.save(writeOnlyFailure,G.defaults()),false);
});
test('maths generator produces correct nonnegative answers and useful hints in every mode',()=>{
 for(const[mode]of G.MODES)for(let i=0;i<1000;i++){
  const q=G.question(mode);const expression=q.label.replaceAll('−','-').replaceAll('×','*');
  const actual=Function(`return (${expression})`)();assert.equal(q.answer,actual);assert.ok(q.answer>=0);assert.ok(q.hint.length>30);assert.equal(q.solved,false);
 }
});
test('wrong, blank, decimal and malformed answers have no penalties or rewards',()=>{
 const p=G.profile(0),q=G.question('multi',()=>.4),before=JSON.stringify(p);
 for(const x of ['', ' ', '12.3','4e2','-1','0x10','12abc',String(q.answer+1)]){assert.equal(G.answer(p,q,x).ok,false);assert.equal(JSON.stringify(p),before);assert.equal(q.solved,false);}
 assert.equal(G.answer(p,q,String(q.answer)).ok,true);assert.equal(p.evo,169);
});
test('one question rewards exactly once despite repeat Enter/clicks; retries work',()=>{
 const p=G.profile(0),q=G.question('gentle');assert.equal(G.answer(p,q,String(q.answer+1)).ok,false);
 const first=G.answer(p,q,String(q.answer));assert.equal(first.ok,true);assert.equal(p.stats.solved,1);assert.equal(p.inventory.snack,3);
 const after=JSON.stringify(p);for(let i=0;i<100;i++)assert.equal(G.answer(p,q,String(q.answer)).already,true);assert.equal(JSON.stringify(p),after);
});
test('questions for one profile cannot alter another profile through the shared defaults',()=>{
 const s=G.defaults(),other=JSON.stringify(s.profiles[1]),p=s.profiles[0];const q=G.question('tables');G.answer(p,q,q.answer);assert.equal(JSON.stringify(s.profiles[1]),other);
});
test('garden collection is once per spot and independent across profiles',()=>{
 const s=G.defaults(),p=s.profiles[0],other=JSON.stringify(s.profiles[1]),spots=G.garden();assert.equal(spots.length,6);
 for(const spot of spots){assert.equal(G.collect(p,spots,spot.id).ok,true);assert.equal(G.collect(p,spots,spot.id).ok,false);}assert.equal(p.stats.gathered,6);assert.deepEqual(p.inventory,{snack:6,water:6,star:3});assert.equal(G.collect(p,spots,99).ok,false);assert.equal(JSON.stringify(s.profiles[1]),other);
 assert.equal(p.trophies.filter(x=>x==='collector').length,1);const fresh=G.garden();assert.equal(fresh.some(s=>s.collected),false);
});
test('empty bag cannot go negative and never prevents other activities',()=>{
 const p=G.profile(0);p.inventory={snack:0,water:0,star:0};const before=JSON.stringify(p);
 for(const k of ['snack','water','star']){assert.equal(G.care(p,k).empty,true);assert.equal(JSON.stringify(p),before);}assert.equal(G.care(p,'__proto__').ok,false);
 const q=G.question('multi');assert.equal(G.answer(p,q,q.answer).ok,true);assert.equal(p.inventory.snack,1);assert.equal(G.care(p,'snack').ok,true);assert.equal(p.inventory.snack,0);
});
test('all trophies are automatic, unique, and survive reload without claim duplication',()=>{
 const p=G.profile(0);G.customise(p,{nickname:'Buddy',avatar:'dog',colour:'mint'});
 for(const s of G.garden())G.collect(p,[s],s.id);
 G.care(p,'snack');p.inventory.star=3;for(let i=0;i<3;i++)G.care(p,'star');
 for(let i=0;i<10;i++){const q=G.question(G.MODES[i%4][0]);G.answer(p,q,q.answer);}
 assert.equal(p.trophies.length,8);assert.equal(new Set(p.trophies).size,8);assert.deepEqual(G.award(p),[]);
 const state=G.defaults();state.profiles[0]=p;const storage=memory();G.save(storage,state);const loaded=G.load(storage).state.profiles[0];assert.equal(loaded.trophies.length,8);assert.deepEqual(G.award(loaded),[]);
});
test('reset is an explicit UI operation and affects only its selected profile',()=>{
 const s=G.defaults();G.customise(s.profiles[0],{nickname:'Old',avatar:'dog',colour:'mint'});const before=JSON.stringify(s.profiles.slice(1));
 s.profiles[0]=G.profile(0,false);assert.equal(s.profiles[0].evo,0);assert.equal(s.profiles[0].nickname,'');assert.deepEqual(s.profiles[0].trophies,[]);assert.deepEqual(s.profiles[0].inventory,{snack:2,water:2,star:1});assert.equal(JSON.stringify(s.profiles.slice(1)),before);
});
test('motion preference persists; elapsed time cannot cause decay',()=>{
 const s=G.defaults();s.settings.motion=false;const storage=memory();G.save(storage,s);const before=JSON.stringify(G.load(storage).state);const old=Date.now;Date.now=()=>old()+365*24*60*60*1000;
 try{assert.equal(JSON.stringify(G.load(storage).state),before);assert.equal(G.load(storage).state.settings.motion,false);}finally{Date.now=old;}
});
