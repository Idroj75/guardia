/* Generació d'un quadrant dins de l'interval escollit. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const templates = window.GuardiaQuadrantTemplates;
  if (!templates || !$('quadGenStart')) return;
  const names = {Q5:'Q5',Q3:'Q3'};
  const specs = {
    M:{name:'Matins',start:'06:00',end:'14:30',color:'morning'},
    T:{name:'Tardes',start:'14:00',end:'22:30',color:'afternoon'},
    N:{name:'Nits',start:'22:00',end:'06:30',color:'night'},
    D:{name:'Dia',start:'06:00',end:'18:00',color:'morning'},
    TN:{name:'Tarda/nit',start:'18:00',end:'06:00',color:'night'},
    R:{name:'Torn R (Trànsit)',start:'06:00',end:'14:30',color:'morning'}
  };
  const aliases = {D:['M12','D'],TN:['N12','TN']};
  const canonicalCode = {D:'M12',TN:'N12'};
  const dayMs=86400000, epoch=Date.UTC(2025,1,1);
  const dateFromMs=ms=>new Date(ms).toISOString().slice(0,10);
  const dateMs=date=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return NaN;const ms=Date.parse(date+'T00:00:00Z');return Number.isFinite(ms)&&dateFromMs(ms)===date?ms:NaN};
  const equivalent=(code,type)=>[code,...(aliases[code]||[])].includes(String(type?.code||'').toUpperCase());
  const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const autoType=type=>String(type?.id||'').startsWith('quadrant-');
  function existingType(code,except,onlyOriginal=false){
    const list=state.types.filter(t=>t.id!==except&&!autoType(t));
    const preferred=canonicalCode[code]||code;
    return list.find(t=>String(t.code||'').toUpperCase()===preferred)||
      list.find(t=>equivalent(code,t))||
      list.find(t=>normalized(t.name)===normalized(({D:'Matins 12 h',TN:'Nits 12 h'}[code]||specs[code].name))&&
        t.start===specs[code].start&&t.end===specs[code].end)||
      (code!=='R'&&list.find(t=>t.start===specs[code].start&&t.end===specs[code].end&&
        !(code==='M'&&String(t.code||'').toUpperCase()==='R')))||
      (!onlyOriginal&&state.types.find(t=>t.id!==except&&equivalent(code,t)));
  }
  function reconcileDuplicateTypes(){
    const replacements=new Map();
    state.types.forEach((type,index)=>{
      let original=null;
      if(autoType(type)&&specs[String(type.code||'').toUpperCase()])original=existingType(String(type.code).toUpperCase(),type.id,true);
      if(!original){
        const code=String(type.code||'').toUpperCase();
        original=state.types.slice(0,index).find(t=>normalized(t.name)===normalized(type.name)&&t.start===type.start&&t.end===type.end&&
          (String(t.code||'').toUpperCase()===code||code===String(t.code||'').toUpperCase()+'2'));
      }
      if(original&&original.id!==type.id)replacements.set(type.id,original.id);
    });
    if(!replacements.size)return;
    const before={types:state.types,assignments:state.assignments,extraAssignments:state.extraAssignments,shiftHoursOverrides:state.shiftHoursOverrides};
    state.types=state.types.filter(t=>!replacements.has(t.id));
    state.assignments=Object.fromEntries(Object.entries(state.assignments).map(([date,id])=>[date,replacements.get(id)||id]));
    state.extraAssignments=Object.fromEntries(Object.entries(state.extraAssignments).map(([date,ids])=>[date,ids.map(id=>replacements.get(id)||id)]));
    state.shiftHoursOverrides=Object.fromEntries(Object.entries(state.shiftHoursOverrides).map(([date,slots])=>[date,Object.fromEntries(Object.entries(slots).map(([slot,item])=>[slot,item?.id&&replacements.has(item.id)?{...item,id:replacements.get(item.id)}:item]))]));
    if(!save({silent:true})){Object.assign(state,before);return}
    renderTypes();render();
  }

  function updateSquads(){
    const select=$('quadGenSquad'),previous=select.value;select.replaceChildren();
    for(const value of Object.keys(templates[$('quadGenType').value]||{})){
      const option=document.createElement('option');option.value=value;
      option.textContent=value==='_'?'Sense escamot':'Escamot '+value;select.append(option);
    }
    if([...select.options].some(o=>o.value===previous))select.value=previous;
    select.disabled=select.options.length===1;
  }
  function entry(date,kind,squad){
    const pattern=templates[kind]?.[squad];if(!pattern)return null;
    if(!names[kind])return null;
    const offset=Math.round((dateMs(date)-epoch)/dayMs);
    const cycle=kind==='Q3'?21:35;
    const item=pattern[((offset%cycle)+cycle)%cycle];
    if(kind==='Q3'&&(item[0]==='M'||item[0]==='T')){
      const type=existingType(item[0]);return [item[0],type?Math.round(duration(type)*60):item[1]];
    }
    return item;
  }
  function automaticSpecial(row){
    const year=policeYear(new Date(row.date+'T12:00:00'));
    if(!row.automaticPreset&&!state.specialSeeded?.[year])return false;
    const preset=specialPresetRows(year).find(item=>item[0]===row.date);
    if(!preset)return false;
    const [,name,start,end,rate]=preset;
    const known=new Set(['id','date','name','start','end','rate','color','paid','extraHours','overrideHours','automaticPreset']);
    return row.name===name&&row.start===start&&row.end===end&&Number(row.rate)===rate&&
      row.color==='#e68a20'&&row.paid===false&&Number(row.extraHours)===0&&row.overrideHours==null&&
      Object.keys(row).every(key=>known.has(key));
  }
  function prepare(){
    const start=$('quadGenStart').value,end=$('quadGenEnd').value,first=dateMs(start),last=dateMs(end),kind=$('quadGenType').value,squad=$('quadGenSquad').value;
    if(!Number.isFinite(first)||!Number.isFinite(last)||first>last)return {error:'Tria una data inicial i una final vàlides.'};
    if(start<'2025-02-01'||end>'2036-01-31')return {error:'Es poden generar quadrants entre febrer de 2025 i gener de 2036.'};
    if(!names[kind])return {error:'Tria Q3 o Q5. Els altres quadrants es planifiquen manualment al Calendari.'};
    const rows=[],today=key(new Date());let protectedDays=0;
    for(let ms=first;ms<=last;ms+=dayMs){
      const date=dateFromMs(ms),item=entry(date,kind,squad);
      if(!item)return {error:'Falta el model del dia '+displayDate(date)+'.'};
      const [code,minutes]=item;
      const oldIds=[state.assignments[date],...(state.extraAssignments[date]||[])].filter(Boolean);
      const leave=!!state.leave[date];
      const recorded=date<today&&(oldIds.length>0||state.cycleRest[date]||state.services?.[date]||
        (Array.isArray(state.dayComments)?state.dayComments.some(r=>r.date===date):!!state.dayComments?.[date])||
        [state.accruals,state.hourEntries,state.overtime,state.citations,state.detentions].some(list=>Array.isArray(list)&&list.some(r=>r.date===date))||
        (state.specialDays||[]).some(r=>r.date===date&&!automaticSpecial(r)));
      if(leave||recorded){protectedDays++;continue}
      const existing=oldIds.length===1?state.types.find(t=>t.id===oldIds[0]):null;
      const same=code==='F'?!oldIds.length&&!!state.cycleRest[date]:
        oldIds.length===1&&!state.cycleRest[date]&&equivalent(code,existing)&&Math.round(duration(shiftTypesForDate(date)[0])*60)===minutes;
      if(!same)rows.push({date,code,minutes});
    }
    return {start,end,kind,squad,rows,protectedDays};
  }
  $('quadGenType').addEventListener('change',updateSquads);
  $('quadGenStart').value=key(new Date());
  $('quadGenEnd').value=(policeYear(new Date())+1)+'-01-31';
  reconcileDuplicateTypes();
  updateSquads();
  $('quadGenApply').onclick=()=>{
    const plan=prepare(),feedback=$('quadGenFeedback');feedback.textContent='';
    if(plan.error){feedback.textContent=plan.error;return}
    if(!plan.rows.length){feedback.textContent='Aquest interval ja té el torn seleccionat o només conté dies protegits.';return}
    const squadLabel=plan.squad==='_'?'':', escamot '+plan.squad;
    if(!confirm('Generar '+names[plan.kind]+squadLabel+' del '+displayDate(plan.start)+' al '+displayDate(plan.end)+'?\n\nEs canviaran '+plan.rows.length+' dies. Els permisos i '+plan.protectedDays+' dies amb dades protegides es conservaran.'))return;
    const before={types:state.types,assignments:state.assignments,extraAssignments:state.extraAssignments,shiftHoursOverrides:state.shiftHoursOverrides,cycleRest:state.cycleRest,quadrantPlanHistory:state.quadrantPlanHistory};
    state.types=[...state.types];state.assignments={...state.assignments};state.extraAssignments={...state.extraAssignments};state.shiftHoursOverrides={...state.shiftHoursOverrides};state.cycleRest={...state.cycleRest};
    const ids={};
    for(const code of new Set(plan.rows.filter(r=>r.code!=='F').map(r=>r.code))){
      let type=existingType(code);
      if(!type){const spec=specs[code];type={id:'quadrant-'+code.toLowerCase()+'-'+crypto.randomUUID(),code:canonicalCode[code]||code,name:spec.name,start:spec.start,end:spec.end,color:spec.color,hex:calendarDefaultColors[spec.color]};state.types.push(type)}
      ids[code]=type.id;
    }
    for(const row of plan.rows){
      delete state.assignments[row.date];delete state.extraAssignments[row.date];delete state.shiftHoursOverrides[row.date];delete state.cycleRest[row.date];
      if(row.code==='F')state.cycleRest[row.date]=true;
      else{state.assignments[row.date]=ids[row.code];state.shiftHoursOverrides[row.date]={0:{id:ids[row.code],hours:row.minutes/60}}}
    }
    state.quadrantPlanHistory=[...(state.quadrantPlanHistory||[]),{start:plan.start,end:plan.end,kind:plan.kind,squad:plan.squad,days:plan.rows.length,at:new Date().toISOString()}].slice(-30);
    if(!save()){Object.assign(state,before);feedback.textContent='No s’ha pogut desar el quadrant. Torna-ho a provar.';return}
    const [year,month]=plan.start.split('-').map(Number);
    current=new Date(year,month-1,1);selectedYear=policeYear(current);render();
    feedback.textContent='✓ '+plan.rows.length+' dies generats. El Calendari i Totals ja estan actualitzats.';
    document.querySelector('nav button[data-screen="calendar"]')?.click();
  };
})();
