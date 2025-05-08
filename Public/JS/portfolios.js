//portofolios javascript
function openCreatePortfolio() {
    document.getElementById('createPortfolioPopup').classList.remove('hidden');
}
function closeCreatePortfolio() {
    document.getElementById('createPortfolioPopup').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    // Tilføjer eventlisteners til alle "Sell"-knapper
    const sellButtons = document.querySelectorAll('button.popupform[onclick^="openSellTrade"]');
    sellButtons.forEach(button => {
        button.addEventListener('click', event => {
            const ticker = button.getAttribute('data-ticker');
            const company = button.getAttribute('data-company');
            const maxVolume = button.getAttribute('data-volume');
            const price = button.getAttribute('data-price');
            const currency = button.getAttribute('data-currency');

            openSellTrade(ticker, company, maxVolume, price, currency);
        });
    });

    // Lukker popup, når der klikkes på "X"-knappen
    const closeSellButton = document.getElementById('closeformbtn');
    if (closeSellButton) {
        closeSellButton.addEventListener('click', closeSellTrade);
    }
});

// Åbner popup-formularen til at sælge aktier
function openSellTrade(ticker, company, maxVolume, price, currency) {
    document.getElementById('sellTickerField').value = ticker;
    document.getElementById('sellCompanyField').value = company;
    document.getElementById('sellVolumeField').max = maxVolume;
    document.getElementById('sellPriceField').value = price;
    document.getElementById('sellCurrencyField').value = currency;

    document.getElementById('selltrade').classList.remove('hidden');
}

// Lukker popup-formularen til at sælge aktier
function closeSellTrade() {
    document.getElementById('selltrade').classList.add('hidden');
}

////portofolios javascript
function openCreatePortfolio() {
    document.getElementById('createPortfolioPopup').classList.remove('hidden');
}
function closeCreatePortfolio() {
    document.getElementById('createPortfolioPopup').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    // Tilføjer eventlisteners til alle "Sell"-knapper
    const sellButtons = document.querySelectorAll('button.popupform[onclick^="openSellTrade"]');
    sellButtons.forEach(button => {
        button.addEventListener('click', event => {
            const ticker = button.getAttribute('data-ticker');
            const company = button.getAttribute('data-company');
            const maxVolume = button.getAttribute('data-volume');
            const price = button.getAttribute('data-price');
            const currency = button.getAttribute('data-currency');

            openSellTrade(ticker, company, maxVolume, price, currency);
        });
    });

    // Lukker popup, når der klikkes på "X"-knappen
    const closeSellButton = document.getElementById('closeformbtn');
    if (closeSellButton) {
        closeSellButton.addEventListener('click', closeSellTrade);
    }
});

// Åbner popup-formularen til at sælge aktier
function openSellTrade(ticker, company, maxVolume, price, currency) {
    document.getElementById('sellTickerField').value = ticker;
    document.getElementById('sellCompanyField').value = company;
    document.getElementById('sellVolumeField').max = maxVolume;
    document.getElementById('sellPriceField').value = price;
    document.getElementById('sellCurrencyField').value = currency;

    document.getElementById('selltrade').classList.remove('hidden');
}

// Lukker popup-formularen til at sælge aktier
function closeSellTrade() {
    document.getElementById('selltrade').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
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
  
