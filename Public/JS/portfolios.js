// Portfolios javascript

// Åbner popup-formularen til at oprette en ny portefølje
function openCreatePortfolio() {
    document.getElementById('createPortfolioPopup').classList.remove('hidden');
}

// Lukker popup-formularen til at oprette en ny portefølje
function closeCreatePortfolio() {
    document.getElementById('createPortfolioPopup').classList.add('hidden');
}


document.addEventListener('DOMContentLoaded', () => {
    // Laver samlet pie chart til alle porteføljer
    const pie = document.getElementById('portofoliopie');
    if (!pie) return;
  
    const pieChartData = pieData.map(p => ({
      name: p.portfolio_name,
      value: p.total_current_value
    }));
  
    const chart = echarts.init(pie);
    chart.setOption({
      title: {
        text: `Distrubution in portfolio`,
        left: 'left',
        top: 5,
        textStyle: {
          color: '#ffffff',
          fontSize: 20
        }
      },
      tooltip: { trigger: 'item', formatter: '{b}: {c} DKK ({d}%)' },
      series: [{
        name: 'Portfolios',
        type: 'pie',
        radius: ['35%', '60%'],
        data: pieChartData,
        label: {
          color: '#ffffff',
          formatter: '{b}: {d}%'
        },
        top: 30,
        left: -100
      }]
    });
  });
  
