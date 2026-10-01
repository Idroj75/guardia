/* Personal notes for individual calendar dates, stored with the existing backup data. */
(() => {
  const $id = id => document.getElementById(id);
  const form = $id('commentForm');
  if (!form) return;
  if (!Array.isArray(state.dayComments)) state.dayComments = [];
  const rows = () => Array.isArray(state.dayComments) ? state.dayComments : [];
  const today = () => key(new Date());
  const cutoff = () => { const now = new Date(); return key(new Date(now.getFullYear(),now.getMonth(),now.getDate()-7)); };
  const daysPast = date => Math.round((Date.parse(today())-Date.parse(date))/86400000);
  const start = $id('commentStart');
  const end = $id('commentEnd');
  const shift = $id('commentShift');
  const input = $id('commentText');
  const priority = $id('commentPriority');
  const list = $id('commentList');
  const feedback = $id('commentFeedback');
  const dialog = $id('commentDialog');
  let noticeTimer;

  function notice(message, error = false) {
    clearTimeout(noticeTimer);
    feedback.textContent = message;
    feedback.hidden = false;
    feedback.classList.toggle('error', error);
    noticeTimer = setTimeout(() => { feedback.hidden = true; }, 5000);
  }

  function reset(date = today()) {
    form.reset();
    $id('commentEditId').value = '';
    start.value = end.value = date;
    $id('commentSave').textContent = 'Desar comentari';
    $id('commentCancel').hidden = true;
    feedback.hidden = true;
    refreshShiftOptions();
  }

  function refreshShiftOptions() {
    const previous = shift.value || 'all';
    shift.replaceChildren(new Option('Tots els dies de l’interval', 'all'));
    for (const type of state.types) shift.add(new Option('Només dies amb ' + type.name, type.id));
    shift.value = [...shift.options].some(option => option.value === previous) ? previous : 'all';
    shift.disabled = Boolean($id('commentEditId').value);
  }

  function addText(parent, tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }

  function button(parent, text, callback, className) {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = text;
    if (className) node.className = className;
    node.addEventListener('click', callback);
    parent.append(node);
  }

  function openDate(date) {
    const [year, month] = date.split('-').map(Number);
    current = new Date(year, month - 1, 1);
    document.querySelector('nav button[data-screen="calendar"]').click();
    render();
    $id('calendarPaintEdit').click();
    document.querySelector('#days button[data-calendar-date="' + date + '"]')?.click();
    $id('dayIntervals').open = true;
  }

  function edit(row) {
    if (row.date < today()) return;
    reset(row.date);
    $id('commentEditId').value = row.id;
    input.value = row.text;
    priority.value = String(Number(row.priority) || 0);
    $id('commentSave').textContent = 'Desar els canvis';
    $id('commentCancel').hidden = false;
    shift.disabled = true;
    dialog.showModal();
    input.focus({preventScroll:true});
  }

  function expireOldTickets() {
    const previous = rows(),active = previous.filter(row => row.date >= cutoff());
    if (active.length === previous.length) return false;
    try {
      localStorage.setItem(storageKey,JSON.stringify({...state,dayComments:active}));
      state.dayComments = active;
      return true;
    } catch (error) {
      console.error('No s’han pogut eliminar els tickets caducats.',error);
      return false;
    }
  }

  function remove(row) {
    if (!confirm('Eliminar el ticket del ' + displayDate(row.date) + '?')) return;
    const previous = rows();
    state.dayComments = previous.filter(item => item.id !== row.id);
    if (!save({silent:true})) { state.dayComments = previous; alert('No s’ha pogut eliminar el ticket.'); return; }
    render();
    refresh();
  }

  function refresh() {
    if (expireOldTickets()) render();
    if ($id('commentEditId').value && !rows().some(row => row.id === $id('commentEditId').value)) reset();
    refreshShiftOptions();
    const filtered = rows().filter(row => row.date >= cutoff());
    filtered.sort((a,b) => a.date.localeCompare(b.date) || (Number(b.priority) || 0) - (Number(a.priority) || 0) || a.text.localeCompare(b.text));
    list.replaceChildren();
    const past = filtered.filter(row => row.date < today()).length;
    $id('commentCount').textContent = filtered.length + (filtered.length === 1 ? ' ticket' : ' tickets') + (past ? ' · ' + past + (past === 1 ? ' pendent dels últims 7 dies' : ' pendents dels últims 7 dies') : ' d’avui en endavant');
    if (!filtered.length) { addText(list,'p','No tens cap ticket pendent ni futur.','sub'); return; }
    let lastDate = '';
    for (const row of filtered) {
      const overdue = row.date < today();
      if (row.date !== lastDate) {
        addText(list,'h4',displayDate(row.date) + (overdue ? ' · passat' : ''),'comment-date'+(overdue?' comment-date-past':''));
        lastDate = row.date;
      }
      const card = document.createElement('article');
      const level = Math.max(0, Math.min(3, Number(row.priority) || 0));
      card.className = 'comment-card comment-priority-' + level + (overdue ? ' comment-expired' : '');
      addText(card,'strong',level ? '★'.repeat(level) + ' · ' + (level === 3 ? 'Molt important' : level === 2 ? 'Important' : 'Poc important') : 'Comentari','comment-priority-label');
      addText(card,'p',row.text,'comment-body');
      if (overdue) {
        const remaining = 8-daysPast(row.date);
        addText(card,'small','S’eliminarà automàticament d’aquí a ' + remaining + (remaining === 1 ? ' dia.' : ' dies.'),'comment-expiry');
      }
      const actions = document.createElement('div');
      actions.className = 'comment-card-actions';
      if (overdue) button(actions,'Eliminar',()=>remove(row),'comment-danger');
      else button(actions,'Veure i editar al calendari',()=>openDate(row.date));
      card.append(actions);
      list.append(card);
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    const level = Number(priority.value);
    if (!Number.isInteger(level) || level < 0 || level > 3) { notice('Tria entre 0 i 3 estrelles.', true); return; }
    const dates = intervalDates(start.value, end.value);
    const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && key(new Date(date + 'T12:00:00')) === date;
    if (!validDate(start.value) || !validDate(end.value) || !dates) { notice('Revisa les dates. L’interval màxim és de 366 dies.', true); return; }
    if (!text) { notice('Escriu el comentari abans de desar-lo.', true); return; }
    const editId = $id('commentEditId').value;
    const previous = rows();
    if (editId) {
      const original = previous.find(row => row.id === editId);
      if (!original) { notice('Aquest comentari ja no existeix. Torna a carregar el llistat.',true); return; }
      if (original.date < today()) { notice('Un ticket passat només es pot eliminar.',true); return; }
      if (dates.length !== 1) { notice('Per editar un comentari, tria un sol dia.',true); return; }
      state.dayComments = previous.map(row => row.id === editId ? {...row,date:dates[0],text,priority:level} : row);
    } else {
      const chosen = dates.filter(date => shift.value === 'all' || [state.assignments[date], ...(state.extraAssignments[date] || [])].includes(shift.value));
      if (!chosen.length) { notice('No hi ha dies amb aquest torn dins l’interval.',true); return; }
      if (chosen.some(date => date < today())) { notice('No es poden crear tickets en dies passats.',true); return; }
      state.dayComments = [...previous,...chosen.map(date => ({id:crypto.randomUUID(),date,text,priority:level}))];
    }
    if (!save({silent:true})) { state.dayComments = previous; notice('No s’ha pogut desar el comentari.',true); return; }
    const count = state.dayComments.length - previous.length;
    const first = editId ? dates[0] : state.dayComments[previous.length]?.date || dates[0];
    reset(first);
    render();
    refresh();
    if (dialog.open) dialog.close();
    notice(editId ? 'Canvis desats.' : 'Comentari desat a ' + count + (count === 1 ? ' dia.' : ' dies.'));
  });

  function decorateDay(day,date) {
    const items = rows().filter(row => row.date === date);
    const count = items.length;
    if (!count) return;
    const level = Math.max(0,...items.map(row => Number(row.priority) || 0));
    const marker = document.createElement('span');
    marker.className = 'comment-marker comment-priority-' + level + (date < today() ? ' comment-expired' : '');
    marker.textContent = level ? '★'.repeat(level) : '✎' + (count > 1 ? ' ' + count : '');
    marker.title = count + (count === 1 ? ' comentari' : ' comentaris') + (level ? ' · prioritat ' + level + ' de 3' : ' · sense estrelles');
    marker.setAttribute('aria-label',marker.title);
    day.append(marker);
  }

  $id('calendarCommentsShortcut').addEventListener('click', () => {
    const selectedDate = selected instanceof Date && selected.getFullYear() === current.getFullYear() && selected.getMonth() === current.getMonth() ? key(selected) : today();
    const date = selectedDate < today() ? today() : selectedDate;
    reset(date);
    dialog.showModal();
    input.focus({preventScroll:true});
  });
  $id('commentDialogClose').addEventListener('click', () => dialog.close());
  $id('commentCancel').addEventListener('click', () => { reset(); dialog.close(); });
  window.GuardiaComments = {decorateDay,refresh,openEdit(id){const row=rows().find(item=>item.id===id);if(row)edit(row)}};
  reset();
  refresh();
  render();
  let lastToday = today();
  setInterval(() => { if (today() !== lastToday) { lastToday = today(); refresh(); render(); } },60000);
})();
