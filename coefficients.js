/* All BC management lives here; older simple-hour entries retain their stored value. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const defaults = { earn: {day:1.25, night:1.5, weekend:1.75}, spend:{day:1, night:1, weekend:.75}, nightStart:22, nightEnd:6 };
  state.coefficientSettings ||= structuredClone(defaults);
  state.coefficientMovements ||= [];
  const form = $('coefficientForm'), rates = $('coefficientRates'), feedback = $('coefficientFeedback');
  let editing = null, editingOriginal = null;
  const year = date => typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? (Number(date.slice(5,7)) === 1 ? Number(date.slice(0,4))-1 : Number(date.slice(0,4))) : NaN;
  const rate = (kind,band) => Number(state.coefficientSettings[kind]?.[band]);
  const minutes = raw => { const n=parseHours(raw); return Number.isFinite(n)?Math.round(n*60):NaN; };
  const midnight = date => new Date(date+'T00:00:00');
  const holiday = (d,forced) => forced && d.toDateString()===midnight(form.elements.date.value).toDateString() || !!officialHolidays[key(d)];
  function calculate() {
    const f=form.elements,date=f.date.value,begin=f.start.value,end=f.end.value,kind=f.kind.value,mode=f.mode.value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!begin||!end)return null;
    const start=new Date(date+'T'+begin+':00');let finish=new Date(date+'T'+end+':00');
    if(finish<=start)finish.setDate(finish.getDate()+1);
    const duration=(finish-start)/60000;
    if(!Number.isFinite(duration)||duration<=0||duration>1440)return null;
    const pieces={day:0,night:0,weekend:0};
    if(mode==='manual')pieces[f.band.value]=duration;
    else for(let t=start.getTime();t<finish.getTime();t+=60000){
      const d=new Date(t),weekday=d.getDay(),hour=d.getHours()+d.getMinutes()/60;
      const weekend=weekday===6&&hour>=6||weekday===0||weekday===1&&hour<6;
      const night=hour>=Number(state.coefficientSettings.nightStart)||hour<Number(state.coefficientSettings.nightEnd);
      pieces[weekend||holiday(d,f.special.checked)?'weekend':night?'night':'day']++;
    }
    if(editingOriginal&&[date,begin,end,kind,mode,mode==='manual'?f.band.value:null,!!f.special.checked].every((value,index)=>value===[editingOriginal.date,editingOriginal.start,editingOriginal.end,editingOriginal.kind,editingOriginal.mode,editingOriginal.band,!!editingOriginal.forcedHoliday][index]))return {...editingOriginal,note:f.note.value.trim()};
    const detail=Object.entries(pieces).filter(([,count])=>count).map(([band,count])=>({band,minutes:count,factor:rate(kind,band)}));
    if(detail.some(row=>!Number.isFinite(row.factor)||row.factor<=0))return null;
    // Annex 3's 0.75 describes enjoyment: to enjoy 45 min, one hour is debited.
    const computed=Math.round(detail.reduce((sum,row)=>sum+row.minutes*(kind==='earn'?row.factor:1/row.factor),0));
    return {date,start:begin,end,kind,mode,forcedHoliday:f.special.checked,band:mode==='manual'?f.band.value:null,detail,actualMinutes:duration,computedMinutes:computed,note:f.note.value.trim()};
  }
  function preview(){
    form.elements.band.closest('label').hidden=form.elements.mode.value!=='manual';
    const row=calculate(),el=$('coefficientPreview');
    if(!row){el.textContent='Indica la data i l’horari (màxim 24 h).';return}
    const names={day:'Diürn',night:'Nocturn',weekend:'Cap de setmana/festiu'};
    el.textContent=row.detail.map(x=>names[x.band]+' '+hoursText(x.minutes/60)+' '+(row.kind==='earn'?'×':'÷')+' '+String(x.factor).replace('.',',')).join(' + ')+ ' = '+(row.kind==='earn'?'+':'−')+hoursText(row.computedMinutes/60)+' a BC. Hores reals: '+hoursText(row.actualMinutes/60)+'.';
  }
  function rateFields(){
    for(const input of rates.querySelectorAll('[data-coefficient-rate]')){
      const [kind,band]=input.dataset.coefficientRate.split('.');input.value=String(rate(kind,band)).replace('.',',');
    }
    $('coefficientNightStart').value=state.coefficientSettings.nightStart;
    $('coefficientNightEnd').value=state.coefficientSettings.nightEnd;
  }
  function note(message,error=false){feedback.hidden=false;feedback.classList.toggle('error',error);feedback.textContent=message}
  function accepted(){window.GuardiaLeaveCoefficients?.()}
  function reset(){editing=null;editingOriginal=null;form.reset();form.elements.date.value=key(new Date());$('coefficientSave').textContent='Desar moviment';$('coefficientCancel').hidden=true;preview()}
  function olderRows(selected){
    const rows=[];
    for(const [date,entry] of Object.entries(state.leave||{}))if(entry?.category==='bc'&&year(date)===selected)rows.push({source:'leave',date,entry,kind:'spend',hours:Number(entry.hours)||0});
    for(const entry of state.accruals||[])if(entry?.category==='bc'&&year(entry.date)===selected)rows.push({source:'accrual',date:entry.date,entry,kind:'earn',hours:Number(entry.hours)||0});
    for(const entry of state.hourEntries||[])if(entry?.category==='bc'&&year(entry.date)===selected)rows.push({source:'concept',date:entry.date,entry,kind:entry.sign>0?'earn':'spend',hours:Number(entry.hours)||0});
    return rows.sort((a,b)=>a.date.localeCompare(b.date));
  }
  function editOlder(row){
    const editor=$('coefficientLegacyEditor'),f=$('coefficientLegacyForm');
    editor.hidden=false;f.elements.date.value=row.date;f.elements.hours.value=hoursValue(row.hours);
    $('coefficientLegacyTitle').textContent='Editar moviment anterior · '+displayDate(row.date);
    f.onsubmit=e=>{
      e.preventDefault();const date=f.elements.date.value,hours=parseHours(f.elements.hours.value);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(hours)||hours<=0||hours>24){note('Revisa la data i les hores (de 0:01 a 24:00).',true);return}
      if(row.source==='leave'&&date!==row.date&&state.leave[date]){note('El dia de destí ja té un permís. Tria un altre dia.',true);return}
      const oldLeave={...state.leave},oldAccruals=state.accruals,oldEntries=state.hourEntries;
      if(row.source==='leave'){state.leave={...state.leave};delete state.leave[row.date];state.leave[date]={...row.entry,hours}}
      else if(row.source==='accrual')state.accruals=oldAccruals.map(item=>item===row.entry?{...item,date,hours}:item);
      else state.hourEntries=oldEntries.map(item=>item===row.entry?{...item,date,hours}:item);
      if(!save()){state.leave=oldLeave;state.accruals=oldAccruals;state.hourEntries=oldEntries;note('No s’ha pogut desar.',true);return}
      editor.hidden=true;$('coefficientYear').value=String(year(date));render();list();note('✓ Moviment anterior de BC actualitzat.');accepted();
    };
    editor.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function removeOlder(row){
    if(!confirm('Eliminar el moviment anterior de BC del '+displayDate(row.date)+'?'))return;
    const oldLeave=state.leave,oldAccruals=state.accruals,oldEntries=state.hourEntries;
    if(row.source==='leave'){state.leave={...oldLeave};delete state.leave[row.date]}
    else if(row.source==='accrual')state.accruals=oldAccruals.filter(item=>item!==row.entry);
    else state.hourEntries=oldEntries.filter(item=>item!==row.entry);
    if(!save()){state.leave=oldLeave;state.accruals=oldAccruals;state.hourEntries=oldEntries;note('No s’ha pogut eliminar.',true);return}
    $('coefficientLegacyEditor').hidden=true;render();list();note('✓ Moviment anterior de BC eliminat.');accepted();
  }
  function list(){
    const selected=Number($('coefficientYear').value)||year(key(new Date())),rows=state.coefficientMovements.filter(r=>year(r.date)===selected).sort((a,b)=>a.date.localeCompare(b.date));
    $('coefficientPeriod').textContent=selected+'–'+(selected+1);
    const initial=Number(state.annual[selected]?.bc)||0;
    $('coefficientInitial').value=hoursValue(initial);
    $('coefficientColor').value=validCalendarColor(state.calendarColors.BC,fixedDefaultColors.BC);
    const root=$('coefficientList');root.replaceChildren();let sum=0;
    for(const row of rows){sum+=(row.kind==='earn'?1:-1)*row.computedMinutes;
      const article=document.createElement('article');article.className='coefficient-entry';
      const info=document.createElement('div');const title=document.createElement('strong');title.textContent=displayDate(row.date)+' · '+row.start+'–'+row.end+' · '+(row.kind==='earn'?'Acumulat':'Gastat');
      const details=document.createElement('small');details.textContent='Hores reals '+hoursText(row.actualMinutes/60)+' → '+(row.kind==='earn'?'+':'−')+hoursText(row.computedMinutes/60)+' BC'+(row.note?' · '+row.note:'');info.append(title,details);
      const actions=document.createElement('div');const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.onclick=()=>{
        editing=row.id;editingOriginal=row;for(const field of ['date','start','end','kind','mode','note'])form.elements[field].value=row[field]||'';
        form.elements.special.checked=!!row.forcedHoliday;form.elements.band.value=row.band||'day';$('coefficientSave').textContent='Desar canvis';$('coefficientCancel').hidden=false;preview();form.scrollIntoView({behavior:'smooth',block:'start'});
      };
      const del=document.createElement('button');del.type='button';del.textContent='Eliminar';del.onclick=()=>{
        if(!confirm('Eliminar el moviment de BC del '+displayDate(row.date)+'?'))return;
        const previous=state.coefficientMovements;state.coefficientMovements=previous.filter(item=>item.id!==row.id);
        if(!save()){state.coefficientMovements=previous;note('No s’ha pogut eliminar.',true);return}
        if(editing===row.id)reset();render();list();note('✓ Moviment eliminat.');accepted();
      };actions.append(edit,del);article.append(info,actions);root.append(article);
    }
    const older=olderRows(selected);
    for(const row of older){sum+=(row.kind==='earn'?1:-1)*Math.round(row.hours*60);
      const article=document.createElement('article');article.className='coefficient-entry';
      const info=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('small');
      title.textContent=displayDate(row.date)+' · '+(row.kind==='earn'?'Acumulat':'Gastat')+' · moviment anterior';
      detail.textContent=(row.kind==='earn'?'+':'−')+hoursText(row.hours)+' BC · sense coeficient'+(row.entry.note?' · '+row.entry.note:'');info.append(title,detail);
      const actions=document.createElement('div'),edit=document.createElement('button'),del=document.createElement('button');
      edit.type=del.type='button';edit.textContent='Editar';del.textContent='Eliminar';edit.onclick=()=>editOlder(row);del.onclick=()=>removeOlder(row);
      actions.append(edit,del);article.append(info,actions);root.append(article);
    }
    if(!rows.length&&!older.length){const p=document.createElement('p');p.className='sub';p.textContent='Encara no hi ha moviments de BC en aquest any policial.';root.append(p)}
    $('coefficientNet').textContent='Moviments de BC: '+(sum<0?'−':'+')+hoursText(Math.abs(sum)/60)+' · saldo '+hoursText(initial+sum/60);
  }
  $('coefficientInitialForm').onsubmit=event=>{event.preventDefault();const selected=Number($('coefficientYear').value),value=parseHours($('coefficientInitial').value),color=$('coefficientColor').value;
    if(!Number.isInteger(selected)||selected<2020||selected>2100||!Number.isFinite(value)||value<0||value>100000){note('Revisa l’any policial i el saldo inicial.',true);return}
    const old=state.annual[selected],oldColor=state.calendarColors.BC;state.annual[selected]={...old,bc:value};state.calendarColors.BC=color;
    if(!save()){if(old===undefined)delete state.annual[selected];else state.annual[selected]=old;state.calendarColors.BC=oldColor;note('No s’ha pogut desar el saldo inicial.',true);return}
    render();list();note('✓ Saldo inicial i color de BC desats.');accepted();
  };
  $('coefficientLegacyCancel').onclick=()=>{$('coefficientLegacyEditor').hidden=true};
  rates.addEventListener('submit',event=>{event.preventDefault();const next=structuredClone(state.coefficientSettings);
    for(const input of rates.querySelectorAll('[data-coefficient-rate]')){const [kind,band]=input.dataset.coefficientRate.split('.'),v=Number(input.value.trim().replace(',','.'));if(!Number.isFinite(v)||v<=0||v>5){note('Cada factor ha de ser més gran que zero i com a màxim 5.',true);return}next[kind][band]=v}
    next.nightStart=Number($('coefficientNightStart').value);next.nightEnd=Number($('coefficientNightEnd').value);
    if(!Number.isInteger(next.nightStart)||!Number.isInteger(next.nightEnd)||next.nightStart<18||next.nightStart>23||next.nightEnd<5||next.nightEnd>9){note('Revisa les hores de la franja nocturna.',true);return}
    const old=state.coefficientSettings;state.coefficientSettings=next;if(!save()){state.coefficientSettings=old;note('No s’han pogut desar els factors.',true);return}
    preview();note('✓ Factors desats. Els moviments anteriors mantenen el càlcul original.');accepted();
  });
  form.addEventListener('input',preview);form.addEventListener('change',preview);
  form.addEventListener('submit',event=>{event.preventDefault();const row=calculate();if(!row){note('Revisa la data, l’horari i els factors.',true);return}
    if(row.computedMinutes<=0){note('El resultat ha de ser superior a zero.',true);return}
    const old=state.coefficientMovements;state.coefficientMovements=editing?old.map(item=>item.id===editing?{...row,id:editing}:item):[...old,{...row,id:crypto.randomUUID()}];
    if(!save()){state.coefficientMovements=old;note('No s’ha pogut desar el moviment.',true);return}
    $('coefficientYear').value=String(year(row.date));reset();render();list();note('✓ Moviment desat a BC.');accepted();
  });
  $('coefficientCancel').onclick=reset;$('coefficientYear').onchange=list;
  window.GuardiaCoefficients={refresh:list,decorateDay(button,date){const rows=state.coefficientMovements.filter(r=>r.date===date);if(!rows.length)return;
    const color=validCalendarColor(state.calendarColors.BC,fixedDefaultColors.BC);
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    const ink=(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])<.18?'#fff':'#142a38';
    const marker=document.createElement('span');marker.className='calendar-supplement coefficient-marker';marker.style.setProperty('--coefficient-color',color);marker.style.setProperty('--coefficient-ink',ink);
    marker.textContent=rows.map(r=>(r.kind==='earn'?'+':'−')+'BC').join(' · ');marker.title=rows.map(r=>(r.kind==='earn'?'+':'−')+hoursText(r.computedMinutes/60)+' BC').join(' · ');button.append(marker);
    if(!button.classList.contains('colored-day')&&!state.assignments[date]&&!state.leave[date]&&!state.cycleRest[date])applyCalendarColor(button,color,fixedDefaultColors.BC);
  }};
  rateFields();reset();$('coefficientYear').value=String(year(key(new Date())));list();
})();
