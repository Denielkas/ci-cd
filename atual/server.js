const express = require('express');
const client = require('prom-client');

const app = express();

// Registry e métricas padrão
client.collectDefaultMetrics({ register: client.register });

// ----- Métricas custom -----
const requestCounter = new client.Counter({
  name: 'app_request_total',
  help: 'Contador de requisições recebidas',
  labelNames: ['method', 'route', 'code'],
});

const uptimeGauge = new client.Gauge({
  name: 'server_uptime_seconds',
  help: 'Tempo de atividade do servidor em segundos',
});

const randomNumberGauge = new client.Gauge({
  name: 'random_number',
  help: 'Número aleatório gerado para testar',
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 3, 5],
});

// Registrar tudo
client.register.registerMetric(requestCounter);
client.register.registerMetric(uptimeGauge);
client.register.registerMetric(randomNumberGauge);
client.register.registerMetric(httpRequestDuration);

// ----- Valores iniciais (garante presença no /metrics) -----
uptimeGauge.set(process.uptime());
randomNumberGauge.set(Math.floor(Math.random() * 100) + 1);

// ----- Atualizações periódicas -----
setInterval(() => {
  uptimeGauge.set(process.uptime());
  randomNumberGauge.set(Math.floor(Math.random() * 100) + 1);
}, 5000);

// ----- Middleware HTTP -----
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    end({ code: res.statusCode });
    requestCounter.inc({ method: req.method, route: req.path, code: res.statusCode });
  });
  next();
});

// ----- Rotas -----
app.get('/', (req, res) => {
  res.send('Prometheus + Grafana + Kubernetes + Uptime + Random Number');
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (e) {
    res.status(500).end(e.message);
  }
});

// ----- Start -----
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`App rodando na porta ${PORT}`);
});
