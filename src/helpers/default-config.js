module.exports = {
  title: 'Express Status',
  theme: 'default.css',
  path: '/status',
  socketPath: '/socket.io',
  spans: [
    {
      interval: 1,
      retention: 60,
    },
    {
      interval: 5,
      retention: 60,
    },
    {
      interval: 15,
      retention: 60,
    },
  ],
  port: null,
  websocket: null,
  iframe: false,
  chartVisibility: {
    cpu: true,
    mem: true,
    load: true,
    heap: true,
    eventLoop: true,
    responseTime: true,
    rps: true,
    statusCodes: true,
  },
  ignoreStartsWith: '/admin',
  healthChecks: [],
  chartjsSrc: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.2.2/Chart.bundle.min.js',
  socketIoSrc: 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.js',
};
