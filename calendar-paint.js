/* Paint straight onto the existing calendar; the detailed day editor stays available. */
(() => {
  const get = id => document.getElementById(id);
  const select = get('calendarPaintType');
  const hoursField = get('calendarPaintHours');
  const hoursWrap = get('calendarPaintHoursWrap');
  const destinationWrap = get('calendarPaintDestinationWrap');
  const undoButton = get('calendarUndo');
  const eraseButton = get('calendarPaintErase');
  const editButton = get('calendarPaintEdit');
  const consultButton = get('calendarPaintConsult');
  const commentsButton = get('calendarCommentsShortcut');
  const feedback = get('calendarPaintFeedback');
  const eraseDialog = get('calendarEraseDialog');
  const eraseList = get('calendarEraseList');
  const eraseForm = get('calendarEraseForm');
  if (!select || !get('days')) return;
  let addMode = false;
  let mode = 'edit';
  let eraseDate = '';
  let feedbackTimer;

  function option(group, value, label) {
    const item = document.createElement('option');
    item.value = value;
    item.textContent = label;
    group.append(item);
  }

  function refresh() {
    const selected = select.value || '__choose__';
    select.replaceChildren();
    option(select, '__choose__', 'Tria un torn o permís');
    const custom = document.createElement('optgroup');
    custom.label = 'TORNS DE SERVEI';
    state.types.forEach(type => option(custom, type.id, type.name + ' · ' + hoursText(duration(type))));
    if (custom.children.length) select.append(custom);
    const fixed = document.createElement('optgroup');
    fixed.label = 'FESTA I PERMISOS';
    if (!state.restTypeHidden) option(fixed, 'F', state.restType.code + ' · ' + state.restType.name + ' · 0 h');
    Object.entries(leavePresets).filter(([code]) => code !== 'BC' && !state.legacyHourHidden?.[code]).forEach(([code, preset]) => option(fixed, code, preset.label + ' · hores'));
    select.append(fixed);
    window.GuardiaHourConcepts?.appendOptions?.(select);
    const present = [...select.options].some(item => item.value === selected);
    select.value = present ? selected : '__choose__';
    if (!present) mode = 'edit';
    updateControls();
    const squad = String(state.profile.squad || '').trim();
    get('calendarSquadTitle').textContent = squad ? 'Escamot ' + squad : 'Calendari';
  }

  function updateControls() {
    const value = select.value;
    const type = state.types.find(item => item.id === value);
    const preset = leavePresets[value];
    const concept = window.GuardiaHourConcepts?.concept?.(value);
    hoursWrap.hidden = !preset && !concept && !value.startsWith('extension-');
    destinationWrap.hidden = concept?.target !== 'choose';
    editButton.setAttribute('aria-pressed', String(mode === 'edit'));
    consultButton.setAttribute('aria-pressed', String(mode === 'consult'));
    eraseButton.setAttribute('aria-pressed', String(mode === 'erase'));
    commentsButton.setAttribute('aria-pressed', String(mode === 'comments'));
    eraseButton.textContent = mode === 'erase' ? '✓ Esborrant dies' : '⌫ Esborrar dia';

  }

  function message(text, error = false) {
    clearTimeout(feedbackTimer);
    feedback.hidden = !error;
    feedback.classList.toggle('error', error);
    feedback.textContent = text;
    if (error) feedbackTimer = setTimeout(() => { feedback.hidden = true; }, 5000);
  }

  function snapshot(date) {
    return {
      assignment: state.assignments[date],
      extras: state.extraAssignments[date] ? [...state.extraAssignments[date]] : undefined,
      overrides: state.shiftHoursOverrides[date] ? { ...state.shiftHoursOverrides[date] } : undefined,
      rest: state.cycleRest[date],
      leave: state.leave[date] ? { ...state.leave[date] } : undefined,
      accruals: state.accruals,
      overtime: state.overtime,
      citations: state.citations,
      specialDays: state.specialDays,
      detentions: state.detentions,
      dayComments: state.dayComments,
      service: state.services?.[date],
      hourEntries: state.hourEntries
    };
  }

  function restore(date, old) {
    for (const [map, value] of [
      [state.assignments, old.assignment], [state.extraAssignments, old.extras],
      [state.shiftHoursOverrides, old.overrides], [state.cycleRest, old.rest],
      [state.leave, old.leave]
    ]) {
      if (value === undefined) delete map[date];
      else map[date] = value;
    }
    state.accruals = old.accruals;
    state.overtime = old.overtime;
    state.citations = old.citations;
    state.specialDays = old.specialDays;
    state.detentions = old.detentions;
    state.dayComments = old.dayComments;
    state.hourEntries = old.hourEntries;
    if (state.services) {
      if (old.service === undefined) delete state.services[date];
      else state.services[date] = old.service;
    }
  }

  function dayContents(date) {
    const lines = [];
    const shifts = shiftTypesForDate(date);
    if (shifts.length) lines.push('Torns: ' + shifts.map(type => type.name + ' · ' + hoursText(serviceHours(date, type))).join(', '));
    if (state.cycleRest[date]) lines.push(state.restType.name + ' del quadrant · 0 h');
    if (state.leave[date]) lines.push('Permís: ' + (categories[state.leave[date].category] || state.leave[date].category) + ' · ' + hoursText(state.leave[date].hours));
    const collections = [
      ['Perllongaments / hores acumulades', state.accruals],
      ['Hores extres', state.overtime], ['Judicis', state.citations],
      ['Dies especials', state.specialDays], ['Detinguts', state.detentions]
    ];
    for (const [label, rows] of collections) {
      const count = (rows || []).filter(row => row?.date === date).length;
      if (count) lines.push(label + ': ' + count);
    }
    if (state.services?.[date]) lines.push('Servei apuntat');
    const commentCount = (state.dayComments || []).filter(row => row.date === date).length;
    if (commentCount) lines.push('Comentaris: ' + commentCount);
    for (const item of (state.hourEntries || []).filter(item => item.date === date)) lines.push((item.sign > 0 ? '+' : '−') + item.name + ' · ' + hoursText(item.hours));
    for (const item of (state.coefficientMovements || []).filter(item => item.date === date)) lines.push('BC amb coeficient · ' + item.start + '–' + item.end + ' · ' + (item.kind === 'earn' ? '+' : '−') + hoursText(item.computedMinutes / 60) + ' (gestiona-ho a «Torn» → «BC · Coeficients»)');
    return lines;
  }

  function entriesForDate(date) {
    const entries = [];
    const shiftIds = [state.assignments[date], ...(state.extraAssignments[date] || [])].filter(Boolean);
    const shifts = shiftTypesForDate(date);
    shiftIds.forEach((id, index) => entries.push({ key: 'shift:' + index, label: 'Torn · ' + (shifts[index]?.name || state.types.find(type => type.id === id)?.name || id) + ' · ' + hoursText(duration(shifts[index] || state.types.find(type => type.id === id) || {start:'00:00',end:'00:00'})) }));
    if (state.cycleRest[date]) entries.push({ key: 'rest', label: state.restType.name + ' del quadrant · 0 h' });
    if (state.leave[date] && state.leave[date].category !== 'bc') entries.push({ key: 'leave', label: (categories[state.leave[date].category] || state.leave[date].category) + ' · ' + hoursText(state.leave[date].hours) });
    for (const [key, rows, format] of [
      ['accruals', state.accruals, row => (row.kind === 'extension' ? 'Perllongament ' : 'Hores acumulades ') + String(row.category || '').toUpperCase() + ' · +' + hoursText(row.hours)],
      ['overtime', state.overtime, row => 'Hores extres · ' + hoursText(row.hours)],
      ['citations', state.citations, row => 'Judici · ' + [row.time, row.locality, row.tribunal].filter(Boolean).join(' · ')],
      ['specialDays', state.specialDays, row => 'Dia especial · ' + (row.name || 'Sense nom')],
      ['detentions', state.detentions, row => 'Detinguts · ' + (row.count || 1) + (row.proceedings ? ' · ' + row.proceedings : '')],
      ['dayComments', state.dayComments, row => 'Comentari · ' + ((Number(row.priority) || 0) > 0 ? '★'.repeat(Math.min(3, Number(row.priority))) + ' · ' : '') + row.text]
    ]) (rows || []).forEach((row, index) => {
      if (row?.date === date && !(key === 'accruals' && row.category === 'bc')) entries.push({ key: key + ':' + index, label: format(row) });
    });
    if (state.services?.[date]) entries.push({ key: 'service', label: 'Servei · ' + (typeof state.services[date] === 'string' ? state.services[date] : state.services[date].name || 'Apuntat') });
    (state.hourEntries || []).forEach((item, index) => {
      if (item.date === date && item.category !== 'bc') entries.push({ key: 'hourEntries:' + index, label: (item.sign > 0 ? '+' : '−') + item.name + ' · ' + hoursText(item.hours) });
    });
    return entries;
  }

  function removeEntries(date, keys) {
    const old = snapshot(date);
    const chosen = new Set(keys);
    const shifts = [state.assignments[date], ...(state.extraAssignments[date] || [])].filter(Boolean);
    if (shifts.some((_, index) => chosen.has('shift:' + index))) {
      const remaining = shifts.map((id, index) => ({ id, override: state.shiftHoursOverrides[date]?.[index], index })).filter(row => !chosen.has('shift:' + row.index));
      if (remaining.length) {
        state.assignments[date] = remaining[0].id;
        if (remaining.length > 1) state.extraAssignments[date] = remaining.slice(1).map(row => row.id);
        else delete state.extraAssignments[date];
        const overrides = {};
        remaining.forEach((row, index) => { if (row.override) overrides[index] = row.override; });
        if (Object.keys(overrides).length) state.shiftHoursOverrides[date] = overrides;
        else delete state.shiftHoursOverrides[date];
      } else {
        delete state.assignments[date];
        delete state.extraAssignments[date];
        delete state.shiftHoursOverrides[date];
      }
    }
    if (chosen.has('rest')) delete state.cycleRest[date];
    if (chosen.has('leave')) delete state.leave[date];
    if (chosen.has('service') && state.services) delete state.services[date];
    for (const key of ['accruals', 'overtime', 'citations', 'specialDays', 'detentions', 'hourEntries', 'dayComments']) {
      state[key] = (state[key] || []).filter((_, index) => !chosen.has(key + ':' + index));
    }
    if (!save({silent:true})) { restore(date, old); message('No s’ha pogut desar l’esborrat.', true); return false; }
    selectedYear = policeYear(new Date(date + 'T12:00:00'));
    render();
    for (const fn of [renderCitations, renderService]) try { fn(); } catch (error) { console.error(error); }
    window.GuardiaComments?.refresh?.();
    message('✓ ' + displayDate(date) + ' · ' + keys.length + (keys.length === 1 ? ' registre esborrat.' : ' registres esborrats.') + ' La resta s’ha conservat.');
    return true;
  }

  function erase(date) {
    const entries = entriesForDate(date);
    if (!entries.length) { message('El ' + displayDate(date) + ' no té registres per esborrar.'); return; }
    if (entries.length === 1) { removeEntries(date, [entries[0].key]); return; }
    eraseDate = date;
    get('calendarEraseDate').textContent = 'Dia ' + displayDate(date);
    eraseList.replaceChildren();
    entries.forEach(entry => {
      const label = document.createElement('label');
      const check = document.createElement('input');
      check.type = 'checkbox'; check.name = 'entry'; check.value = entry.key;
      const text = document.createElement('span'); text.textContent = entry.label;
      label.append(check, text); eraseList.append(label);
    });
    get('calendarEraseSubmit').disabled = true;
    eraseDialog.showModal();
  }

  eraseList.addEventListener('change', () => {
    const count = eraseList.querySelectorAll('input:checked').length;
    const submit = get('calendarEraseSubmit');
    submit.disabled = !count;
    submit.textContent = count ? 'Esborrar seleccionats (' + count + ')' : 'Esborrar seleccionats';
  });
  eraseForm.addEventListener('submit', event => {
    event.preventDefault();
    const keys = [...eraseList.querySelectorAll('input:checked')].map(input => input.value);
    if (!keys.length) return;
    if (removeEntries(eraseDate, keys)) eraseDialog.close();
  });
  get('calendarEraseCancel').addEventListener('click', () => eraseDialog.close());

  function paint(date) {
    if (mode === 'erase') { erase(date); return; }
    const selected = select.value;
    if (selected === 'BC' || selected === 'extension-bc') { message('La bossa de coeficient es gestiona a «Torn» → «BC · Coeficients».', true); return; }
    if (window.GuardiaHourConcepts?.isConcept?.(selected)) {
      const result = window.GuardiaHourConcepts.paint(date, selected, hoursField.value, get('calendarPaintDestination').value);
      if (result.cancelled) return;
      if (!result.ok) { message(result.text, true); return; }
      selectedYear = policeYear(new Date(date + 'T12:00:00'));
      render();
      message(result.text);
      return;
    }
    const type = state.types.find(item => item.id === selected);
    const preset = leavePresets[selected];
    const existingLeave = state.leave[date];
    const existingTypes = shiftTypesForDate(date);
    const hours = (preset || selected.startsWith('extension-')) ? parseHours(hoursField.value) : 0;
    if ((preset || selected.startsWith('extension-')) && (!Number.isFinite(hours) || hours <= 0 || hours > 24)) {
      message('Posa les hores entre 0:01 i 24:00, per exemple 2:30.', true);
      return;
    }
    if (!type && selected !== 'F' && !preset && !selected.startsWith('extension-')) return;
    if (selected === 'F' && existingLeave) {
      message('Aquest dia té un permís. Obre la fitxa per gestionar-lo abans de posar Festa.', true);
      return;
    }
    if (type && existingLeave) {
      if (!combinableLeave.has(existingLeave.category)) {
        message('Aquest dia té un permís incompatible. Obre la fitxa del dia per gestionar-lo.', true);
        return;
      }
    }
    if (preset) {
      if (existingLeave?.category === 'bc') { message('Gestiona primer aquest moviment de BC a «Torn» → «BC · Coeficients».', true); return; }
      if (existingLeave && existingLeave.category !== preset.category) {
        message('Ja hi ha un altre permís aquest dia. Obre la fitxa per editar-lo.', true);
        return;
      }
      if (preset.category === 'remainder' && existingTypes.length) {
        message('R necessita un dia sense torn de feina. Obre la fitxa o treu el torn primer.', true);
        return;
      }
    }
    if (type && addMode && [state.assignments[date], ...(state.extraAssignments[date] || [])].includes(type.id)) {
      message('Aquest torn ja consta el ' + displayDate(date) + '.');
      return;
    }
    const old = snapshot(date);
    let action;
    if (selected === 'F') {
      delete state.assignments[date];
      delete state.extraAssignments[date];
      delete state.shiftHoursOverrides[date];
      state.cycleRest[date] = true;
      action = state.restType.name;
    } else if (preset) {
      state.leave[date] = { category: preset.category, hours, note: existingLeave?.note || '' };
      delete state.cycleRest[date];
      action = selected + ' · ' + hoursText(hours);
    } else if (selected.startsWith('extension-')) {
      state.accruals = [...state.accruals, { id: crypto.randomUUID(), date, category: selected.slice(-2), hours, note: '', kind: 'extension' }];
      action = 'P ' + selected.slice(-2).toUpperCase() + ' · +' + hoursText(hours);
    } else {
      if (addMode && state.assignments[date]) {
        state.extraAssignments[date] = [...(state.extraAssignments[date] || []), type.id];
        action = type.name + ' afegit';
      } else {
        state.assignments[date] = type.id;
        delete state.extraAssignments[date];
        delete state.shiftHoursOverrides[date];
        action = type.name;
      }
      delete state.cycleRest[date];
    }
    if (!save({silent:true})) {
      restore(date, old);
      message('No s’ha pogut desar. Torna-ho a provar.', true);
      return;
    }
    selectedYear = policeYear(new Date(date + 'T12:00:00'));
    render();
    try { renderCitations(); } catch (error) { console.error('Error actualitzant els totals', error); }
    message('✓ ' + displayDate(date) + ' · ' + action + ' desat.');
  }

  get('days').addEventListener('click', event => {
    const day = event.target.closest('button.day[data-calendar-date]');
    if (!day || !get('days').contains(day)) return;
    if (mode === 'comments') {
      event.preventDefault();
      event.stopImmediatePropagation();
      selected = new Date(day.dataset.calendarDate + 'T12:00:00');
      window.GuardiaComments?.openNewDate(day.dataset.calendarDate);
      return;
    }
    if (mode === 'edit') {
      get('dayEditForm').hidden = false;
      get('dayIntervals').hidden = false;
      get('calendarConsultDetails').hidden = true;
      return;
    }
    if (mode === 'consult') {
      get('dayEditForm').hidden = true;
      get('dayEditFeedback').hidden = true;
      get('dayIntervals').hidden = true;
      const details = get('calendarConsultDetails');
      details.replaceChildren();
      const rows = dayContents(day.dataset.calendarDate);
      const list = document.createElement('ul');
      for (const line of rows.length ? rows : ['Cap registre assignat.']) {
        const item = document.createElement('li'); item.textContent = line; list.append(item);
      }
      details.append(list);
      details.hidden = false;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    selected = new Date(day.dataset.calendarDate + 'T12:00:00');
    paint(day.dataset.calendarDate);
  }, true);
  select.addEventListener('change', () => {
    mode = select.value === '__choose__' ? 'edit' : 'paint';
    if (window.GuardiaHourConcepts?.isConcept?.(select.value)) hoursField.value = '1:00';
    feedback.hidden = true;
    updateControls();
  });
  select.addEventListener('focus', refresh);
  undoButton.addEventListener('click', () => window.GuardiaUndo?.undo());
  for (const [button, target] of [[editButton, 'edit'], [consultButton, 'consult'], [eraseButton, 'erase'], [commentsButton, 'comments']]) button.addEventListener('click', () => {
    mode = target;
    select.value = '__choose__';
    addMode = false;
    feedback.hidden = true;
    updateControls();
  });
  document.querySelector('nav button[data-screen="calendar"]')?.addEventListener('click', refresh);
  window.GuardiaCalendarMessage = message;
  window.refreshCalendarBrush = refresh;
  refresh();
})();
