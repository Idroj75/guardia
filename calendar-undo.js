/* Keep the last five successfully saved states on this device, for this session. */
(() => {
  const history = [];
  const button = document.getElementById('calendarUndo');
  function refresh() {
    if (!button) return;
    button.disabled = !history.length;
    button.textContent = history.length ? '↶ Desfer (' + history.length + ')' : '↶ Desfer';
  }
  window.GuardiaUndo = {
    record(previous) {
      history.push(previous);
      if (history.length > 5) history.shift();
      refresh();
    },
    undo() {
      if (!history.length) return;
      const previous = history[history.length - 1];
      let restored;
      try {
        restored = JSON.parse(previous);
        if (!restored || !Array.isArray(restored.types) || !restored.assignments) throw new Error('Dades no vàlides');
        localStorage.setItem(storageKey, previous);
      } catch (error) {
        window.GuardiaCalendarMessage?.('No s’ha pogut desfer el canvi. Les dades continuen intactes.', true);
        return;
      }
      state = restored;
      history.pop();
      refresh();
      try { window.GuardiaHourConcepts?.refreshViews?.(); } catch (error) { console.error(error); }
      for (const fn of [render, renderTypes, renderSummary, renderCitations, renderService, renderProfileForm, renderBrand, renderCalendarTitle, renderPayroll, renderSpecialDays, renderOvertime, renderLeave, renderReports]) {
        try { fn(); } catch (error) { console.error('No s’ha pogut refrescar una vista després de desfer:', error); }
      }
      try { window.refreshCalendarBrush?.(); } catch (error) { console.error(error); }
      try { window.GuardiaComments?.refresh?.(); } catch (error) { console.error(error); }
      window.GuardiaCalendarMessage?.('✓ Canvi desfet. Pots desfer ' + history.length + (history.length === 1 ? ' canvi més.' : ' canvis més.'));
    }
  };
  refresh();
})();
