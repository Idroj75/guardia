/* Hores anuals editables a Totals, amb una base independent per any policial. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),form=$('annualWorkForm'),input=$('annualWorkHours');
  let editorYear=null,editing=false;
  const defined=()=>state.annual[selectedYear]?.work!==undefined&&state.annual[selectedYear]?.work!==''&&Number.isFinite(Number(state.annual[selectedYear].work));
  function refresh(){
    if(editorYear!==selectedYear){editorYear=selectedYear;editing=false;input.value=defined()?hoursValue(state.annual[selectedYear].work):'';$('annualWorkFeedback').textContent=''}
    form.hidden=defined()&&!editing;
    $('annualWorkEdit').hidden=!defined()||editing;
    $('annualWorkCancel').hidden=!defined();
  }
  $('annualWorkEdit').onclick=()=>{editing=true;input.value=hoursValue(state.annual[selectedYear].work);$('annualWorkFeedback').textContent='';refresh();input.focus()};
  $('annualWorkCancel').onclick=()=>{editing=false;$('annualWorkFeedback').textContent='';refresh()};
  form.addEventListener('submit',event=>{
    event.preventDefault();const raw=input.value.trim(),hours=parseHours(raw),feedback=$('annualWorkFeedback');
    if(!raw||!Number.isFinite(hours)||hours<0||hours>100000){feedback.textContent='Introdueix les hores, per exemple 1680 o 1680:30.';return}
    const year=selectedYear,previous=state.annual[year];state.annual[year]={...previous,work:hours};
    if(!save()){if(previous===undefined)delete state.annual[year];else state.annual[year]=previous;feedback.textContent='No s’han pogut desar les hores. Torna-ho a provar.';return}
    editing=false;renderSummary();feedback.textContent='✓ Hores anuals desades.';
  });
  window.GuardiaAnnualHours={refresh};refresh();
})();
