const pidusage = require('pidusage');
const os = require('os');
const v8 = require('v8');
const sendMetrics = require('./send-metrics');
const debug = require('debug')('express-status-monitor');
const { performance } = require('perf_hooks');

function defaultResponse () {
  return {
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    count: 0,
    mean: 0,
    timestamp: Date.now(),
  };
}

let lastEventLoopUtilization = performance.eventLoopUtilization();

module.exports = (io, span) => {
  pidusage(process.pid, (err, stat) => {
    if (err) {
      debug(err);
      return;
    }

    const last = span.responses[span.responses.length - 1];

    // Convert from B to MB
    stat.memory = stat.memory / 1024 / 1024;
    stat.load = os.loadavg();
    stat.timestamp = Date.now();
    stat.heap = v8.getHeapStatistics();

    lastEventLoopUtilization = performance.eventLoopUtilization(lastEventLoopUtilization);
    stat.loop = {
      utilization: lastEventLoopUtilization.utilization * 100
    }

    span.os.push(stat);
    if (!span.responses[0] || (last.timestamp + span.interval) < Date.now()) {
      span.responses.push(defaultResponse());
    }

    // todo: I think this check should be moved somewhere else
    if (span.os.length >= span.retention) span.os.shift();
    if (span.responses[0] && span.responses.length > span.retention) span.responses.shift();

    sendMetrics(io, span);
  });
};
