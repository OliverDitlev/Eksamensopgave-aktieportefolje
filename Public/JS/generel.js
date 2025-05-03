// account javascript
document.addEventListener('DOMContentLoaded', () => {
const popupform = document.getElementById('popupform');
const balancepopup = document.getElementById('balancepopup');
const openformbtn = document.getElementById('openformbtn');
const closeformbtn = document.getElementById('closeformbtn');
const closebalancebtn = document.getElementById('closebalancebtn');
const changebalancebtns = document.querySelectorAll('#changebalancebtn');
const accountIdHidden = document.getElementById('accountIdHidden');
const chartElement = document.getElementById('chartinUSDandDKK');
const deleteledgerbtns = document.querySelectorAll('#deletebtn');
const toggleAccountBtns = document.querySelectorAll('.toggleAccountBtn');
const accountsdash = document.querySelector('.accountsdash');
const seeHistoryBtn = document.getElementById('historybtn')

let formopen = false;
function formpopup() {
    if (formopen) {
        popupform.classList.add('hidden');
    } else {
        popupform.classList.remove('hidden');
    }
    formopen = !formopen;
}
openformbtn.addEventListener('click', formpopup);
closeformbtn.addEventListener('click', formpopup);
window.addEventListener('click', event => {
    if (event.target === popupform) formpopup();
});

let balanceopen = false;
function balancepopupToggle(accountId = null) {
    if (balanceopen) {
        balancepopup.classList.add('hidden');
        accountsdash.classList.add('hidden');
    } else {
        balancepopup.classList.remove('hidden');
        accountsdash.classList.remove('hidden');
        if (accountId) {
            accountIdHidden.value = accountId;
        }
    }
    balanceopen = !balanceopen;
}
changebalancebtns.forEach(btn => {
    btn.addEventListener('click', event => {
        const accountId = event.currentTarget.dataset.accountid;
        balancepopupToggle(accountId);
    });
});
closebalancebtn.addEventListener('click', () => balancepopupToggle());
window.addEventListener('click', event => {
    if (event.target === balancepopup) balancepopupToggle();
});

deleteledgerbtns.forEach(btn => {
    btn.addEventListener('click', async event => {
        const accountID = event.currentTarget.dataset.accountid;
        try {
            await fetch('/deleteaccount', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountID })
            });
            window.location.reload();
        } catch (err) {
            console.error('Could not delete account', err);
        }
    });
});

toggleAccountBtns.forEach(btn => {
    btn.addEventListener('click', async event => {
        const accountID = event.currentTarget.dataset.accountid;
        const action = event.currentTarget.dataset.action;
        try {
            await fetch(`/${action}account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountID })
            });
            window.location.reload();
        } catch (err) {
            console.error(`Could not ${action} account`, err);
        }
    });
});

seeHistoryBtn.addEventListener('click', () => {
    window.location.href = '/transactionhistory';
});

const sumDKK = Number(chartElement.dataset.sumdkk);
const sumUSD = Number(chartElement.dataset.sumusd);
const sumGBP = Number(chartElement.dataset.sumgbp);
const totalValueDKK = sumDKK + (sumUSD * 7.5) + (sumGBP * 9);

const chart = echarts.init(chartElement);
const option = {
    title: {
        text: `Currency Overview\n\n\n\n\n\n\n\nTotal in DKK: ${totalValueDKK}`,
        left: 'left',
        top: 10,
        textStyle: {
            color: '#ffffff',
            fontSize: 20
        }
    },
    series: [
        {
            type: 'pie',
            radius: '50%',
            data: [
                { value: sumDKK, name: `${sumDKK} DKK` },
                { value: sumUSD * 7.5, name: `${sumUSD} USD` },
                { value: sumGBP * 9, name: `${sumGBP} GBP` }
            ]
        }
    ]
};
chart.setOption(option);

});

// portofoliodetails javascript
let timer;
function debounce (fn, wait=300) {
    clearTimeout(timer);
    timer = setTimeout(fn, wait);
}
function searchStock () {
    const query = document.getElementById('searchstock').value.trim();
    
    const select = document.getElementById('stockOptions');

    if (query.length < 2) {
      select.style.display = 'none';       
      return;
    }
    debounce(() => {
      fetch('/api/symbols?query=' + encodeURIComponent(query))
        .then(res => res.json())
        .then(data => {
          select.innerHTML = '';
          if (data.length) {
            data.forEach(stock => {
              const option = document.createElement('option');
              option.value = JSON.stringify(stock);
              option.textContent = `${stock.name} (${stock.ticker})`;
              select.appendChild(option);
            });
            select.style.display = 'block';
          } else {
            select.style.display = 'none';
          }
        });
    });
  }
  
  function selectStock(selectElement) {
    const selected = JSON.parse(selectElement.value);
    document.getElementById('searchstock').value = selected.name;
    document.getElementById('tickerField').value = selected.ticker;
    document.getElementById('companyField').value = selected.name;
    document.getElementById('currencyField').value = selected.currency;
    document.getElementById('stockOptions').style.display = 'none';
  }
  
function openRegisterTrade() {
    document.getElementById('registertrade').classList.remove('hidden');
}
function closeRegisterTrade() {
    document.getElementById('registertrade').classList.add('hidden');
}

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
  
    validate(); // Kør ved load
  });
  const pie = document.getElementById('portofoliopie');
  if (pie) {
    const chart = echarts.init(pie);
    chart.setOption({
        title: {
            text: `Distrubution in portfolio`,
            left: 'left',
            top: 10,
            textStyle: {
                color: '#ffffff',
                fontSize: 20
            }
        },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius : ['35%', '55%'],
        data: pieChartData,
        label: { formatter: '{b}: {d}%' }
      }]
    });
  }


//portofolios javascript
function openCreatePortfolio() {
    document.getElementById('createPortfolioPopup').classList.remove('hidden');
}
function closeCreatePortfolio() {
    document.getElementById('createPortfolioPopup').classList.add('hidden');
}

//dashboard

  

  