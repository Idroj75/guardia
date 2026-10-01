/* A visible palette for iPhone color inputs, with the native picker still available. */
(() => {
  'use strict';
  const colors = ['#000000','#102a51','#25446d','#3d68a0','#72a6db','#bdd5f9','#dceaf8','#bbecda','#65b98d','#84c33d','#ffe0a8','#f9c575','#eaa5bd','#d54451','#ef6680','#545b67','#e5e9f0'];
  const dialog=document.createElement('dialog');dialog.className='guardia-color-dialog';dialog.setAttribute('aria-label','Tria un color');
  dialog.innerHTML='<div class="guardia-color-head"><h3>Tria un color</h3><button type="button" class="guardia-color-close" aria-label="Tancar">×</button></div><div class="guardia-color-options" role="group" aria-label="Colors disponibles"></div><label class="guardia-color-custom">Un altre color <input type="color" value="#25446d" aria-label="Color personalitzat"></label>';
  document.body.append(dialog);
  const grid=dialog.querySelector('.guardia-color-options'),custom=dialog.querySelector('.guardia-color-custom input');
  let active=null;
  function valid(value){return /^#[0-9a-f]{6}$/i.test(value||'')?value:'#25446d'}
  function sync(input){const button=input.nextElementSibling;if(!button?.classList.contains('guardia-color-open'))return;const value=valid(input.value);button.style.backgroundColor=value;button.style.color=['#000000','#102a51','#25446d','#3d68a0','#d54451','#545b67'].includes(value.toLowerCase())?'#fff':'#142a38';button.title='Color actual '+value+' · triar un altre';button.setAttribute('aria-label','Color actual '+value+'. Tria un color')}
  function pick(value){if(!active)return;active.value=valid(value);sync(active);active.dispatchEvent(new Event('change',{bubbles:true}));dialog.close()}
  for(const value of colors){const button=document.createElement('button');button.type='button';button.className='guardia-color-choice';button.style.backgroundColor=value;button.title=value;button.setAttribute('aria-label','Triar el color '+value);button.onclick=()=>pick(value);grid.append(button)}
  dialog.querySelector('.guardia-color-close').onclick=()=>dialog.close();
  custom.onchange=()=>pick(custom.value);
  dialog.addEventListener('close',()=>{active=null});
  function enhance(input){if(input.closest('.guardia-color-dialog')||input.dataset.guardiaColorEnhanced)return;input.dataset.guardiaColorEnhanced='true';input.tabIndex=-1;const button=document.createElement('button');button.type='button';button.className='guardia-color-open';button.textContent='▣';input.insertAdjacentElement('afterend',button);sync(input);
    button.onclick=()=>{active=input;sync(input);custom.value=valid(input.value);dialog.showModal()};
    input.addEventListener('input',()=>sync(input));input.addEventListener('change',()=>sync(input));
  }
  function scan(node){if(node.nodeType!==1)return;if(node.matches?.('input[type="color"]'))enhance(node);node.querySelectorAll?.('input[type="color"]').forEach(enhance)}
  scan(document.body);
  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)scan(node)}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',()=>queueMicrotask(()=>document.querySelectorAll('input[type="color"]').forEach(sync)));
  document.addEventListener('change',()=>queueMicrotask(()=>document.querySelectorAll('input[type="color"]').forEach(sync)));
  window.GuardiaColors={syncAll(){document.querySelectorAll('input[type="color"]').forEach(sync)}};
})();
