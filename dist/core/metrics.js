"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestDuration = exports.httpRequestsTotal = exports.register = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
exports.register = new prom_client_1.default.Registry();
// collect default metrics (CPU, memory, etc.)
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
// HTTP request counter
exports.httpRequestsTotal = new prom_client_1.default.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
});
// Request duration
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});
exports.register.registerMetric(exports.httpRequestsTotal);
exports.register.registerMetric(exports.httpRequestDuration);
