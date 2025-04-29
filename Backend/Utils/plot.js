document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('stockChart').getContext('2d');
  
    const labels = ['I dag', ...Array.from({ length: 12 }, (_, i) => `${12 - i} mdr siden`)];
    const prices = [currentPrice, ...monthlyPrices];
  
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `Kurs for ${symbol}`,
          data: prices,
          borderColor: 'blue',
          borderWidth: 2,
          fill: false,
          tension: 0.3,
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    });
  });
  