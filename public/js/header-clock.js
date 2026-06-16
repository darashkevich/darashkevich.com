(function () {
  function updateHeaderClock() {
    var datetimeEl = document.getElementById('header-datetime');
    var timeEl = document.getElementById('header-time');
    if (!timeEl) return;

    var now = new Date();
    if (datetimeEl && 'dateTime' in datetimeEl) {
      datetimeEl.dateTime = now.toISOString();
    }
    timeEl.textContent = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now);

    var dateEl = document.getElementById('header-date');
    if (dateEl) {
      dateEl.textContent = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(now);
    }
  }

  updateHeaderClock();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateHeaderClock);
  }
  window.setInterval(updateHeaderClock, 1000);
})();
