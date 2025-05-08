console.log("✅ stockdetails.js er loaded!");

document.addEventListener('DOMContentLoaded', () => {

  const { price_tday, price_1m, price_2m, price_3m,
          price_4m, price_5m, price_6m, price_7m,
          price_8m, price_9m, price_10m, price_11m, price_12m } = window.chartData || {};


  const labels = ["12m","11m","10m","9m","8m","7m","6m","5m","4m","3m","2m","1m","Today"];
  const values = [ price_12m, price_11m, price_10m, price_9m,
                   price_8m,  price_7m,  price_6m,  price_5m,
                   price_4m,  price_3m,  price_2m,  price_1m,
                   price_tday ];

  console.log("labels:", labels);
  console.log("values:", values);


  const chartContainer = document.getElementById('chart');

  const chart = echarts.init(chartContainer);
  chart.setOption({
    title: {
      text: 'Udvikling – sidste 12 måneder',
      left: 'left',
      textStyle: { color: '#ffffff', fontSize: 18 }
    },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: labels,      axisLabel: { color: '#ffffff' } },
    yAxis: { type: 'value',    axisLabel: { color: '#ffffff' } },
    series: [{
      data: values,
      type: 'line',
      smooth: true,
      itemStyle: { color: '#0059ff' }
    }]
  });

  window.addEventListener('resize', () => chart.resize());
});
