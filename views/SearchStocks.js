'use strict';

const API_KEY = 'Q7DZ145NE084VB0O';

const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('results');

// Funktion til at søge efter aktier
function searchStocks(query) {
  const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      resultsList.innerHTML = '';

      if (!data.bestMatches) {
        resultsList.innerHTML = '<li>No matches found</li>';
        return;
      }

      data.bestMatches.forEach(match => {
        const symbol = match['1. symbol'];
        const name = match['2. name'];
        const region = match['4. region'];

        const listItem = document.createElement('li');

        // Make clickable
        listItem.innerHTML = `<strong>${symbol}</strong> - ${name} (${region})`;
        listItem.style.cursor = 'pointer'; // Gør det tydeligt at man kan klikke

        listItem.addEventListener('click', () => {
          onCompanyClick(symbol);
        });

        resultsList.appendChild(listItem);
      });
    })
    .catch(error => {
      console.error('Error fetching stock data:', error);
      resultsList.innerHTML = '<li>Error fetching data</li>';
    });
}

// Når man klikker på en virksomhed
function onCompanyClick(symbol) {
  console.log('You clicked:', symbol);

  // Her kan vi lave mere fancy ting, fx hente aktiekurser
  alert(`You selected: ${symbol}`);
}

// Event listener på inputfeltet
searchInput.addEventListener('input', function() {
  const query = searchInput.value.trim();

  if (query.length < 2) {
    resultsList.innerHTML = '';
    return;
  }

  searchStocks(query);
});
