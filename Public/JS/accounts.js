//laver popupform til 
  let formopen = false

  const closeformbtn = document.getElementById('closeformbtn')
  const openformbtn = document.getElementById('openformbtn')
  const popupform = document.getElementById('popupform')

  function formpopup(){
      if(formopen){
          popupform.classList.add('hidden')
      } else {
          popupform.classList.remove('hidden')
      }
      formopen = !formopen
  }
  openformbtn.addEventListener('click', formpopup)
  closeformbtn.addEventListener('click', formpopup)

  window.addEventListener('click', temp => {
  if (temp.target === popupform) formpopup();
  });
//ændre balance
let balanceopen = false;

const closebalancebtn = document.getElementById('closebalancebtn');
const balancepopup = document.getElementById('balancepopup');
const changebalancebtns = document.querySelectorAll('#changebalance');
const accountIdHidden = document.getElementById('accountIdHidden');

function balancepopupToggle(accountId = null) {
    if (balanceopen) {
        balancepopup.classList.add('hidden');
    } else {
        balancepopup.classList.remove('hidden');
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
    if (event.target == balancepopup) balancepopupToggle();
});
// logik for at slette portefølje

const deleteledgerbtn = document.querySelectorAll('#deletebtn')

deleteledgerbtn.forEach(deleteledgerbtn=> {
    deleteledgerbtn.addEventListener('click', deleteLedger);
});

async function deleteLedger(accdeleted) {
    const btn = accdeleted.currentTarget
    const accountID = btn.dataset.accountid
    
    try{
        await fetch('/deleteaccount',{
            method: 'DELETE',
            headers:{
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({accountID})
        })
        window.location.reload()
    }catch(err){
        console.err('could not deleteaccount')
    }
}



//skaber piechart
const chartElement = document.getElementById('chartinUSDandDKK')

const sumDKK = Number(chartElement.dataset.sumdkk);
const sumUSD = Number(chartElement.dataset.sumusd);
const sumGBP = Number(chartElement.dataset.sumgbp)

const chart = echarts.init(chartElement)

  const option = {
  series: [
{
type: 'pie',
radius: '50%',
data: [
  {value: sumDKK, name: 'DKK'},
  {value: sumUSD * 7.5, name: 'USD'},
  {value: sumGBP * 9, name: 'GBP'},
],
}]
};
chart.setOption(option)
