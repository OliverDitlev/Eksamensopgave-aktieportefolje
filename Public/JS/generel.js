// account javascript
document.addEventListener('DOMContentLoaded', () => {
    console.log('generel.js er loadet123');
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


//dashboard

  

  