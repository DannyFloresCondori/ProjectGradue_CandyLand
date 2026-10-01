# Medición de tiempos de respuesta (RNF-04) contra la API local con la base de pruebas
import time, json, statistics, datetime, platform, requests
import os
B = os.environ.get("API_URL", "http://127.0.0.1:3002/api/v1")
def login(u, p):
    r = requests.post(B + "/auth/login", json={"username": u, "password": p}); return r.json()
adm = login("admin", "Admin2026"); A = {"Authorization": "Bearer " + adm["token"]}
caj = login("cajero", "Cajero2026"); C = {"Authorization": "Bearer " + caj["token"]}; uid = caj["user"]["id"]
cat = requests.get(B + "/categories", headers=A).json()[0]["id"]
p = requests.post(B + "/products", headers=A, json={"name": "Helado de vainilla medicion", "price": 12, "current_stock": 5000, "minimum_stock": 5, "image": "uploads/vainilla.png", "categoryId": cat}).json()
pid = p["id"]
N = 30
ops = {
  "Inicio de sesión (POST /auth/login)": lambda: requests.post(B + "/auth/login", json={"username": "cajero", "password": "Cajero2026"}),
  "Consulta de productos (GET /products)": lambda: requests.get(B + "/products", headers=C),
  "Registro de venta con ticket (POST /sale)": lambda: requests.post(B + "/sale", headers=C, json={"userId": uid, "payment_method": "in_efective", "details": [{"productId": pid, "quantity": 1}]}),
  "Registro de pedido (POST /orders)": lambda: requests.post(B + "/orders", headers=C, json={"userId": uid, "type": "delivery", "delivery_address": "Calle 1", "details": [{"productId": pid, "quantity": 1}]}),
  "Consulta de ventas para reportes (GET /sale)": lambda: requests.get(B + "/sale", headers=A),
  "Consulta de alertas activas (GET /stock-alert/active)": lambda: requests.get(B + "/stock-alert/active", headers=C),
}
res = []
for name, fn in ops.items():
    ts = []
    for _ in range(N):
        t0 = time.perf_counter(); r = fn(); ts.append((time.perf_counter() - t0) * 1000)
        assert r.status_code in (200, 201), (name, r.status_code, r.text[:200])
    ts.sort()
    res.append({"operacion": name, "n": N, "promedio_ms": round(statistics.mean(ts), 1), "p95_ms": round(ts[int(0.95 * N) - 1], 1), "max_ms": round(max(ts), 1)})
    print(res[-1])
json.dump({"fecha": datetime.datetime.now().isoformat(timespec="minutes"), "equipo": platform.platform(), "procesador": platform.processor(), "resultados": res}, open("perf_results.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
