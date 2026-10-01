/* User-defined hour concepts. Historical VAC/PAP/BL/BC/DB and their balances stay intact. */
(() => {
  'use strict';
  if (!Array.isArray(state.hourConcepts)) state.hourConcepts = [{ id:'hc-perllongament', code:'P', name:'Perllongament', sign:1, target:'choose', color:'#b4dfeb', initial:{} }];
  state.hourEntries ||= [];
  state.legacyHourMeta ||= {};
  state.legacyHourHidden ||= {};
  state.hiddenBalances ||= {};
  for(const code of ['VAC','PAP','BL','BC','DB'])if(state.legacyHourHidden[code])state.hiddenBalances['legacy:'+code]=true;
  const $id = id => document.getElementById(id);
  const legacy = { VAC:'vacation', PAP:'personal', BL:'bl', BC:'bc', DB:'blue', R:'remainder' };
  const balanceKey = target => Object.entries(legacy).find(([,category])=>category===target)?.[0];
  const balanceHidden = target => !!state.hiddenBalances[balanceKey(target)?'legacy:'+balanceKey(target):target];
  const defaults = { VAC:'Vacances', PAP:'Assumptes personals', BL:'Bossa lineal', BC:'Bossa coeficient', DB:'Dies blaus', R:'Romanent' };
  if(!Array.isArray(state.customBalances))state.customBalances=[];
  for(const item of state.hourConcepts){if(item.target==='own'){const id='bal-'+item.id;if(!state.customBalances.some(b=>b.id===id))state.customBalances.push({id,code:item.code,name:item.name,initial:{...item.initial},color:item.color});item.target=id}}
  function syncLegacyLabels() {
    for (const [code, category] of Object.entries(legacy)) {
      const meta = state.legacyHourMeta[code];
      leavePresets[code].label = meta ? meta.code + ' · ' + meta.name : defaults[code];
      categories[category] = leavePresets[code].label;
    }
  }
  syncLegacyLabels();
  function updateLegacyReportLabels(){
    const select=$id('reportForm')?.elements.namedItem('type');
    for(const [code,category] of Object.entries(legacy)){
      const option=[...select.options].find(item=>item.value===category),meta=state.legacyHourMeta[code];
      if(option)option.textContent=meta?meta.code+' · '+meta.name:defaults[code];
    }
  }
  let tab = 'shift', returnTab = 'shift', editing = null, editingBalance = null;
  const concept = id => state.hourConcepts.find(item => item.id === id);
  const isConcept = id => !!concept(id);
  const years = () => ({ from:selectedYear+'-02-01', to:(selectedYear+1)+'-01-31' });
  function refreshTargets(preserve){
    const select=$id('hourConceptForm').elements.target,requested=preserve||select.value;
    select.replaceChildren();
    const options=[...Object.entries(legacy).filter(([code])=>code!=='R'&&code!=='BC'&&!state.hiddenBalances['legacy:'+code]).map(([code,category])=>[category,(state.legacyHourMeta[code]?.code||code)+' · '+(state.legacyHourMeta[code]?.name||defaults[code])]),...state.customBalances.filter(b=>!state.hiddenBalances[b.id]).map(b=>[b.id,b.code+' · '+b.name]),...(!state.hiddenBalances['legacy:BL']?[['choose','BL al calendari']]:[])];
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Tria un saldo';placeholder.disabled=true;select.append(placeholder);
    for(const [value,label] of options){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}
    select.value=[...select.options].some(o=>o.value===requested)?requested:'';
    $id('hourConceptTargetLabel').textContent=tab==='negative'?'De quin saldo vols disminuir?':'Quin saldo vols augmentar?';
  }
  function refreshTabs() {
    document.querySelectorAll('[data-hour-tab]').forEach(button => button.setAttribute('aria-selected',String(button.dataset.hourTab===tab)));
    $id('types').querySelector('.hour-type-tabs').hidden=tab==='coefficients';
    $id('shiftTypePanel').hidden=tab!=='shift';
    $id('balancePanel').hidden=tab!=='balances';
    $id('hourConceptPanel').hidden=tab!=='positive'&&tab!=='negative';
    $id('coefficients').hidden=tab!=='coefficients';
    if($id('types').classList.contains('active')){
      $id('title').textContent=tab==='coefficients'?'BC · Coeficients':'Torns';
      $id('subtitle').textContent=tab==='coefficients'?'Gestiona el saldo, els factors i els moviments de BC':'Els teus noms, abreviatures i horaris';
    }
    if(tab==='coefficients'){window.GuardiaCoefficients?.refresh?.();return}
    if(tab==='balances'){renderBalanceList();return}
    if(tab==='positive'||tab==='negative'){
      $id('hourConceptHeading').textContent=tab==='positive'?'Hores positives':'Hores negatives';
      $id('addHourConcept').textContent=tab==='positive'?'＋ Afegir hores positives':'＋ Afegir hores negatives';
      refreshTargets();renderList();
    }
  }
  function resetForm() {
    editing = null;
    const form = $id('hourConceptForm');
    form.reset();
    form.elements.color.value = tab === 'positive' ? '#b4dfeb' : '#e8b6c5';
    $id('hourConceptFormTitle').textContent = 'Afegir concepte';
    $id('hourConceptCancel').hidden = true;
    $id('hourConceptTargetWrap').hidden = false;
    $id('hourConceptFeedback').hidden = true;
    $id('hourConceptEditor').hidden = true;
  }
  function tell(text, error=false) {
    const node=$id('hourConceptFeedback');node.hidden=false;node.classList.toggle('error',error);node.textContent=text;
  }
  function renderList(){
    const root=$id('hourConceptList');root.replaceChildren();
    const items=state.hourConcepts.filter(item=>!item.archived&&item.target!=='bc'&&!balanceHidden(item.target)&&!(item.target==='choose'&&state.hiddenBalances['legacy:BL'])&&item.sign===(tab==='positive'?1:-1));
    if(!items.length){const p=document.createElement('p');p.className='sub';p.textContent='Encara no has creat conceptes d’aquest tipus.';root.append(p)}
    for(const item of items){
      const row=document.createElement('div');row.className='hour-concept-row';
      const swatch=document.createElement('i');swatch.style.backgroundColor=item.color;
      const balance=state.customBalances.find(b=>b.id===item.target);
      const target=item.target==='choose'?'BL al calendari':balance?balance.code+' · '+balance.name:Object.entries(legacy).find(([,v])=>v===item.target)?.[0]||item.target;
      const info=document.createElement('span');info.textContent=item.code+' · '+item.name+' · '+(item.sign>0?'augmenta ':'disminueix ')+target;
      const actions=document.createElement('span');const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.onclick=()=>{
        editing=item.id;const form=$id('hourConceptForm');form.elements.code.value=item.code;form.elements.name.value=item.name;form.elements.color.value=item.color;
        refreshTargets(item.target);$id('hourConceptFormTitle').textContent='Editar · '+item.name;$id('hourConceptCancel').hidden=false;
        $id('hourConceptEditor').hidden=false;$id('hourConceptFeedback').hidden=true;
        form.scrollIntoView({behavior:'smooth',block:'center'});
      };
      const del=document.createElement('button');del.type='button';del.textContent='Eliminar';
      del.onclick=()=>{
        if(!confirm('Eliminar «'+item.name+'» dels conceptes actius? Els moviments ja registrats es conservaran i el concepte es podrà restaurar aquí.'))return;
        item.archived=true;
        if(!save()){item.archived=false;tell('No s’ha pogut eliminar el concepte.',true);return}
        if(editing===item.id)resetForm();
        renderList();refreshReportChoices();render();window.refreshCalendarBrush?.();tell('✓ Concepte retirat. El pots restaurar quan vulguis.');
      };
      actions.append(edit,del);row.append(swatch,info,actions);root.append(row);
    }
    const archived=state.hourConcepts.filter(item=>item.archived&&item.target!=='bc'&&item.sign===(tab==='positive'?1:-1));
    if(archived.length){
      const heading=document.createElement('h4');heading.textContent='Conceptes retirats';root.append(heading);
      for(const item of archived){
        const row=document.createElement('div');row.className='hour-concept-row balance-archived';
        const info=document.createElement('span');info.textContent=item.code+' · '+item.name;
        const actions=document.createElement('span'),restore=document.createElement('button');restore.type='button';restore.textContent='Restaurar';
        restore.onclick=()=>{if(balanceHidden(item.target)||item.target==='choose'&&(state.hiddenBalances['legacy:BL']||state.hiddenBalances['legacy:BC'])){tell('Restaura primer el saldo vinculat a «Saldos».',true);return}item.archived=false;if(!save()){item.archived=true;tell('No s’ha pogut restaurar el concepte.',true);return}renderList();refreshReportChoices();render();window.refreshCalendarBrush?.();tell('✓ Concepte restaurat.')};
        actions.append(restore);row.append(info,actions);root.append(row);
      }
    }
  }
  function resetBalanceForm(){editingBalance=null;const form=$id('balanceForm');form.reset();form.elements.initial.value='0:00';$id('balanceFormTitle').textContent='Crear saldo';$id('balanceCancel').hidden=true;$id('balanceFeedback').hidden=true;$id('balanceEditor').hidden=true}
  function balanceMessage(message,error=false){const node=$id('balanceFeedback');node.hidden=false;node.classList.toggle('error',error);node.textContent=message}
  function refreshBalanceYear(){
    $id('balanceYear').textContent=selectedYear+'–'+(selectedYear+1);
    $id('balanceSelectedYear').textContent=selectedYear+'–'+(selectedYear+1);
  }
  function renderBalanceList(){
    refreshBalanceYear();
    const root=$id('balanceList');root.replaceChildren();
    const items=[...Object.entries(legacy).filter(([code])=>code!=='R'&&code!=='BC').map(([code,category])=>({id:'legacy:'+code,code:state.legacyHourMeta[code]?.code||code,name:state.legacyHourMeta[code]?.name||defaults[code],initial:state.annual[selectedYear]?.[category]||0,color:state.calendarColors[code]||fixedDefaultColors[code]})),...state.customBalances.map(b=>({...b,initial:b.initial?.[selectedYear]||0}))];
    for(const item of items){
      const row=document.createElement('div');row.className='hour-concept-row';
      const info=document.createElement('span');info.textContent=item.code+' · '+item.name+' · inicial '+hoursText(item.initial);
      const actions=document.createElement('span');
      if(state.hiddenBalances[item.id]){
        row.classList.add('balance-archived');
        const restore=document.createElement('button');restore.type='button';restore.textContent='Restaurar';
        restore.onclick=()=>{delete state.hiddenBalances[item.id];if(item.id.startsWith('legacy:'))delete state.legacyHourHidden[item.id.slice(7)];if(!save()){state.hiddenBalances[item.id]=true;if(item.id.startsWith('legacy:'))state.legacyHourHidden[item.id.slice(7)]=true;balanceMessage('No s’ha pogut restaurar.',true);return}renderBalanceList();refreshTargets();renderList();renderSummary();window.refreshCalendarBrush?.();balanceMessage('✓ Saldo restaurat.')};
        actions.append(restore);
      }else{
        const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';
        edit.onclick=()=>{editingBalance=item.id;const form=$id('balanceForm');form.elements.code.value=item.code;form.elements.name.value=item.name;form.elements.initial.value=hoursValue(item.initial);form.elements.color.value=item.color||'#b9d8ef';$id('balanceFormTitle').textContent='Editar · '+item.name;$id('balanceCancel').hidden=false;$id('balanceEditor').hidden=false;$id('balanceFeedback').hidden=true;form.scrollIntoView({behavior:'smooth',block:'center'})};
        const del=document.createElement('button');del.type='button';del.textContent='Eliminar';
        del.onclick=()=>{if(!confirm('Eliminar «'+item.name+'» dels saldos actius? Els moviments ja registrats es conservaran i el saldo es podrà restaurar aquí.'))return;state.hiddenBalances[item.id]=true;if(item.id.startsWith('legacy:'))state.legacyHourHidden[item.id.slice(7)]=true;if(!save()){delete state.hiddenBalances[item.id];if(item.id.startsWith('legacy:'))delete state.legacyHourHidden[item.id.slice(7)];balanceMessage('No s’ha pogut eliminar.',true);return}resetBalanceForm();renderBalanceList();refreshTargets();renderList();renderSummary();render();window.refreshCalendarBrush?.();balanceMessage('✓ Saldo retirat. El pots restaurar quan vulguis.')};
        actions.append(edit,del);
      }
      row.append(info,actions);root.append(row);
    }
  }
  $id('balancePrevYear').onclick=()=>{resetBalanceForm();selectedYear--;renderLeave();renderBalanceList()};
  $id('balanceNextYear').onclick=()=>{resetBalanceForm();selectedYear++;renderLeave();renderBalanceList()};
  $id('addBalance').addEventListener('click',()=>{resetBalanceForm();$id('balanceEditor').hidden=false;$id('balanceEditor').scrollIntoView({behavior:'smooth',block:'center'});$id('balanceForm').elements.code.focus({preventScroll:true})});
  $id('balanceCancel').addEventListener('click',resetBalanceForm);
  $id('balanceForm').addEventListener('submit',event=>{
    event.preventDefault();const form=event.currentTarget,code=form.elements.code.value.trim().toUpperCase(),name=form.elements.name.value.trim(),initial=parseHours(form.elements.initial.value);
    if(!code||!name||!Number.isFinite(initial)||initial<0||initial>100000){balanceMessage('Revisa el nom, el codi i les hores inicials.',true);return}
    const occupied=[...Object.entries(legacy).filter(([key])=>editingBalance!=='legacy:'+key).map(([key])=>(state.legacyHourMeta[key]?.code||key).toUpperCase()),...state.customBalances.filter(b=>b.id!==editingBalance).map(b=>b.code.toUpperCase())];
    if(occupied.includes(code)){balanceMessage('Aquest codi de saldo ja està en ús.',true);return}
    const previousBalances=structuredClone(state.customBalances),oldAnnual=state.annual[selectedYear],oldMeta=editingBalance?.startsWith('legacy:')?state.legacyHourMeta[editingBalance.slice(7)]:null,oldColor=editingBalance?.startsWith('legacy:')?state.calendarColors[editingBalance.slice(7)]:null;
    if(editingBalance?.startsWith('legacy:')){const key=editingBalance.slice(7),category=legacy[key];state.legacyHourMeta[key]={code,name};state.calendarColors[key]=form.elements.color.value;state.annual[selectedYear]={...oldAnnual,[category]:initial};syncLegacyLabels()}
    else if(editingBalance){const item=state.customBalances.find(b=>b.id===editingBalance);Object.assign(item,{code,name,color:form.elements.color.value,initial:{...item.initial,[selectedYear]:initial}})}
    else state.customBalances.push({id:'bal-'+crypto.randomUUID(),code,name,color:form.elements.color.value,initial:{[selectedYear]:initial}});
    if(!save()){state.customBalances=previousBalances;if(editingBalance?.startsWith('legacy:')){const key=editingBalance.slice(7);if(oldMeta)state.legacyHourMeta[key]=oldMeta;else delete state.legacyHourMeta[key];state.annual[selectedYear]=oldAnnual;state.calendarColors[key]=oldColor;syncLegacyLabels()}balanceMessage('No s’ha pogut desar.',true);return}
    resetBalanceForm();renderBalanceList();refreshTargets();updateLegacyReportLabels();renderLeave();render();window.refreshCalendarBrush?.();balanceMessage('✓ Saldo desat. Ja el pots vincular a un concepte d’hores.');
  });
  document.querySelectorAll('[data-hour-tab]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.hourTab==='coefficients')returnTab=tab;tab=button.dataset.hourTab;$id('typeEditor').hidden=true;resetForm();resetBalanceForm();refreshTabs()}));
  function leaveCoefficients(){if(tab!=='coefficients')return;tab=returnTab;refreshTabs();$id('types').scrollIntoView({behavior:'smooth',block:'start'})}
  $id('coefficientBack').onclick=leaveCoefficients;
  window.GuardiaLeaveCoefficients=leaveCoefficients;
  $id('addHourConcept').addEventListener('click',()=>{resetForm();refreshTargets('');$id('hourConceptEditor').hidden=false;$id('hourConceptEditor').scrollIntoView({behavior:'smooth',block:'center'});$id('hourConceptForm').elements.code.focus({preventScroll:true})});
  $id('hourConceptCancel').addEventListener('click',resetForm);
  $id('hourConceptForm').addEventListener('submit',event=>{
    event.preventDefault();const form=event.currentTarget,code=form.elements.code.value.trim().toUpperCase(),name=form.elements.name.value.trim(),sign=tab==='positive'?1:-1,target=form.elements.target.value;
    if(!code||!name||!['choose',...Object.values(legacy).filter(v=>v!=='remainder'&&v!=='bc'),...state.customBalances.map(b=>b.id)].includes(target)){tell('Revisa el codi, el nom i el saldo. BC es gestiona a «Torn» → «BC · Coeficients».',true);return}
    if(state.hourConcepts.some(item=>item.id!==editing&&item.code.toUpperCase()===code)||Object.keys(legacy).some(key=>(state.legacyHourMeta[key]?.code||key).toUpperCase()===code)){
      tell('Aquest codi ja està en ús. Tria’n un altre.',true);return;
    }
    if(editing&&concept(editing)?.target!==target&&[...state.hourEntries,...state.accruals].some(row=>row.conceptId===editing)){
      tell('Aquest concepte ja té moviments. Conserva el saldo actual i crea un concepte nou per a l’altre saldo.',true);return;
    }
    const previous=state.hourConcepts.map(item=>({...item,initial:{...item.initial}}));
    const previousEntries=state.hourEntries;
    if(editing){const item=concept(editing);if(item)Object.assign(item,{code,name,color:form.elements.color.value,target});
      state.hourEntries=previousEntries.map(row=>row.conceptId===editing?{...row,code,name,color:form.elements.color.value}:row);
    }
    else state.hourConcepts.push({id:'hc-'+crypto.randomUUID(),code,name,color:form.elements.color.value,sign,target});
    if(!save()){state.hourConcepts=previous;state.hourEntries=previousEntries;tell('No s’ha pogut desar.',true);return}
    resetForm();renderList();render();refreshReportChoices();window.refreshCalendarBrush?.();tell('✓ Concepte desat. Les hores s’indiquen al calendari.');
  });
  function appendOptions(select){
    const group=document.createElement('optgroup');group.label='HORES PERSONALITZADES';
    for(const item of state.hourConcepts.filter(item=>!item.archived&&item.target!=='bc'&&!balanceHidden(item.target)&&!(item.target==='choose'&&state.hiddenBalances['legacy:BL']))){const option=document.createElement('option');option.value=item.id;option.textContent=item.code+' · '+item.name+' · hores';group.append(option)}
    if(group.children.length)select.append(group);
  }
  const destinations={vacation:'VAC',personal:'PAP',bl:'BL',bc:'BC',blue:'DB'};
  const entryCategory=(item,target)=>item.target==='choose'?target:item.target;
  function apply(date,id,rawHours,target){
    const item=concept(id),hours=parseHours(rawHours);
    if(!item||item.archived||!Number.isFinite(hours)||hours<=0||hours>24)return {ok:false,text:'Tria un concepte actiu i posa les hores per dia entre 0:01 i 24:00.'};
    if(item.target==='bc'||item.target==='choose'&&target!=='bl')return {ok:false,text:'BC es gestiona només a «Torn» → «BC · Coeficients». Tria BL o obre aquella pestanya.'};
    const previous=state.hourEntries,previousAccruals=state.accruals;
    if(item.target==='choose'&&item.sign>0)state.accruals=[...state.accruals,{id:crypto.randomUUID(),date,category:target,hours,kind:'extension',conceptId:id,note:''}];
    else state.hourEntries=[...state.hourEntries,{id:crypto.randomUUID(),date,conceptId:id,code:item.code,name:item.name,sign:item.sign,hours,color:item.color,category:entryCategory(item,target)}];
    if(!save({silent:true})){state.hourEntries=previous;state.accruals=previousAccruals;return {ok:false,text:'No s’ha pogut desar. Torna-ho a provar.'}};
    return {ok:true,text:'✓ '+item.name+' · '+hoursText(hours)+' desades el '+displayDate(date)+(item.target==='choose'?' a '+target.toUpperCase():'')+'.'};
  }
  function paint(date,id,rawHours,target){return apply(date,id,rawHours,target)}
  function decorateDay(button,date){
    const entries=state.hourEntries.filter(row=>row.date===date);
    if(!entries.length)return;
    const marker=document.createElement('span');marker.className='calendar-supplement hour-concept-marker';
    marker.textContent=entries.map(row=>(row.sign>0?'+':'−')+row.code).join(' · ');
    marker.title=entries.map(row=>row.name+' · '+hoursText(row.hours)).join(' · ');
    button.append(marker);
    if(!button.classList.contains('colored-day')&&!state.assignments[date]&&!state.leave[date]){
      const last=entries.at(-1),item=concept(last.conceptId);
      applyCalendarColor(button,item?.color||last.color||(last.sign>0?'#c7e8d6':'#f4d5dc'),'#dbe5f1');
    }
  }
  function prepareDayEdit(select){appendOptions(select)}
  function configureEdit(){
    const item=concept($id('dayEditType').value),wrap=$id('hourDestinationWrap');
    wrap.hidden=!item||item.target!=='choose';
    if(item){$id('dayEditHoursWrap').hidden=false;$id('dayEditHours').disabled=false;$id('dayEditHours').required=true;
      if(!$id('dayEditHours').value)$id('dayEditHours').value='1:00';
      $id('saveDay').textContent='Afegir '+item.name;
      $id('dayEditPreview').textContent='La quantitat s’imputarà a cada dia de l’interval. '+(item.target==='choose'?'S’imputarà a BL per '+(item.sign>0?'sumar':'descomptar')+' hores.':'Es modificarà el saldo '+(state.customBalances.find(b=>b.id===item.target)?.name||destinations[item.target]||item.target)+'.')+' Les hores del torn es conservaran.';
    }
  }
  function preview(days,id){
    const item=concept(id);if(!item||item.archived)return false;
    $id('dayEditReplaceWrap').hidden=true;
    $id('dayEditPreview').textContent=days?'S’imputaran les hores a '+days.length+' '+(days.length===1?'dia':'dies')+'. El torn del dia es conservarà.':'Tria un interval vàlid (màxim 366 dies).';
    return true;
  }
  function submit(id,days,raw,feedback){
    const item=concept(id);if(!item||item.archived)return false;
    const hours=$id('dayEditHours').value,target=item.target==='choose'?$id('hourDestination').value:null,note=$id('dayEditNote').value.trim();
    const oldEntries=state.hourEntries,oldAccruals=state.accruals;
    const parsed=parseHours(hours);
    if(item.target==='bc'||item.target==='choose'&&target!=='bl'){feedback.classList.add('error');feedback.textContent='BC es gestiona només a «Torn» → «BC · Coeficients».';return true}
    if(!Number.isFinite(parsed)||parsed<=0||parsed>24){feedback.classList.add('error');feedback.textContent='Posa entre 0:01 i 24:00 hores per dia.';return true}
    const newRows=days.map(date=>({id:crypto.randomUUID(),date,conceptId:id,code:item.code,name:item.name,sign:item.sign,hours:parsed,color:item.color,note,category:entryCategory(item,target)}));
    if(item.target==='choose'&&item.sign>0)state.accruals=[...oldAccruals,...days.map(date=>({id:crypto.randomUUID(),date,category:target,hours:parsed,kind:'extension',conceptId:id,note}))];
    else state.hourEntries=[...oldEntries,...newRows];
    if(!save()){state.hourEntries=oldEntries;state.accruals=oldAccruals;feedback.classList.add('error');feedback.textContent='No s’ha pogut desar.';return true}
    const [year,month]=raw.split('-').map(Number);current=new Date(year,month-1,1);selectedYear=policeYear(new Date(year,month-1,15));render();extensionOpen(raw);
    feedback.textContent='✓ '+hoursText(parsed*days.length)+' de '+item.name+' desades.';$id('saveDay').textContent='✓ Desat';$id('saveDay').classList.add('saved');
    return true;
  }
  function renderBalances(start,end,root){
    for(const balance of state.customBalances){
      if(state.hiddenBalances[balance.id])continue;
      const initial=Number(balance.initial?.[selectedYear])||0;
      const movements=state.hourEntries.filter(row=>row.date>=start&&row.date<=end&&(row.category===balance.id||row.category==null&&state.hourConcepts.some(item=>item.id===row.conceptId&&item.target===balance.id)));
      const added=movements.filter(row=>row.sign>0).reduce((sum,row)=>sum+(Number(row.hours)||0),0);
      const spent=movements.filter(row=>row.sign<0).reduce((sum,row)=>sum+(Number(row.hours)||0),0);
      const remaining=initial+added-spent,row=document.createElement('article');row.className='summary-balance-card'+(remaining<0?' negative':'');
      const heading=document.createElement('div');heading.className='summary-balance-heading';const code=document.createElement('b');code.textContent=balance.code;const name=document.createElement('span');name.textContent=balance.name;heading.append(code,name);row.append(heading);
      const metrics=document.createElement('div');metrics.className='summary-balance-metrics';
      for(const [title,hours,tone] of [['Inicial',initial,'base'],['+ Afegides',added,'added'],['− Descomptades',spent,'spent'],['Saldo',remaining,'balance']]){const cell=document.createElement('div');cell.className='summary-balance-metric '+tone;const caption=document.createElement('small');caption.textContent=title;const amount=document.createElement('strong');amount.textContent=hoursText(hours);cell.append(caption,amount);metrics.append(cell)}
      row.append(metrics);root.append(row);
    }
  }
  function renderReport(type,from,to){
    if(!type.startsWith('hc:'))return false;
    const id=type.slice(3),item=concept(id),rows=(item?.target==='choose'&&item.sign>0?state.accruals:state.hourEntries).filter(row=>row.conceptId===id&&row.date>=from&&row.date<=to).sort((a,b)=>a.date.localeCompare(b.date));
    const root=$id('reportRows');root.replaceChildren();
    let total=0;
    for(const record of rows){total+=Number(record.hours)||0;const row=document.createElement('div');row.className='row';const target=state.customBalances.find(b=>b.id===record.category)?.name||record.category?.toUpperCase();for(const value of [displayDate(record.date),(item?.name||record.name)+(target?' → '+target:''),(record.sign<0?'−':'+')+hoursText(record.hours)]){const cell=document.createElement('span');cell.textContent=value;row.append(cell)}root.append(row)}
    if(!rows.length){const p=document.createElement('p');p.className='sub';p.textContent='Cap moviment en aquest període.';root.append(p)}
    $id('reportTotal').textContent='Total: '+hoursText(total);
    return true;
  }
  function refreshReportChoices(){const select=$id('reportForm').elements.namedItem('type');select.querySelectorAll('option[value^="hc:"]').forEach(option=>option.remove());
    for(const item of state.hourConcepts){
      if(item.target==='bc')continue;
      // The general extension report includes the default concept and older records.
      if(item.id==='hc-perllongament'&&item.code==='P'&&item.name==='Perllongament'&&item.sign>0&&item.target==='choose')continue;
      const option=document.createElement('option');option.value='hc:'+item.id;option.textContent=item.code+' · '+item.name+(item.archived?' (antic)':'');select.append(option)
    }
  }
  window.GuardiaHourConcepts={isConcept,concept,appendOptions,prepareDayEdit,configureEdit,preview,submit,paint,decorateDay,renderBalances,renderReport,refreshReportChoices,refreshViews(){syncLegacyLabels();refreshTabs();refreshTargets();refreshReportChoices();updateLegacyReportLabels()}};
  // The inline calendar calls the hooks directly; it also renders once below after migration.
  refreshTabs();refreshReportChoices();updateLegacyReportLabels();
  render();
})();
