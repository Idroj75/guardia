(function(){
  'use strict';
  const panel=document.getElementById('dayIntervals');
  const list=document.getElementById('dayIntervalsList');
  const title=document.getElementById('dayIntervalsSummary');
  let date='';

  function dayRecords(day){
    const rows=[];
    const primary=state.assignments[day];
    if(primary)rows.push({kind:'shift',slot:'primary',id:primary});
    (state.extraAssignments[day]||[]).forEach((id,index)=>rows.push({kind:'shift',slot:'extra',index,id}));
    if(state.cycleRest[day])rows.push({kind:'rest'});
    if(state.leave[day]&&state.leave[day].category!=='bc')rows.push({kind:'leave',entry:state.leave[day]});
    (state.accruals||[]).filter(item=>item.date===day&&item.category==='bl').forEach(item=>rows.push({kind:'accrual',id:item.id,entry:item}));
    (state.hourEntries||[]).filter(item=>item.date===day&&item.category!=='bc').forEach(item=>rows.push({kind:'concept',id:item.id,entry:item}));
    (state.dayComments||[]).filter(item=>item.date===day).sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)).forEach(item=>rows.push({kind:'comment',id:item.id,entry:item}));
    return rows;
  }
  function rowText(row){
    if(row.kind==='shift'){
      let type=shiftTypesForDate(date)[row.slot==='primary'?0:row.index+1];
      return type?((row.slot==='primary'?'Torn principal · ':'Torn afegit · ')+type.name+' · '+hoursText(serviceHours(date,type))+' de treball ('+hoursText(duration(type))+' de torn)'):'Torn antic';
    }
    if(row.kind==='rest')return state.restType.code+' · '+state.restType.name+' · 0 h';
    if(row.kind==='leave')return (categories[row.entry.category]||row.entry.category)+' · '+hoursText(row.entry.hours)+' descomptades';
    if(row.kind==='concept'){const destination=state.customBalances?.find(b=>b.id===row.entry.category)?.name||row.entry.category?.toUpperCase();return (row.entry.sign>0?'+':'−')+(row.entry.name||row.entry.code||'Hores')+(destination?' → '+destination:'')+' · '+hoursText(row.entry.hours)+(row.entry.note?' · '+row.entry.note:'')}
    if(row.kind==='comment')return 'Comentari · '+((Number(row.entry.priority)||0)?'★'.repeat(Math.min(3,Number(row.entry.priority)))+' · ':'')+row.entry.text;
    return (row.entry.kind==='extension'?'Perllongament ':'Hores acumulades ')+row.entry.category.toUpperCase()+' · +'+hoursText(row.entry.hours)+(row.entry.note?' · '+row.entry.note:'');
  }
  function resetEdit(){editing=null;$('#cancelIntervalEdit').hidden=true;$('#dayEditFeedback').hidden=true;$('#saveDay').classList.remove('saved');updateDayEditHours()}
  function renderRows(){
    const rows=dayRecords(date);title.textContent='Intervals d’aquest dia ('+rows.length+')';list.replaceChildren();
    if(!rows.length){let p=document.createElement('p');p.className='sub';p.textContent='Encara no hi ha intervals imputats aquest dia.';list.append(p);return}
    rows.forEach((row,index)=>{
      const line=document.createElement('div');line.className='day-interval-row'+(row.kind==='comment'&&date<key(new Date())?' comment-expired':'');
      const description=document.createElement('span');description.className='day-interval-description';description.textContent=(index+1)+'. '+rowText(row);
      const actions=document.createElement('div');actions.className='day-interval-actions';
      const canEdit=row.kind==='leave'||row.kind==='accrual'||row.kind==='concept'||row.kind==='comment'&&date>=key(new Date())||row.kind==='shift'&&row.slot==='extra'&&state.types.some(type=>type.id===row.id);
      if(canEdit){const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.onclick=()=>editRow(row,index);actions.append(edit)}
      const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Eliminar';remove.setAttribute('aria-label','Eliminar '+rowText(row));remove.onclick=()=>removeRow(row);
      actions.append(remove);line.append(description,actions);list.append(line);
    });
  }
  function editRow(row,index){
    if(row.kind==='comment'){$('#dayDialog').close();window.GuardiaComments?.openEdit?.(row.id);return}
    renderRows();panel.open=true;
    const line=list.children[index],form=document.createElement('form');form.className='day-interval-inline-editor';
    const label=document.createElement('label');label.textContent=row.kind==='shift'?'Hores d’aquest torn afegit':row.kind==='leave'?'Hores de '+(categories[row.entry.category]||row.entry.category):row.kind==='concept'?'Hores de '+row.entry.name:'Hores acumulades';
    const hours=document.createElement('input');hours.type='text';hours.inputMode='decimal';hours.required=true;hours.setAttribute('aria-label',label.textContent);
    const currentShift=row.kind==='shift'?shiftTypesForDate(date)[row.index+1]:null;
    hours.value=hoursValue(row.kind==='shift'?duration(currentShift):row.entry.hours);label.append(hours);form.append(label);
    let destination,note;
    if(row.kind==='accrual'||row.kind==='concept'&&window.GuardiaHourConcepts?.concept?.(row.entry.conceptId)?.target==='choose'){
      let categoryLabel=document.createElement('label');categoryLabel.textContent='Bossa';destination=document.createElement('select');
      for(let code of ['bl']){let option=document.createElement('option');option.value=code;option.textContent=code.toUpperCase();destination.append(option)}
      destination.value=row.entry.category;categoryLabel.append(destination);form.append(categoryLabel);
      if(row.kind==='accrual'){let noteLabel=document.createElement('label');noteLabel.textContent='Comentari';note=document.createElement('input');note.type='text';note.maxLength=240;note.value=row.entry.note||'';noteLabel.append(note);form.append(noteLabel)}
    }
    const error=document.createElement('p');error.className='day-interval-error';error.hidden=true;
    const actions=document.createElement('div');actions.className='day-interval-actions';
    const saveButton=document.createElement('button');saveButton.type='submit';saveButton.textContent='Desar canvis';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel·lar';cancel.onclick=()=>renderRows();
    actions.append(saveButton,cancel);form.append(error,actions);line.append(form);hours.focus();
    form.onsubmit=e=>{
      e.preventDefault();const value=parseHours(hours.value);
      if(!Number.isFinite(value)||value<=0||value>24){error.textContent='Escriu entre 0:01 i 24:00 (per exemple, 2:30).';error.hidden=false;return}
      const old=snapshot(date);
      if(row.kind==='shift'){
        if(!state.shiftHoursOverrides[date])state.shiftHoursOverrides[date]={};
        state.shiftHoursOverrides[date][row.index+1]={id:row.id,hours:value};
      }else if(row.kind==='leave'){
        state.leave[date]={...state.leave[date],hours:value};
      }else if(row.kind==='concept'){
        const item=state.hourEntries.find(entry=>entry.id===row.id&&entry.date===date);
        if(!item){error.textContent='Aquest moviment ja no existeix.';error.hidden=false;return}
        item.hours=value;if(destination)item.category=destination.value;
      }else{
        const item=state.accruals.find(entry=>entry.id===row.id&&entry.date===date);
        if(!item){error.textContent='Aquest moviment ja no existeix. Torna a obrir el dia.';error.hidden=false;return}
        Object.assign(item,{hours:value,category:destination.value,note:note.value.trim()});
      }
      if(!save()){restore(date,old);error.textContent='No s’ha pogut desar. Torna-ho a provar.';error.hidden=false;return}
      finish('✓ Interval modificat; els altres es conserven.');
    };
  }
  function snapshot(day){return {assignment:state.assignments[day],extras:state.extraAssignments[day]?[...state.extraAssignments[day]]:undefined,leave:state.leave[day]?{...state.leave[day]}:undefined,rest:state.cycleRest[day],overrides:state.shiftHoursOverrides[day]?{...state.shiftHoursOverrides[day]}:undefined,accruals:state.accruals.map(item=>({...item})),hourEntries:(state.hourEntries||[]).map(item=>({...item})),dayComments:(state.dayComments||[]).map(item=>({...item}))}}
  function restore(day,old){
    if(old.assignment===undefined)delete state.assignments[day];else state.assignments[day]=old.assignment;
    if(old.extras===undefined)delete state.extraAssignments[day];else state.extraAssignments[day]=old.extras;
    if(old.leave===undefined)delete state.leave[day];else state.leave[day]=old.leave;
    if(old.rest===undefined)delete state.cycleRest[day];else state.cycleRest[day]=old.rest;
    if(old.overrides===undefined)delete state.shiftHoursOverrides[day];else state.shiftHoursOverrides[day]=old.overrides;
    state.accruals=old.accruals;
    state.hourEntries=old.hourEntries;
    state.dayComments=old.dayComments;
  }
  function finish(message){
    selectedYear=policeYear(new Date(date+'T12:00:00'));render();renderReports();renderRows();window.GuardiaComments?.refresh?.();panel.open=true;
    $('#dayEditFeedback').classList.remove('error');$('#dayEditFeedback').textContent=message;$('#dayEditFeedback').hidden=false;
    $('#dialogBody').textContent='Intervals del dia actualitzats. Consulta el llistat inferior.';
  }
  function removeRow(row){
    if(!confirm('Eliminar aquest interval? '+rowText(row)))return;
    const old=snapshot(date);
    if(row.kind==='shift'){
      const overrides=state.shiftHoursOverrides[date]||{},removedIndex=row.slot==='primary'?0:row.index+1,nextOverrides={};
      for(const [key,value] of Object.entries(overrides)){let index=Number(key);if(index===removedIndex)continue;nextOverrides[index>removedIndex?index-1:index]=value}
      if(Object.keys(nextOverrides).length)state.shiftHoursOverrides[date]=nextOverrides;else delete state.shiftHoursOverrides[date];
      if(row.slot==='primary'){
        let extras=state.extraAssignments[date]||[];
        if(extras.length){state.assignments[date]=extras[0];state.extraAssignments[date]=extras.slice(1);if(!state.extraAssignments[date].length)delete state.extraAssignments[date]}
        else delete state.assignments[date];
      }else{
        let extras=state.extraAssignments[date]||[];extras.splice(row.index,1);
        if(!extras.length)delete state.extraAssignments[date];
      }
    }else if(row.kind==='leave')delete state.leave[date];
    else if(row.kind==='rest')delete state.cycleRest[date];
    else if(row.kind==='concept')state.hourEntries=state.hourEntries.filter(item=>item.id!==row.id);
    else if(row.kind==='comment')state.dayComments=(state.dayComments||[]).filter(item=>item.id!==row.id);
    else state.accruals=state.accruals.filter(item=>item.id!==row.id);
    if(!save()){restore(date,old);return}
    finish('✓ Interval eliminat. La resta d’intervals es conserva.');
  }
  window.extensionOpen=function(day){date=day;panel.open=false;renderRows()};
  window.renderExtensionReport=function(from,to,root){
    let rows=(state.accruals||[]).filter(x=>x.kind==='extension'&&x.category==='bl'&&x.date>=from&&x.date<=to).sort((a,b)=>a.date.localeCompare(b.date));let totals={bl:0};
    for(const item of rows){totals[item.category]=(totals[item.category]||0)+(Number(item.hours)||0);let line=document.createElement('div');line.className='row';let day=document.createElement('span');day.textContent=displayDate(item.date);let detail=document.createElement('span');detail.textContent='Perllongament → '+item.category.toUpperCase()+(item.note?' · '+item.note:'');let amount=document.createElement('strong');amount.textContent='+'+hoursText(item.hours);line.append(day,detail,amount);root.append(line)}
    if(!rows.length){let p=document.createElement('p');p.className='sub';p.textContent='No hi ha perllongaments en aquest període.';root.append(p)}
    document.getElementById('reportTotal').textContent='Total BL: +'+hoursText(totals.bl);
  };
})();
