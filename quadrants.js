/* Pintar un quadrant en un esborrany separat del calendari publicat. */
const quadEl = id => document.getElementById(id);
const quadWeekdays = ['Dl','Dt','Dc','Dj','Dv','Ds','Dg'];
const quadDayMs = 86400000;
const quadDraftKey = 'guardia-quadrant-draft-v1';
let quadMonth, quadLastChange = null, quadPending = {}, quadDraftRange = null, quadEraseMode = false;
try {
  const stored = JSON.parse(localStorage.getItem(quadDraftKey));
  if (stored?.version === 1 && stored.days && typeof stored.days === 'object' && !Array.isArray(stored.days) && Object.keys(stored.days).length < 5000) {
    quadPending = Object.fromEntries(Object.entries(stored.days).filter(([date,day]) => Number.isFinite(quadToMs(date)) && day && typeof day === 'object' && !Array.isArray(day)));
    if (stored.range && Number.isFinite(quadToMs(stored.range.start)) && Number.isFinite(quadToMs(stored.range.end)) && stored.range.start <= stored.range.end) quadDraftRange = stored.range;
  }
} catch {}
function quadPersistDraft() {
  try { localStorage.setItem(quadDraftKey,JSON.stringify({version:1,range:quadDraftRange,days:quadPending}));return true } catch { return false }
}
function quadPendingUpdate() {
  const count=Object.keys(quadPending).length;
  quadEl('quadrantPendingCount').textContent=count?count+' '+(count===1?'dia pendent de gravar':'dies pendents de gravar'):'Cap canvi pendent';
  quadEl('quadrantCommit').disabled=quadEl('quadrantDiscard').disabled=!count;
}
function quadDate(ms) { return new Date(ms).toISOString().slice(0,10) }
function quadToMs(raw) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw||''))return NaN;
  let ms=Date.parse(raw+'T00:00:00Z');return Number.isFinite(ms)&&quadDate(ms)===raw?ms:NaN;
}
function quadMonthDate(raw) { let [y,m]=raw.slice(0,7).split('-').map(Number);return new Date(y,m-1,1) }
function quadMessage(message,error=false,id='quadrantPaintStatus') { let el=quadEl(id);el.hidden=false;el.classList.toggle('error',error);el.textContent=message }
function quadRange() {
  let start=quadEl('quadrantStart').value,end=quadEl('quadrantEnd').value,a=quadToMs(start),b=quadToMs(end);
  return Number.isFinite(a)&&Number.isFinite(b)&&a<=b?{start,end,first:a,last:b}:null;
}
function quadInitialRange() {
  let y=policeYear(new Date()),fallback={start:y+'-02-01',end:(y+1)+'-01-31'},saved=state.quadrantPaintRange;
  let valid=saved&&Number.isFinite(quadToMs(saved.start))&&Number.isFinite(quadToMs(saved.end))&&saved.start<=saved.end;
  let range=quadDraftRange|| (valid?saved:fallback);
  quadEl('quadrantStart').value=range.start;quadEl('quadrantEnd').value=range.end;
  let today=key(new Date());quadMonth=quadMonthDate(today>=range.start&&today<=range.end?today:range.start);
}
function quadBrushColor(value) {
  if(value==='F')return validCalendarColor(state.calendarColors.rest,calendarDefaultColors.off);
  if(leavePresets[value])return validCalendarColor(state.calendarColors[value],fixedDefaultColors[value]);
  let t=state.types.find(x=>x.id===value);return validCalendarColor(t?.hex,calendarDefaultColors[t?.color]||calendarDefaultColors.morning);
}
function quadBrushLabel(value) {
  if(value==='F')return state.restType.name;
  if(leavePresets[value])return leavePresets[value].label;
  let t=state.types.find(x=>x.id===value);return t?t.code+' · '+t.name:'Torn eliminat';
}
function quadOptions() {
  let select=quadEl('quadrantDayType'),selected=select.value;select.replaceChildren();
  let entries=[...(!state.restTypeHidden?[['F',state.restType.code+' · '+state.restType.name+' · 0 h']]:[]),...Object.entries(leavePresets).map(([code,p])=>[code,p.label+' · hores']),...state.types.map(t=>[t.id,t.code+' · '+t.name+' ('+hoursText(duration(t))+')'])];
  for(let [id,label] of entries){let opt=document.createElement('option');opt.value=id;opt.textContent=label;select.append(opt)}
  if(entries.some(([id])=>id===selected))select.value=selected;
  quadBrushUpdate();
}
function quadBrushUpdate() {
  let value=quadEl('quadrantDayType').value,leave=!!leavePresets[value];
  quadEl('quadrantHoursWrap').hidden=!leave;
  quadEl('quadrantBrushSwatch').style.backgroundColor=quadBrushColor(value);
  quadEl('quadrantBrushInfo').textContent=quadEraseMode?'Mode esborrar activat: toca els dies que vulguis deixar buits. Desactiva el botó per tornar a pintar.':leave?'Toca els dies per preparar '+quadBrushLabel(value)+' amb les hores indicades.':'Toca els dies per pintar '+quadBrushLabel(value)+'. Grava tots els canvis quan els hagis revisat.';
}
function quadEraseUpdate() {
  let button=quadEl('quadrantEraseToggle');button.classList.toggle('active',quadEraseMode);
  button.setAttribute('aria-pressed',String(quadEraseMode));
  button.textContent=quadEraseMode?'✓ Esborrant dies · desactivar':'⌫ Esborrar dies';
  quadEl('quadrantModeBadge').hidden=!quadEraseMode;
  quadBrushUpdate();
}
function quadSnapshot(date) {
  return {date,assignment:state.assignments[date],extras:state.extraAssignments[date]?[...state.extraAssignments[date]]:undefined,overrides:state.shiftHoursOverrides[date]?{...state.shiftHoursOverrides[date]}:undefined,rest:state.cycleRest[date],leave:state.leave[date]?{...state.leave[date]}:undefined};
}
function quadView(date) { return Object.hasOwn(quadPending,date)?quadPending[date]:quadSnapshot(date) }
function quadTypes(day) { return [day.assignment,...(day.extras||[])].map(id=>state.types.find(t=>t.id===id)).filter(Boolean) }
function quadDayLabels(date) {
  let view=quadView(date),types=quadTypes(view),leave=view.leave,labels=[];
  for(let t of types)labels.push(t.name);
  if(leave){let code=Object.keys(leavePresets).find(c=>leavePresets[c].category===leave.category);labels.push((code||leave.category)+' '+hoursText(leave.hours))}
  if(!labels.length&&view.rest)labels.push(state.restType.name);
  return labels;
}
function quadDayColor(date) {
  let view=quadView(date),type=quadTypes(view)[0];if(type)return validCalendarColor(type.hex,calendarDefaultColors[type.color]||calendarDefaultColors.morning);
  let leave=view.leave;if(leave){let code=Object.keys(leavePresets).find(x=>leavePresets[x].category===leave.category);return validCalendarColor(state.calendarColors[code],fixedDefaultColors[code]||'#e9ecf2')}
  if(view.rest)return quadBrushColor('F');return '#f5f9fe';
}
function quadDraw() {
  let range=quadRange(),root=quadEl('quadrantDays');root.replaceChildren();
  quadEl('quadrantMonth').textContent=new Intl.DateTimeFormat('ca',{month:'long',year:'numeric'}).format(quadMonth);
  for(let label of quadWeekdays){let heading=document.createElement('div');heading.className='weekday';heading.textContent=label;root.append(heading)}
  let y=quadMonth.getFullYear(),m=quadMonth.getMonth(),offset=(new Date(y,m,1).getDay()+6)%7,today=key(new Date());
  for(let i=0;i<offset;i++)root.append(document.createElement('div'));
  for(let n=1;n<=new Date(y,m+1,0).getDate();n++){
    let date=quadDate(Date.UTC(y,m,n)),inside=!!range&&date>=range.start&&date<=range.end,labels=quadDayLabels(date);
    let day=document.createElement('button');day.type='button';day.className='quad-day'+(inside?' in-cycle':' out-cycle')+(date===today?' quad-today':'')+(Object.hasOwn(quadPending,date)?' quad-pending':'');day.disabled=!inside;
    day.style.setProperty('--quad-color',quadDayColor(date));day.setAttribute('aria-label',displayDate(date)+(labels.length?', '+labels.join(' i '):', sense torn')+(date===today?', avui':''));
    let num=document.createElement('strong');num.textContent=n;let name=document.createElement('span');name.textContent=labels.join(' + ');day.append(num,name);
    if(inside)day.onclick=()=>quadPaint(date);
    root.append(day);
  }
}
function quadRestore(previous) {
  const {date,assignment,extras,overrides,rest,leave}=previous;
  if(assignment===undefined)delete state.assignments[date];else state.assignments[date]=assignment;
  if(extras===undefined)delete state.extraAssignments[date];else state.extraAssignments[date]=extras;
  if(overrides===undefined)delete state.shiftHoursOverrides[date];else state.shiftHoursOverrides[date]=overrides;
  if(rest===undefined)delete state.cycleRest[date];else state.cycleRest[date]=rest;
  if(leave===undefined)delete state.leave[date];else state.leave[date]=leave;
}
function quadPaint(date) {
  let brush=quadEl('quadrantDayType').value,hadDraft=Object.hasOwn(quadPending,date),oldDraft=hadDraft?{...quadPending[date],extras:quadPending[date].extras?[...quadPending[date].extras]:undefined,leave:quadPending[date].leave?{...quadPending[date].leave}:undefined}:null;
  let next=quadView(date),day={...next,extras:next.extras?[...next.extras]:undefined,leave:next.leave?{...next.leave}:undefined};
  let existing=quadTypes(day),leave=day.leave,action='';
  if(quadEraseMode){
    delete day.assignment;delete day.extras;delete day.overrides;delete day.rest;delete day.leave;action='Dia buit';
  }else if(brush==='F'){
    if(leave){quadMessage('Aquest dia té un permís. Edita’l al Calendari abans de posar-hi Festa.',true);return}
    delete day.assignment;delete day.extras;delete day.overrides;day.rest=true;action=state.restType.name;
  }else if(leavePresets[brush]){
    let hours=parseHours(quadEl('quadrantHours').value),category=leavePresets[brush].category;
    if(!Number.isFinite(hours)||hours<=0||hours>24){quadMessage('Posa les hores del permís, per exemple 8:30.',true);return}
    if(category==='remainder'&&existing.length){quadMessage('R s’ha de posar en un dia sense torns de feina. Treu-los primer.',true);return}
    day.leave={category,hours,note:leave?.category===category?leave.note||'':''};delete day.rest;action=brush+' · '+hoursText(hours);
  }else{
    let t=state.types.find(x=>x.id===brush);
    if(!t){quadOptions();quadMessage('Aquest torn ja no existeix a «＋ Torn».',true);return}
    if(leave&&!combinableLeave.has(leave.category)){quadMessage('Aquest dia té R o un permís antic. Edita’l al Calendari abans d’afegir feina.',true);return}
    day.assignment=t.id;delete day.extras;delete day.overrides;delete day.rest;action=t.name;
  }
  quadPending[date]=day;
  if(!quadPersistDraft()){if(hadDraft)quadPending[date]=oldDraft;else delete quadPending[date];quadMessage('No s’ha pogut conservar l’esborrany. Torna-ho a provar.',true);return}
  quadLastChange={date,hadDraft,oldDraft};quadEl('quadrantUndo').disabled=false;
  quadPendingUpdate();quadDraw();quadMessage('✓ '+displayDate(date)+' · '+action+' preparat. Encara no s’ha canviat el Calendari.');
}
function quadRangeChange(changedStart=false) {
  let start=quadEl('quadrantStart').value,end=quadEl('quadrantEnd').value;
  if(changedStart&&Number.isFinite(quadToMs(start))&&end<start){end=start;quadEl('quadrantEnd').value=end}
  let range=quadRange();
  if(!range){quadMessage('Revisa les dates: l’últim dia ha de ser igual o posterior al primer.',true,'quadrantRangeStatus');return}
  let pendingOutside=Object.keys(quadPending).some(date=>date<range.start||date>range.end);
  if(pendingOutside){quadEl('quadrantStart').value=quadDraftRange.start;quadEl('quadrantEnd').value=quadDraftRange.end;quadMessage('Hi ha dies pintats fora del nou interval. Grava o descarta primer l’esborrany.',true,'quadrantRangeStatus');return}
  let previous=quadDraftRange;
  quadDraftRange={start:range.start,end:range.end};
  if(!quadPersistDraft()){quadDraftRange=previous;quadMessage('No s’ha pogut conservar l’interval de l’esborrany.',true,'quadrantRangeStatus');return}
  if(quadMonth.getFullYear()<Number(start.slice(0,4))||quadMonth.getFullYear()===Number(start.slice(0,4))&&quadMonth.getMonth()+1<Number(start.slice(5,7))||quadMonth.getFullYear()>Number(end.slice(0,4))||quadMonth.getFullYear()===Number(end.slice(0,4))&&quadMonth.getMonth()+1>Number(end.slice(5,7)))quadMonth=quadMonthDate(start);
  quadDraw();quadMessage('✓ Interval de l’esborrany: '+displayDate(start)+' – '+displayDate(end)+'.',false,'quadrantRangeStatus');
}
quadInitialRange();quadDraftRange=quadRange();quadOptions();quadDraw();quadPendingUpdate();
quadEl('quadrantStart').onchange=()=>quadRangeChange(true);
quadEl('quadrantEnd').onchange=()=>quadRangeChange(false);
quadEl('quadrantDayType').onchange=quadBrushUpdate;
quadEl('quadrantEraseToggle').onclick=()=>{quadEraseMode=!quadEraseMode;quadEraseUpdate()};
quadEl('quadrantPrev').onclick=()=>{quadMonth.setMonth(quadMonth.getMonth()-1);quadDraw()};
quadEl('quadrantNext').onclick=()=>{quadMonth.setMonth(quadMonth.getMonth()+1);quadDraw()};
quadEl('quadrantToday').onclick=()=>{quadMonth=quadMonthDate(key(new Date()));quadDraw()};
quadEl('quadrantUndo').onclick=()=>{
  if(!quadLastChange)return;let {date,hadDraft,oldDraft}=quadLastChange,currentDraft=quadPending[date];
  if(hadDraft)quadPending[date]=oldDraft;else delete quadPending[date];
  if(!quadPersistDraft()){quadPending[date]=currentDraft;quadMessage('No s’ha pogut desfer el canvi.',true);return}
  quadLastChange=null;quadEl('quadrantUndo').disabled=true;quadDraw();quadPendingUpdate();quadMessage('✓ Últim toc desfet: '+displayDate(date)+'.');
};
quadEl('quadrantDiscard').onclick=()=>{
  const count=Object.keys(quadPending).length;
  if(!count||!confirm('Descartar els '+count+' dies de l’esborrany? El Calendari no canviarà.'))return;
  const before=quadPending;quadPending={};
  if(!quadPersistDraft()){quadPending=before;quadMessage('No s’ha pogut descartar l’esborrany.',true);return}
  quadLastChange=null;quadEl('quadrantUndo').disabled=true;quadPendingUpdate();quadDraw();quadMessage('Esborrany descartat. El Calendari no s’ha modificat.');
};
quadEl('quadrantCommit').onclick=()=>{
  const dates=Object.keys(quadPending).sort(),range=quadRange();if(!dates.length||!range)return;
  if(dates.some(date=>date<range.start||date>range.end)){quadMessage('Revisa l’interval: hi ha dies pintats fora de les dates seleccionades.',true);return}
  for(const date of dates){
    const day=quadPending[date],types=[day.assignment,...(day.extras||[])].filter(Boolean),leave=day.leave;
    if(types.some(id=>!state.types.some(t=>t.id===id))){quadMessage('El '+displayDate(date)+' té un torn eliminat a «＋ Torn». Canvia’l a l’esborrany abans de gravar.',true);return}
    if(leave&&(!Number.isFinite(Number(leave.hours))||leave.hours<=0||leave.hours>24)) {quadMessage('Revisa les hores del permís del '+displayDate(date)+'.',true);return}
    if(leave&&types.length&&combinableLeave.has(leave.category)&&Number(leave.hours)>types.reduce((sum,id)=>sum+duration(state.types.find(t=>t.id===id)),0)+1e-9){quadMessage('Les hores del permís del '+displayDate(date)+' superen les dels seus torns.',true);return}
  }
  const entireRange=quadEl('quadrantOverwriteRange').checked;
  const affected=entireRange?Array.from({length:Math.round((range.last-range.first)/quadDayMs)+1},(_,i)=>quadDate(range.first+i*quadDayMs)):dates;
  const overwritten=affected.filter(date=>state.assignments[date]||state.extraAssignments[date]?.length||state.cycleRest[date]).length;
  const changedLeaves=dates.filter(date=>JSON.stringify(state.leave[date]||null)!==JSON.stringify(quadPending[date].leave||null)).length;
  const ask=entireRange?'Sobreescriure tot l’interval '+displayDate(range.start)+' – '+displayDate(range.end)+'?\n\nHi ha '+dates.length+' dies pintats. Els dies sense pintar quedaran sense torn. Es trauran o substituiran torns i festes de '+overwritten+' dies. Els permisos, judicis i dies especials es conservaran.':'Gravar '+dates.length+' '+(dates.length===1?'dia pintat':'dies pintats')+' al Calendari?\n\nSe substituiran els torns o festes de '+overwritten+' dies i els permisos de '+changedLeaves+' dies. Els altres dies del calendari es conservaran.';
  if(!confirm(ask))return;
  const previous=affected.map(quadSnapshot),beforeRange=state.quadrantPaintRange;
  if(entireRange)for(const date of affected){delete state.assignments[date];delete state.extraAssignments[date];delete state.shiftHoursOverrides[date];delete state.cycleRest[date]}
  for(const date of dates)quadRestore(quadPending[date]);
  state.quadrantPaintRange={start:range.start,end:range.end};
  if(!save()){
    previous.forEach(quadRestore);
    if(beforeRange===undefined)delete state.quadrantPaintRange;else state.quadrantPaintRange=beforeRange;
    quadMessage('No s’ha pogut gravar. L’esborrany continua intacte per tornar-ho a provar.',true);return;
  }
  quadPending={};quadLastChange=null;
  try{localStorage.removeItem(quadDraftKey)}catch{}
  quadEl('quadrantUndo').disabled=true;quadPendingUpdate();quadDraw();
  const [year,month]=dates[0].split('-').map(Number);current=new Date(year,month-1,1);selectedYear=policeYear(new Date(year,month-1,1));render();
  quadEl('quadrantOverwriteRange').checked=false;
  quadMessage('✓ '+dates.length+' '+(dates.length===1?'dia pintat gravat':'dies pintats gravats')+' al Calendari'+(entireRange?' i torns de tot l’interval substituïts':'')+'. Ja ho pots veure a la pestanya Calendari.');
};
