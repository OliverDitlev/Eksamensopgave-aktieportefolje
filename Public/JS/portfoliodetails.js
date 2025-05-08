// portofoliodetails javascript
let timer;
function debounce (fn, wait=300) {
    clearTimeout(timer);
    timer = setTimeout(fn, wait);
}    console.log(' generel.js er loadet1');
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

  

function openRegisterTrade() {
    document.getElementById('registertrade').classList.remove('hidden');
}
function closeRegisterTrade() {
    document.getElementById('registertrade').classList.add('hidden');
}
console.log(' generel.js er loadet');

document.addEventListener('DOMContentLoaded', () => {
    const balance = Number(document.getElementById('avalbalance').dataset.availbalance);
  
    const volume = document.querySelector('#formAddportfolio input[name="volume"]');
    const price = document.querySelector('#formAddportfolio input[name="price"]');
    const submit = document.querySelector('#formAddportfolio button[type="submit"]');
  
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
  const pie = document.getElementById('portofoliopie');
  if (pie) {
    const chart = echarts.init(pie);
    chart.setOption({
      backgroundColor: '#2e2e2e', // mørk baggrund
      title: {
        text: `Distribution in Portfolio`,
        left: 'center',
        top: 10,
        textStyle: {
          color: '#ffffff',
          fontSize: 22,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} DKK ({d}%)',
        backgroundColor: '#444',
        textStyle: {
          color: '#fff'
        }
      },
      legend: {
        show: true,
        orient: 'vertical',
        right: 20,
        top: 60,
        textStyle: {
          color: '#ffffff',
          fontSize: 14
        }
      },
      series: [
        {
          name: 'Portfolios',
          type: 'pie',
          radius: ['40%', '70%'], // donut
          center: ['50%', '55%'],
          data: pieChartData,
          label: {
            formatter: '{b}: {d}%',
            color: '#fff',
            fontSize: 14
          },
          labelLine: {
            length: 20,
            length2: 10,
            lineStyle: {
              color: '#999'
            }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 15,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.4)'
            }
          }
        }
      ]
    });
  }

const history12mo = window.history12

const chartContainer = document.getElementById('historyChart')

const myChart = echarts.init(chartContainer);
const labels = history12.map(entry => entry.history);

const values = history12.map(entry => entry.value);

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