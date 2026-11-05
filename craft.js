'use strict';
var updateCoinGrid;
(()=>{
 const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
 const fineQuery=matchMedia('(pointer:fine)');
 const soft='cubic-bezier(.22,1,.36,1)',spring='cubic-bezier(.16,1,.3,1)';
 const grid=$('#coinGrid'),dialog=$('#modal'),content=$('#modalContent'),tabs=$('.tabs');
 const animated=new WeakSet(),signatures=new WeakMap();let dialogVersion=0,closeAnimation=null;
 function canMove(){return !motionQuery.matches}
 function visible(el){const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}
 function animate(el,frames,options){if(!canMove())return null;return el.animate(frames,{duration:600,easing:soft,...options})}
 const arrow='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 function enhance(root){
  root.querySelectorAll('.button.primary:not([data-crafted]),.button.outline:not([data-crafted])').forEach(button=>{
   button.dataset.crafted='1';const trailing=button.querySelector(':scope > span:last-child');
   if(trailing&&trailing.textContent.trim()==='↗'){trailing.classList.add('button-orbit');trailing.setAttribute('aria-hidden','true');trailing.innerHTML=arrow}
  });
 }
 // Cards retain their identity while voting and filtering. Only changed contents are updated.
 updateCoinGrid=function(list){
  const existing=new Map([...grid.children].filter(n=>n.dataset.coinId).map(n=>[n.dataset.coinId,n]));
  const before=new Map([...existing].map(([id,node])=>[id,node.getBoundingClientRect()]));
  existing.forEach(node=>node.getAnimations?.().forEach(animation=>animation.cancel()));
  const oldHeight=grid.getBoundingClientRect().height;const fresh=[];
  const focus=document.activeElement,focusCard=focus?.closest?.('[data-coin-id]');
  const focusKey=focusCard?.dataset.coinId,focusAttr=focus?.dataset.vote?'data-vote':focus?.dataset.follow?'data-follow':focus?.dataset.detail?'data-detail':null;
  list.forEach((c,index)=>{
   let node=existing.get(c.id);
   const sig=JSON.stringify([c.name,c.ticker,c.description,c.image,c.votes,c.target,phase(c),state.votes.includes(c.id),state.following.includes(c.id)]);
   if(!node||signatures.get(node)!==sig){
    const template=document.createElement('template');template.innerHTML=card(c,index);const next=template.content.firstElementChild;
    if(node){node.replaceChildren(...next.childNodes)}else{node=next;fresh.push(node)}
    signatures.set(node,sig);
   }
   node.dataset.coinId=c.id;node.style.animation='none';
   if(grid.children[index]!==node)grid.insertBefore(node,grid.children[index]||null);
   existing.delete(c.id);
  });
  existing.forEach(node=>node.remove());
  if(canMove()){
   for(const node of grid.children){const old=before.get(node.dataset.coinId),now=node.getBoundingClientRect();if(old){const dx=old.left-now.left,dy=old.top-now.top;if(Math.abs(dx)+Math.abs(dy)>1&&visible(node))animate(node,[{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:520})}}
   fresh.forEach((node,i)=>{if(visible(node)){animated.add(node);animate(node,[{opacity:0,transform:'translateY(18px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:620,delay:Math.min(i,5)*45})}});
   const height=grid.getBoundingClientRect().height;
   if(oldHeight&&height&&Math.abs(height-oldHeight)>2&&visible(grid)){const animation=grid.animate([{height:oldHeight+'px'},{height:height+'px'}],{duration:420,easing:soft});animation.finished.catch(()=>{})}
  }
  if(focusKey&&focusAttr)grid.querySelector(`[data-coin-id="${focusKey}"] [${focusAttr}]`)?.focus({preventScroll:true});
  enhance(grid);observeCards();queueMicrotask(()=>document.dispatchEvent(new Event('qorum:render')));
 };
 // A single optical pill moves between filter tabs, including wrapped rows on mobile.
 const glider=document.createElement('span');glider.className='tab-glider';glider.setAttribute('aria-hidden','true');tabs.prepend(glider);
 function syncTabs(){const selected=tabs.querySelector('button.selected');if(!selected)return;glider.style.width=selected.offsetWidth+'px';glider.style.height=selected.offsetHeight+'px';glider.style.transform=`translate(${selected.offsetLeft}px,${selected.offsetTop}px)`}
 const priorRender=render;render=function(){priorRender();syncTabs()};
 tabs.addEventListener('click',()=>requestAnimationFrame(syncTabs));
 document.addEventListener('qorum:render',syncTabs);
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncTabs).observe(tabs);
 syncTabs();
 // Density changes use the same positional transition as filtering.
 const density=$('#densityToggle');
 density.addEventListener('click',()=>{if(!canMove())return;const rects=new Map([...grid.children].map(node=>[node,node.getBoundingClientRect()]));requestAnimationFrame(()=>{for(const [node,old] of rects){if(!node.isConnected||!visible(node))continue;const now=node.getBoundingClientRect();node.getAnimations?.().forEach(animation=>animation.cancel());animate(node,[{transformOrigin:'top left',transform:`translate(${old.left-now.left}px,${old.top-now.top}px) scale(${old.width/now.width},${old.height/now.height})`},{transformOrigin:'top left',transform:'translate(0,0) scale(1)'}],{duration:550})}})},true);
 document.addEventListener('click',e=>{const control=e.target.closest('[data-spotlight]');if(!control||!canMove())return;const direction=Number(control.dataset.spotlight);const copy=$('#spotlight .spotlight-copy'),artwork=$('#spotlight .spotlight-art');if(copy)animate(copy,[{opacity:0,transform:`translateX(${direction*13}px)`},{opacity:1,transform:'translateX(0)'}],{duration:480});if(artwork)animate(artwork,[{opacity:.3,transform:'scale(1.025)'},{opacity:1,transform:'scale(1)'}],{duration:650})});
 // Native dialog focus trapping is retained. Rapid reopen cancels an in-progress close.
 const priorOpen=open,priorClose=close;
 open=function(html){
  const wasOpen=dialog.open;dialogVersion++;
  closeAnimation?.cancel();closeAnimation=null;dialog.classList.remove('is-closing');
  priorOpen(html);enhance(content);
  const title=content.querySelector('h2');if(title){title.id='dialogTitle';dialog.setAttribute('aria-labelledby','dialogTitle')}
  if(wasOpen){animate(content,[{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:300})}
  else{animate(dialog,[{opacity:0,transform:'translateY(24px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:480,easing:spring})}
 };
 close=function(){
  if(!dialog.open)return;if(!canMove()){priorClose();return}
  if(closeAnimation)return;const version=dialogVersion;dialog.classList.add('is-closing');
  closeAnimation=animate(dialog,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(12px) scale(.985)'}],{duration:170,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
  closeAnimation.finished.then(()=>{if(version===dialogVersion){priorClose();dialog.classList.remove('is-closing');closeAnimation?.cancel();closeAnimation=null}}).catch(()=>{});
 };
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 const priorWizard=moveWizard;moveWizard=function(direction){const form=$('#createForm'),step=form?.dataset.step;priorWizard(direction);if(form&&step!==form.dataset.step){const panel=form.querySelector(`[data-step-panel="${form.dataset.step}"]`);animate(panel,[{opacity:0,transform:`translateX(${direction>0?13:-13}px)`},{opacity:1,transform:'translateX(0)'}],{duration:390});dialog.scrollTo({top:0,behavior:'instant'})}};
 // Section entrances share a restrained easing curve. Nothing is hidden if animation support is absent.
 let cardObserver=null;
 function observeCards(){if(!cardObserver)return;grid.querySelectorAll('.coin-card').forEach(node=>{if(!animated.has(node)){animated.add(node);cardObserver.observe(node)}})}
 if(typeof IntersectionObserver!=='undefined'&&canMove()){
  const reveal=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;const node=entry.target;node.classList.remove('motion-ready');animate(node,[{opacity:0,transform:'translateY(25px)'},{opacity:1,transform:'translateY(0)'}],{duration:850});reveal.unobserve(node)})},{threshold:.08,rootMargin:'0px 0px -30px 0px'});
  document.querySelectorAll('.spotlight-section,.section-heading,.radar-layout,.belief-inner,.process-track article,.token-section,.faq-heading,.faq-list,.final-cta').forEach(node=>{if(!visible(node)){node.classList.add('motion-ready');reveal.observe(node)}});
  cardObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;animate(entry.target,[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:750});cardObserver.unobserve(entry.target)})},{threshold:.08});observeCards();
 }
 // Small magnetic travel and specular highlights, only for fine pointers.
 let pointerFrame=0,pointerEvent=null,lastButton=null;
 document.addEventListener('pointermove',e=>{if(!canMove()||!fineQuery.matches)return;pointerEvent={target:e.target,x:e.clientX,y:e.clientY};if(pointerFrame)return;pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;const p=pointerEvent,button=p.target.closest('.button.primary'),surface=p.target.closest('.coin-card,.spotlight,.process-track article,.button');if(lastButton&&lastButton!==button){lastButton.style.translate='0px 0px';lastButton=null}if(button){const r=button.getBoundingClientRect();button.style.translate=`${((p.x-r.left)/r.width-.5)*5}px ${((p.y-r.top)/r.height-.5)*4}px`;lastButton=button}if(surface){const r=surface.getBoundingClientRect();surface.style.setProperty('--mx',(p.x-r.left)+'px');surface.style.setProperty('--my',(p.y-r.top)+'px');surface.style.setProperty('--bx',((p.x-r.left)/r.width*100)+'%');surface.style.setProperty('--by',((p.y-r.top)/r.height*100)+'%')}})},{passive:true});
 document.addEventListener('pointerout',e=>{if(lastButton&&!lastButton.contains(e.relatedTarget)){lastButton.style.translate='0px 0px';lastButton=null}},{passive:true});
 document.addEventListener('pointerdown',e=>{if(!canMove()||e.button!==0)return;const button=e.target.closest('.button,.vote-btn,.bookmark,.spotlight-switch button');if(!button||button.disabled)return;const r=button.getBoundingClientRect(),wave=document.createElement('span'),size=Math.max(r.width,r.height)*2;wave.className='interaction-wave';wave.setAttribute('aria-hidden','true');wave.style.cssText=`width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px;`;button.append(wave);const a=wave.animate([{transform:'scale(0)',opacity:.32},{transform:'scale(1)',opacity:0}],{duration:660,easing:soft});a.finished.then(()=>wave.remove()).catch(()=>wave.remove())});
 // Lightweight image parallax; no scrolling hijack or permanent animation loop.
 const scene=$('#heroArt'),image=scene.querySelector('.scene-render');let heroVisible=true,parallaxFrame=0;
 if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting}).observe(scene);
 scene.addEventListener('pointermove',e=>{if(!canMove()||!fineQuery.matches||!heroVisible)return;const r=scene.getBoundingClientRect();image.style.setProperty('--scene-x',((e.clientX-r.left)/r.width-.5)*-10+'px');image.style.setProperty('--scene-y',((e.clientY-r.top)/r.height-.5)*-7+'px')});
 scene.addEventListener('pointerleave',()=>{image.style.setProperty('--scene-x','0px');image.style.setProperty('--scene-y','0px')});
 addEventListener('scroll',()=>{if(!canMove()||!heroVisible||parallaxFrame)return;parallaxFrame=requestAnimationFrame(()=>{parallaxFrame=0;image.style.setProperty('--scene-scroll',Math.min(30,scrollY*.045)+'px')})},{passive:true});
 // Intro waits only for decoding the hero, with a short upper bound on slow connections.
 async function intro(){if(!canMove())return;const ready=image.complete?Promise.resolve():image.decode?.().catch(()=>{});await Promise.race([ready||Promise.resolve(),new Promise(resolve=>setTimeout(resolve,650))]);
  animate(document.querySelector('header'),[{opacity:.2,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}],{duration:750});
  document.querySelectorAll('.hero .title-line>span').forEach((line,i)=>animate(line,[{transform:'translateY(110%)',opacity:.2},{transform:'translateY(0)',opacity:1}],{duration:1050,delay:100+i*130}));
  const parts=document.querySelectorAll('.hero .eyebrow,.hero-copy>p,.hero-actions,.hero-footnote');parts.forEach((node,i)=>animate(node,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:800,delay:100+i*100}));
  animate(image,[{opacity:.2,scale:'1.045'},{opacity:1,scale:'1'}],{duration:1400});
 }
 const dynamic=new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes){if(node.nodeType===1){enhance(node);if(node.matches?.('.button'))enhance(node.parentElement)}}}observeCards()});
 dynamic.observe(content,{childList:true,subtree:true});dynamic.observe(grid,{childList:true,subtree:true});dynamic.observe($('#spotlight'),{childList:true,subtree:true});
 enhance(document);intro();
 motionQuery.addEventListener?.('change',()=>{if(motionQuery.matches){document.querySelectorAll('.motion-ready').forEach(n=>n.classList.remove('motion-ready'));lastButton?.style.setProperty('translate','0px 0px');image.style.setProperty('--scene-scroll','0px')}});
})();
