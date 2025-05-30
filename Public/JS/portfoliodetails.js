// Portfoliodetails javascript

let timer;

// Funktion til at delaye kaldet til at søge efter aktier
function debounce (fn, wait=300) {
  clearTimeout(timer);
  timer = setTimeout(fn, wait);
}    console.log(' generel.js er loadet1');

// Søger efter aktier baseret på input fra søgefeltet
function searchStock () {
  const query = document.getElementById('searchstock').value.trim();
  
  const select = document.getElementById('stockOptions');

  if (query.length < 2) {
    select.style.display = 'none';       
    return;
  }
  
  fetch('/api/symbols?query=' + encodeURIComponent(query))
  .then(res => res.json())
  .then(data => {
    select.innerHTML = '';
    if (data.length) {
      data.forEach(stock => {
        const option = document.createElement('option');
        option.value = JSON.stringify(stock);
        option.textContent = `${stock.name} (${stock.ticker})`
        option.addEventListener('click', () => selectStock(option));
        select.appendChild(option);
      });
      select.style.display = 'block';
    } else {
      select.style.display = 'none';
    }
  });
};
  
console.log(' generel.js er loadet2');

// Vælger aktien fra dropdown-menuen
async function selectStock(selectElement) {

  const selected = JSON.parse(selectElement.value);
  document.getElementById('searchstock').value = selected.name;
  document.getElementById('tickerField').value = selected.ticker;
  document.getElementById('companyField').value = selected.name;
  document.getElementById('currencyField').value = selected.currency;
  document.getElementById('stockOptions').style.display = 'none';

  try{

    const res = await fetch(`/api/stockinfo?company=${encodeURIComponent(selected.name)}`)
    const data = await res.json()
    document.getElementById('dailyPrices').value = JSON.stringify(data.daily);
    document.getElementById('monthlyPrices').value = JSON.stringify(data.monthly);
  }catch(err){
    console.error('Stock info error', err);
  }
};

// Åbner popup-formularen til at registrere aktier
function openRegisterTrade() {
    document.getElementById('registertrade').classList.remove('hidden');
}

// Lukker popup-formularen til at registrere aktier
function closeRegisterTrade() {
    document.getElementById('registertrade').classList.add('hidden');
}
console.log(' generel.js er loadet');

// Laver eventlistener til at tage imod input fra registreringsformularen
document.addEventListener('DOMContentLoaded', () => {
    const balance = Number(document.getElementById('avalbalance').dataset.availbalance);
  
    const volume = document.querySelector('#formAddportfolio input[name="volume"]');
    const price = document.querySelector('#formAddportfolio input[name="price"]');
    const submit = document.querySelector('#formAddportfolio button[type="submit"]');

    // Hvis prisen er højere end saldoen, så deaktiverer knappen
    function validate () {
      const vol = Number(volume.value);
      const priceup = Number(price.value);
      const cost = vol * priceup;
  
      if (!vol || !priceup) {
        submit.disabled = true;
        return;
      }
      submit.disabled = cost > balance;
    }
  
    volume.addEventListener('input', validate);
    price.addEventListener('input', validate);
    console.log(' generel.js er loadet3');
  
    validate(); // Kør ved load
  });

  // Laver pie chart til en portefølje
  const pie = document.getElementById('portfoliopiestocks');
  if (pie) {
    const chart = echarts.init(pie);
    chart.setOption({
      title: {
        text: 'Portfolio distribution',
        left: 0,
        top: 15,
        textStyle: {
          color: '#ffffff',
          fontSize: 20,
          top: 10
        }
      },
      tooltip: { 
        trigger: 'item', 
        formatter: '{b}: {c} ({d}%)' 
      },
      series: [{
        type: 'pie',
        radius: ['35%', '60%'],
        data: pieChartData,
        label: { formatter: '{b}: {d}%' },
        top: 30,
        left: -100
      }]
    });
  }

const history12mo = window.history12

const chartContainer = document.getElementById('historyChart')

const myChart = echarts.init(chartContainer);
const labels = history12.map(entry => entry.history);

const values = history12.map(entry => entry.value);

// Laver graf til porteføljens aktiers udvikling
const option = {
  title: {
    text: 'Portfolio devolpment last 12 months',
    left: 'left',
    top: 15,
    textStyle: {
      color: '#ffffff',
      fontSize: 20,
      top: 10
    }
  },
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: labels,
    axisLabel: { color: '#ffffff' }
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#ffffff' }
  },
  series: [{
    data: values,
    type: 'line',
    smooth: true,
    itemStyle: { color: '#0059ff' }
  }]
};

myChart.setOption(option);
window.addEventListener('resize', () => myChart.resize());

// Åbner popup-formularen til at sælge aktier
function openSellTrade(ticker, company, maxVolume, price, currency) {
  document.getElementById('sellTickerField').value = ticker;
  document.getElementById('sellCompanyField').value = company;
  document.getElementById('sellVolumeField').max = maxVolume;
  document.getElementById('sellPriceField').value = price;
  document.getElementById('sellCurrencyField').value = currency;

  document.getElementById('currentPriceDisplay').textContent = price;
  document.getElementById('currentCurrencyDisplay').textContent = currency;

  document.getElementById('selltrade').classList.remove('hidden');
}

// Lukker popup-formularen til at sælge aktier
function closeSellTrade() {
  document.getElementById('selltrade').classList.add('hidden');
}