document.addEventListener('DOMContentLoaded', function () {
  const filters = document.querySelectorAll('.flight-filter');
  const rows = document.querySelectorAll('.flight-row');
  const cards = document.querySelectorAll('#flight-card-list article');

  if (filters.length === 0) return;

  function applyFilter(filter) {
    const match = function (el) {
      const confidence = el.getAttribute('data-confidence');
      const year = el.getAttribute('data-year');
      const decade = el.getAttribute('data-decade');

      if (filter === 'all') return true;
      if (filter === 'confirmed' || filter === 'partial' || filter === 'unresolved') {
        return confidence === filter;
      }
      if (filter.startsWith('year:')) {
        return year === filter.slice(5);
      }
      if (filter.startsWith('decade:')) {
        return decade === filter.slice(7);
      }
      return true;
    };

    rows.forEach(function (row) {
      row.classList.toggle('is-hidden', !match(row));
    });

    cards.forEach(function (card) {
      card.classList.toggle('is-hidden', !match(card));
    });
  }

  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      filters.forEach(function (item) {
        item.classList.remove('is-active');
      });
      button.classList.add('is-active');
      applyFilter(button.getAttribute('data-filter') || 'all');
    });
  });
});
