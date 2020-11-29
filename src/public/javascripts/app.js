/*
  eslint-disable no-plusplus, no-var, strict, vars-on-top, prefer-template,
  func-names, prefer-arrow-callback, no-loop-func
*/
/* global Chart, location, document, port, socketPath, parseInt, io */

'use strict';

Chart.defaults.global.defaultFontSize = 8;
Chart.defaults.global.animation.duration = 500;
Chart.defaults.global.legend.display = false;
Chart.defaults.global.elements.line.backgroundColor = 'rgba(0,0,0,0)';
Chart.defaults.global.elements.line.borderColor = 'rgba(0,0,0,0.9)';
Chart.defaults.global.elements.line.borderWidth = 2;
Chart.defaults.global.elements.line.tension = 0;
Chart.defaults.global.elements.point.radius = 4;
Chart.defaults.global.elements.point.hitRadius = 5;
Chart.defaults.global.elements.point.hoverBorderWidth = 2;
Chart.Tooltip.positioners.custom = function (elements, eventPosition) {
  return {
    x: eventPosition.x,
    y: 2
  };
};

var socket = io(location.protocol + '//' + location.hostname + ':' + (port || location.port), {
  path: socketPath,
});
var defaultSpan = 0;
var spans = [];
var statusCodesColors = ['#75D701', '#47b8e0', '#ffc952', '#E53A40'];

function defaultDataset (label) {
  return {
    label,
    data: [],
    barThickness: 'flex',
  }
}

var defaultOptions = {
  scales: {
    yAxes: [
      {
        ticks: {
          beginAtZero: true,
        },
      },
    ],
    xAxes: [
      {
        type: 'time',
        time: {
          unitStepSize: 30,
        },
        gridLines: {
          display: false,
        },
      },
    ],
  },
  tooltips: {
    mode: 'index',
    intersect: false,
    enabled: true,
    filter: a => a,
    titleFontSize: 13,
    bodyFontSize: 13,
    position: 'custom',
    caretSize: 0,
  },
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
};

var createChart = function (ctx, dataset) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      datasets: dataset,
    },
    options: defaultOptions,
  });
};

var addTimestamp = function (point) {
  return point.timestamp;
};

var cpuDataset = [Object.create(defaultDataset('cpu'))];
var memDataset = [Object.create(defaultDataset('memory'))];
var loadDataset = [Object.create(defaultDataset('system load'))];
var heapDataset = [Object.create(defaultDataset('js heap'))];
var eventLoopDataset = [Object.create(defaultDataset('js event loop'))];
var responseTimeDataset = [Object.create(defaultDataset('response time'))];
var rpsDataset = [Object.create(defaultDataset('request rate'))];

var cpuStat = document.getElementById('cpuStat');
var memStat = document.getElementById('memStat');
var loadStat = document.getElementById('loadStat');
var loadStatAvg = document.getElementById('loadStatAvg');
var heapStat = document.getElementById('heapStat');
var eventLoopStat = document.getElementById('eventLoopStat');
var responseTimeStat = document.getElementById('responseTimeStat');
var rpsStat = document.getElementById('rpsStat');

var cpuChartCtx = document.getElementById('cpuChart');
var memChartCtx = document.getElementById('memChart');
var loadChartCtx = document.getElementById('loadChart');
var heapChartCtx = document.getElementById('heapChart');
var eventLoopChartCtx = document.getElementById('eventLoopChart');
var responseTimeChartCtx = document.getElementById('responseTimeChart');
var rpsChartCtx = document.getElementById('rpsChart');
var statusCodesChartCtx = document.getElementById('statusCodesChart');

var cpuChart = createChart(cpuChartCtx, cpuDataset);
var memChart = createChart(memChartCtx, memDataset);
var heapChart = createChart(heapChartCtx, heapDataset);
var eventLoopChart = createChart(eventLoopChartCtx, eventLoopDataset);
var loadChart = createChart(loadChartCtx, loadDataset);
var responseTimeChart = createChart(responseTimeChartCtx, responseTimeDataset);
var rpsChart = createChart(rpsChartCtx, rpsDataset);
var statusCodesChart = new Chart(statusCodesChartCtx, {
  type: 'line',
  data: {
    datasets: [
      Object.create(defaultDataset('2xx')),
      Object.create(defaultDataset('3xx')),
      Object.create(defaultDataset('4xx')),
      Object.create(defaultDataset('5xx')),
    ],
  },
  options: defaultOptions,
});

statusCodesChart.data.datasets.forEach(function (dataset, index) {
  dataset.borderColor = statusCodesColors[index];
});

var charts = [
  cpuChart,
  memChart,
  loadChart,
  responseTimeChart,
  rpsChart,
  statusCodesChart,
  heapChart,
  eventLoopChart,
];

var onSpanChange = function (e) {
  e.target.classList.add('active');
  defaultSpan = parseInt(e.target.id, 10);

  var otherSpans = document.getElementsByTagName('span');

  for (var i = 0; i < otherSpans.length; i++) {
    if (otherSpans[i] !== e.target) otherSpans[i].classList.remove('active');
  }

  socket.emit('esm_change');
};

socket.on('esm_start', function (data) {
  // Remove last element of Array because it contains malformed responses data.
  // To keep consistency we also remove os data.
  data[defaultSpan].responses.pop();
  data[defaultSpan].os.pop();

  var lastOsMetric = data[defaultSpan].os[data[defaultSpan].os.length - 1];

  cpuStat.textContent = '0.0%';
  if (lastOsMetric) {
    cpuStat.textContent = lastOsMetric.cpu.toFixed(1) + '%';
  }

  cpuChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
    return point.cpu;
  });
  cpuChart.data.labels = data[defaultSpan].os.map(addTimestamp);

  memStat.textContent = '0MB';
  if (lastOsMetric) {
    memStat.textContent = lastOsMetric.memory.toFixed(0) + 'MB';
  }

  memChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
    return point.memory;
  });
  memChart.data.labels = data[defaultSpan].os.map(addTimestamp);

  loadStat.textContent = '0.00';
  // eslint-disable-next-line no-nested-ternary
  const loadAverageToUse = data[defaultSpan].interval <= 30
    ? 0
    : data[defaultSpan].interval <= 150
      ? 1 : 2

  loadStatAvg.textContent = ['One Minute Load Avg', 'Five Minute Load Avg', 'Fifteen Minute Load Avg'][loadAverageToUse];
  if (lastOsMetric) {
    loadStat.textContent = lastOsMetric.load[loadAverageToUse].toFixed(2);
  }

  loadChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
    return point.load[loadAverageToUse];
  });
  loadChart.data.labels = data[defaultSpan].os.map(addTimestamp);

  heapChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
    return point.heap.used_heap_size / 1024 / 1024;
  });
  heapChart.data.labels = data[defaultSpan].os.map(addTimestamp);

  eventLoopChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
    if (point.loop) {
      return point.loop.utilization;
    }
    return 0;
  });
  eventLoopChart.data.labels = data[defaultSpan].os.map(addTimestamp);

  var lastResponseMetric = data[defaultSpan].responses[data[defaultSpan].responses.length - 1];

  responseTimeStat.textContent = '0ms';
  if (lastResponseMetric) {
    responseTimeStat.textContent = lastResponseMetric.mean.toFixed(0) + 'ms';
  }

  responseTimeChart.data.datasets[0].data = data[defaultSpan].responses.map(function (point) {
    return point.mean;
  });
  responseTimeChart.data.labels = data[defaultSpan].responses.map(addTimestamp);

  for (var i = 0; i < 4; i++) {
    statusCodesChart.data.datasets[i].data = data[defaultSpan].responses.map(function (point) {
      return point[i + 2];
    });
  }
  statusCodesChart.data.labels = data[defaultSpan].responses.map(addTimestamp);

  if (data[defaultSpan].responses.length >= 2) {
    var deltaTime =
      lastResponseMetric.timestamp -
      data[defaultSpan].responses[data[defaultSpan].responses.length - 2].timestamp;

    if (deltaTime < 1) deltaTime = 1000;
    rpsStat.textContent = ((lastResponseMetric.count / deltaTime) * 1000).toFixed(2);
    rpsChart.data.datasets[0].data = data[defaultSpan].responses.map(function (point) {
      return (point.count / deltaTime) * 1000;
    });
    rpsChart.data.labels = data[defaultSpan].responses.map(addTimestamp);
  }

  charts.forEach(function (chart) {
    chart.update();
  });

  var spanControls = document.getElementById('span-controls');

  if (data.length !== spans.length) {
    data.forEach(function (span, index) {
      spans.push({
        retention: span.retention,
        interval: span.interval,
      });

      var spanNode = document.createElement('span');

      const seconds = span.retention * span.interval;
      const minutes = seconds / 60;
      const hours = minutes / 60;
      const days = hours / 24;

      // eslint-disable-next-line no-nested-ternary
      var textNode = hours < 1
        ? document.createTextNode(minutes + 'M')
        : days < 1
          ? document.createTextNode(hours + 'H')
          : document.createTextNode(days + 'D');

      spanNode.appendChild(textNode);
      spanNode.setAttribute('id', index);
      spanNode.onclick = onSpanChange;
      spanControls.appendChild(spanNode);
    });
    document.getElementsByTagName('span')[0].classList.add('active');
  }
});

socket.on('esm_stats', function (data) {
  // console.log(data);

  if (
    data.retention === spans[defaultSpan].retention &&
    data.interval === spans[defaultSpan].interval
  ) {
    var os = data.os;
    var responses = data.responses;

    cpuStat.textContent = '0.0%';
    if (os) {
      cpuStat.textContent = os.cpu.toFixed(1) + '%';
      cpuChart.data.datasets[0].data.push(os.cpu);
      cpuChart.data.labels.push(os.timestamp);
    }

    memStat.textContent = '0MB';
    if (os) {
      memStat.textContent = os.memory.toFixed(0) + 'MB';
      memChart.data.datasets[0].data.push(os.memory);
      memChart.data.labels.push(os.timestamp);
    }

    loadStat.textContent = '0';
    if (os) {
      // eslint-disable-next-line no-nested-ternary
      const loadAverageToUse = data.interval <= 30
        ? 0
        : data.interval <= 150
          ? 1 : 2

      loadStat.textContent = os.load[loadAverageToUse].toFixed(2);
      loadChart.data.datasets[0].data.push(os.load[loadAverageToUse]);
      loadChart.data.labels.push(os.timestamp);
    }

    heapStat.textContent = '0MB';
    if (os) {
      heapStat.textContent = (os.heap.used_heap_size / 1024 / 1024).toFixed(0) + 'MB';
      heapChart.data.datasets[0].data.push(os.heap.used_heap_size / 1024 / 1024);
      heapChart.data.labels.push(os.timestamp);
    }

    eventLoopStat.textContent = '0';
    if (os && os.loop) {
      eventLoopStat.textContent = os.loop.utilization.toFixed(1) + '%';
      eventLoopChart.data.datasets[0].data.push(os.loop.utilization);
      eventLoopChart.data.labels.push(os.timestamp);
    }

    responseTimeStat.textContent = '0ms';
    if (responses) {
      responseTimeStat.textContent = responses.mean.toFixed(0) + 'ms';
      responseTimeChart.data.datasets[0].data.push(responses.mean);
      responseTimeChart.data.labels.push(responses.timestamp);
    }

    if (responses) {
      var deltaTime = responses.timestamp - rpsChart.data.labels[rpsChart.data.labels.length - 1];

      if (deltaTime < 1) deltaTime = 1000;
      rpsStat.textContent = ((responses.count / deltaTime) * 1000).toFixed(1);
      rpsChart.data.datasets[0].data.push((responses.count / deltaTime) * 1000);
      rpsChart.data.labels.push(responses.timestamp);
    }

    if (responses) {
      for (var i = 0; i < 4; i++) {
        statusCodesChart.data.datasets[i].data.push(data.responses[i + 2]);
      }
      statusCodesChart.data.labels.push(data.responses.timestamp);
    }

    charts.forEach(function (chart) {
      if (spans[defaultSpan].retention < chart.data.labels.length) {
        chart.data.datasets.forEach(function (dataset) {
          dataset.data.shift();
        });

        chart.data.labels.shift();
      }
      chart.update();
    });
  }
});
