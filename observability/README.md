# Observabilidad

La API expone métricas Prometheus en `/metrics` (método **RED**: Rate, Errors, Duration)
más las métricas por defecto de Node.js (heap, event loop, GC). El endpoint solo es accesible
desde dentro de la red Docker: Caddy lo bloquea desde internet y la app rechaza cualquier
request con cabecera `X-Forwarded-For` (defensa en profundidad). El scrapeo lo hace
**Grafana Alloy** contra el contenedor directamente.

## Métricas clave

| Métrica | Tipo | Uso |
|---|---|---|
| `http_requests_total{method,route,status_code}` | counter | Rate y Errors |
| `http_request_duration_seconds_bucket{...}` | histogram | Duration (p50/p95/p99) |
| `nodejs_heap_size_used_bytes`, `nodejs_eventloop_lag_seconds` | gauge | Salud del proceso |

> Las rutas se etiquetan por **patrón** (`/tasks/:id`), no por valor, para evitar explosión
> de cardinalidad.

## Importar el dashboard

`dashboards/tasks-api.json` está versionado como código.

1. En Grafana: **Dashboards → New → Import**.
2. Sube `tasks-api.json` (o pega su contenido).
3. Selecciona tu fuente de datos Prometheus cuando lo pida (`DS_PROMETHEUS`).

El dashboard tiene 4 paneles: Rate (req/s por ruta), Errors (% de 5xx), Duration (p50/p95/p99)
y salud del proceso (heap + event loop lag).

## Probarlo localmente

```bash
docker compose up -d --build
# Generar tráfico
for i in $(seq 1 200); do curl -s localhost:3000/tasks >/dev/null; done
# Ver las métricas crudas
curl -s localhost:3000/metrics | grep http_requests_total
```
