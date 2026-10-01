# Pruebas del sistema Candyland

Las pruebas se ejecutan contra una base de datos de pruebas separada (nunca contra la de producción).

| Tipo | Comando | Resultado (01/10/2026) |
|---|---|---|
| Unitarias backend (Jest) | `cd Backend && npm test` | 30/30 aprobadas |
| Unitarias frontend (Vitest) | `cd Frontend && npm test` | 14/14 aprobadas |
| Caja negra (API) | `python pruebas/caja_negra.py` | 21/21 aprobadas |
| Rendimiento (RNF-04) | `python pruebas/rendimiento.py` | p95 < 100 ms en todas las operaciones |

Requisitos para caja negra y rendimiento: backend en ejecución sobre una base vacía con
`ADMIN_USERNAME=admin` y `ADMIN_PASSWORD=Admin2026`, y `API_URL` apuntando a la API
(por defecto `http://127.0.0.1:3002/api/v1`). Requiere Python 3 con `requests`.
Los resultados de la ejecución documentada en el proyecto de grado están en `resultados/`.
