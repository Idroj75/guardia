// An iCalendar alarm is handled by the phone after the user imports the event.
// Keep court identifiers and other sensitive details out of the exported file.
(() => {
  const button = document.getElementById('exportCitationReminder');
  const hint = document.getElementById('exportCitationReminderHint');
  const picker = document.getElementById('citationForm')?.elements.reminderDays;
  if (!button || !hint || !picker) return;

  const oldSave = document.getElementById('citationForm').onsubmit;
  document.getElementById('citationForm').onsubmit = function (event) {
    const days = Number(picker.value);
    oldSave.call(this, event);
    if (document.getElementById('citationEditor').hidden && days > 0) {
      const feedback = document.getElementById('citationFeedback');
      feedback.textContent = '✓ Citació desada. Per rebre l’avís amb l’app tancada, obre la seva configuració i afegeix-la al calendari del mòbil.';
    }
  };

  function escapeText(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }

  function calendarFile(court, days) {
    const date = court.date.replace(/-/g, '');
    const time = court.time.replace(':', '') + '00';
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    // Floating local time: the phone's Calendar interprets this as local wall time.
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Guardia//Judicis//CA',
      'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + court.id.replace(/[^a-zA-Z0-9-]/g, '') + '@guardia-local',
      'DTSTAMP:' + stamp, 'DTSTART:' + date + 'T' + time,
      'DURATION:PT1H', 'SUMMARY:' + escapeText('Judici'),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escapeText('Tens un judici proper'),
      'TRIGGER:-P' + days + 'D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'
    ];
    return new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  }

  button.addEventListener('click', async () => {
    const court = state.citations.find(item => item.id === activeCitation);
    const days = Number(court?.reminderDays);
    if (!court || !/^\d{4}-\d{2}-\d{2}$/.test(court.date) || !/^\d{2}:\d{2}$/.test(court.time)) return;
    if (!Number.isInteger(days) || days < 1 || days > 7) {
      hint.textContent = 'Edita el judici i tria entre 1 i 7 dies abans per activar l’avís.';
      return;
    }
    const file = new File([calendarFile(court, days)], 'judici-' + court.date + '.ics', { type: 'text/calendar' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        hint.textContent = 'Obre el fitxer i afegeix l’esdeveniment al calendari; comprova que hi surt l’avís ' + days + ' dies abans.';
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    hint.textContent = 'Fitxer preparat. Obre’l i afegeix l’esdeveniment al calendari; comprova que hi surt l’avís ' + days + ' dies abans.';
  });
})();
