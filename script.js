const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => navLinks.classList.toggle('open'));
}

// Buscador de avances por semana
const searchInput = document.querySelector('#weekSearch');
const clearButton = document.querySelector('#clearSearch');
const weekCards = document.querySelectorAll('.week-card');

function getFirstMatchingWeek() {
  const value = searchInput.value.toLowerCase().trim();
  let firstMatch = null;
  weekCards.forEach(card => {
    const text = (card.dataset.week + ' ' + card.innerText).toLowerCase();
    const match = !value || text.includes(value);
    card.classList.toggle('hidden', !match);
    if (value && match && !firstMatch) firstMatch = card;
  });
  return firstMatch;
}

function filterWeeks() {
  getFirstMatchingWeek();
}

function goToWeekResult() {
  const firstMatch = getFirstMatchingWeek();
  if (firstMatch) {
    firstMatch.classList.add('open');
    const btn = firstMatch.querySelector('.read-more');
    if (btn) btn.textContent = 'Ocultar avances generales';
    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

if (searchInput) {
  searchInput.addEventListener('input', filterWeeks);
  searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      goToWeekResult();
    }
  });
}
if (clearButton) clearButton.addEventListener('click', () => {
  searchInput.value = '';
  weekCards.forEach(card => card.classList.remove('hidden'));
  searchInput.focus();
});

// Tarjetas desplegables generales
const expandableCards = document.querySelectorAll('.expandable-card');
expandableCards.forEach(card => {
  const btn = card.querySelector('.expand-btn');
  btn?.addEventListener('click', () => {
    card.classList.toggle('open');
    const icon = btn.querySelector('b');
    if (icon) icon.textContent = card.classList.contains('open') ? '−' : '+';
  });
});

// Avances expandibles
const expandableWeeks = document.querySelectorAll('.expandable-week');
expandableWeeks.forEach(card => {
  const btn = card.querySelector('.read-more');
  btn?.addEventListener('click', () => {
    card.classList.toggle('open');
    btn.textContent = card.classList.contains('open') ? 'Ocultar avances generales' : 'Ver avances generales';
  });
});

// Buscador de integrantes y detalle personal
const memberSearch = document.querySelector('#memberSearch');
const clearMemberSearch = document.querySelector('#clearMemberSearch');
const memberCards = document.querySelectorAll('.expandable-member');
const teamGrid = document.querySelector('#teamGrid');
const noResults = document.createElement('div');
noResults.className = 'no-results';
noResults.textContent = 'No se encontró ningún integrante con esa búsqueda.';

function getFirstMatchingMember() {
  const value = memberSearch.value.toLowerCase().trim();
  let matches = 0;
  let firstMatch = null;
  memberCards.forEach(card => {
    const text = (card.dataset.member + ' ' + card.innerText).toLowerCase();
    const match = !value || text.includes(value);
    card.classList.toggle('hidden', !match);
    card.classList.toggle('highlight', Boolean(value && match));
    if (value && match) card.classList.add('open');
    if (!value) card.classList.remove('highlight');
    if (match) matches++;
    if (value && match && !firstMatch) firstMatch = card;
  });
  if (teamGrid) {
    if (matches === 0 && !teamGrid.contains(noResults)) teamGrid.appendChild(noResults);
    if (matches > 0 && teamGrid.contains(noResults)) noResults.remove();
  }
  return firstMatch;
}

function filterMembers() {
  getFirstMatchingMember();
}

function goToMemberResult() {
  const firstMatch = getFirstMatchingMember();
  if (firstMatch) {
    firstMatch.classList.add('open', 'highlight');
    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

if (memberSearch) {
  memberSearch.addEventListener('input', filterMembers);
  memberSearch.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      goToMemberResult();
    }
  });
}
if (clearMemberSearch) clearMemberSearch.addEventListener('click', () => {
  memberSearch.value = '';
  memberCards.forEach(card => {
    card.classList.remove('hidden', 'highlight');
  });
  if (teamGrid?.contains(noResults)) noResults.remove();
  memberSearch.focus();
});

memberCards.forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('open'));
});
