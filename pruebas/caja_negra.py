# Pruebas de caja negra contra la API real (base de datos de pruebas candyland_pruebas).
import json, sys, datetime, requests

import os
BASE = os.environ.get("API_URL", "http://127.0.0.1:3001/api/v1")
R = []

def call(method, path, token=None, **kw):
    h = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.request(method, BASE + path, headers=h, timeout=30, **kw)

def case(cid, rf, titulo, entrada, esperado, ok, obtenido):
    R.append({"id": cid, "rf": rf, "caso": titulo, "entrada": entrada, "esperado": esperado,
              "obtenido": obtenido, "estado": "Aprobado" if ok else "Fallido"})
    print(("OK  " if ok else "XX  ") + cid, titulo, "->", obtenido)

def login(u, p):
    r = call("POST", "/auth/login", json={"username": u, "password": p})
    return r, (r.json().get("token") if r.ok else None)

def body(r):
    try:
        return r.json()
    except Exception:
        return {}

# ---------- Autenticación y seguridad ----------
r, _ = login("admin", "incorrecta")
case("CN-01", "RF-01", "Inicio de sesión con contraseña incorrecta", "usuario admin, contraseña errónea",
     "HTTP 401 y no se entrega token", r.status_code == 401, f"HTTP {r.status_code}: {body(r).get('message')}")
r, ADMIN = login("admin", "Admin2026")
case("CN-02", "RF-01", "Inicio de sesión con credenciales válidas", "usuario admin, contraseña correcta",
     "HTTP 201 con token JWT y rol Administrador", r.status_code == 201 and ADMIN and ADMIN.count(".") == 2 and body(r)["user"]["role"] == "Administrador",
     f"HTTP {r.status_code}, token JWT recibido, rol {body(r).get('user', {}).get('role')}")
r = call("GET", "/products")
case("CN-03", "RNF-01", "Acceso a la API sin token", "GET /products sin cabecera Authorization",
     "HTTP 401", r.status_code == 401, f"HTTP {r.status_code}: {body(r).get('message')}")
r = call("GET", "/products", token="dXNlci0xOjEyMw==")
case("CN-04", "RNF-01", "Acceso con token falsificado", "GET /products con token no firmado por el servidor",
     "HTTP 401", r.status_code == 401, f"HTTP {r.status_code}")

# ---------- Usuarios y roles ----------
roles = {x["name"]: x["id"] for x in body(call("GET", "/roles", ADMIN))}
r = call("POST", "/roles", ADMIN, json={"name": "Cocina", "description": "Personal de cocina"})
roles = {x["name"]: x["id"] for x in body(call("GET", "/roles", ADMIN))}
r = call("POST", "/users", ADMIN, json={"name": "cajero", "password": "Cajero2026", "roleId": roles["Cajero"]})
r2, CAJERO = login("cajero", "Cajero2026")
case("CN-05", "RF-02", "El administrador registra un usuario con rol Cajero", "POST /users {cajero, rol Cajero}",
     "HTTP 201 y el nuevo usuario puede iniciar sesión con su rol", r.status_code == 201 and CAJERO is not None and body(r2)["user"]["role"] == "Cajero",
     f"HTTP {r.status_code}; inicio de sesión de cajero: HTTP {r2.status_code}, rol {body(r2).get('user', {}).get('role')}")
r = call("POST", "/users", CAJERO, json={"name": "intruso", "password": "Intruso2026", "roleId": roles["Administrador"]})
case("CN-06", "RF-02", "Un cajero intenta crear un usuario", "POST /users con token de cajero",
     "HTTP 403 (sin permisos)", r.status_code == 403, f"HTTP {r.status_code}: {body(r).get('message')}")
call("POST", "/users", ADMIN, json={"name": "cocinero", "password": "Cocina2026", "roleId": roles["Cocina"]})
_, COCINA = login("cocinero", "Cocina2026")
r = call("POST", "/users", ADMIN, json={"name": "temporal", "password": "Temporal2026", "roleId": roles["Cajero"]})
tmp_id = body(r).get("id") or next((u["id"] for u in body(call("GET", "/users", ADMIN)) if u["name"] == "temporal"), None)
call("PATCH", f"/users/{tmp_id}", ADMIN, json={"isActive": False})
r, _ = login("temporal", "Temporal2026")
case("CN-07", "RF-02", "Un usuario desactivado intenta iniciar sesión", "usuario 'temporal' desactivado por el administrador",
     "HTTP 401", r.status_code == 401, f"HTTP {r.status_code}: {body(r).get('message')}")

# ---------- Catálogo ----------
r = call("POST", "/categories", ADMIN, json={"name": "Helados"})
cat_id = body(r).get("id")
r2 = call("POST", "/categories", CAJERO, json={"name": "Bebidas"})
case("CN-08", "RF-04", "Registro de categoría según rol", "POST /categories como administrador y como cajero",
     "Administrador: HTTP 201; cajero: HTTP 403", r.status_code == 201 and r2.status_code == 403,
     f"administrador HTTP {r.status_code}; cajero HTTP {r2.status_code}")
r = call("POST", "/topping", ADMIN, json={"name": "Chispas de chocolate"})
top_id = body(r).get("id")
r = call("POST", "/products", ADMIN, json={"name": "Helado de fresa", "description": "Copa de helado artesanal", "price": 10,
                                            "current_stock": 20, "minimum_stock": 5, "image": "uploads/helado-fresa.png",
                                            "categoryId": cat_id, "toppingId": [top_id]})
prod_id = body(r).get("id")
p = body(call("GET", f"/products/{prod_id}", ADMIN))
tops = [t.get("topping", t).get("name") for t in (p.get("productToppings") or p.get("toppings") or [])]
case("CN-09", "RF-05 / RF-06", "Registro de producto con categoría, stock y topping asociado",
     "POST /products {Helado de fresa, Bs 10, stock 20, mínimo 5, categoría Helados, topping Chispas}",
     "HTTP 201; el producto queda con su categoría, stock y topping", r.status_code == 201 and p.get("current_stock") == 20 and "Chispas de chocolate" in json.dumps(p, ensure_ascii=False),
     f"HTTP {r.status_code}; stock {p.get('current_stock')}; categoría {(p.get('category') or {}).get('name')}; topping asociado: {'sí' if 'Chispas de chocolate' in json.dumps(p, ensure_ascii=False) else 'no'}")
r = call("POST", "/products", ADMIN, json={"name": "Agua 500 ml", "price": 5, "current_stock": 3, "minimum_stock": 2,
                                            "image": "uploads/agua.png", "categoryId": cat_id})
prod2_id = body(r).get("id")

r = call("POST", "/promotions", ADMIN, json={"name": "Fresa 20%", "type": "discount", "value": 20,
                                              "end_date": (datetime.datetime.now() + datetime.timedelta(days=5)).strftime("%Y-%m-%dT%H:%M:%S"), "productIds": [prod_id]})
case("CN-10", "RF-07", "Registro de promoción de descuento porcentual", "POST /promotions {20 %, vigencia 5 días, Helado de fresa}",
     "HTTP 201", r.status_code == 201, f"HTTP {r.status_code}")

# ---------- Clientes ----------
r = call("POST", "/client", CAJERO, json={"full_name": "María Rojas", "ci": "7894561", "phone": "70712345", "direction": "Av. América 123"})
cli_id = body(r).get("id")
r2 = call("GET", "/client?ci=7894561", CAJERO)
found = any(c.get("ci") == "7894561" for c in (body(r2) if isinstance(body(r2), list) else body(r2).get("data", [])))
case("CN-11", "RF-03", "Registro y búsqueda de cliente", "POST /client {María Rojas, CI 7894561}; GET /client?ci=7894561",
     "HTTP 201 y el cliente aparece en la búsqueda", r.status_code == 201 and found, f"HTTP {r.status_code}; encontrado por CI: {'sí' if found else 'no'}")

# ---------- Ventas ----------
me_cajero = body(call("POST", "/auth/login", json={"username": "cajero", "password": "Cajero2026"}))["user"]["id"]
r = call("POST", "/sale", CAJERO, json={"userId": me_cajero, "clientId": cli_id, "payment_method": "in_efective",
                                        "details": [{"productId": prod_id, "quantity": 3}]})
sale = body(r); sale_id = sale.get("id") or (sale.get("sale") or {}).get("id")
s = body(call("GET", f"/sale/{sale_id}", CAJERO))
stock_after = body(call("GET", f"/products/{prod_id}", ADMIN)).get("current_stock")
case("CN-12", "RF-09", "Registro de venta directa con promoción vigente", "3 × Helado de fresa (Bs 10, promoción 20 %), pago en efectivo",
     "HTTP 201; total Bs 24,00; stock 20 → 17; método de pago efectivo",
     r.status_code == 201 and float(s.get("total", 0)) == 24.0 and stock_after == 17 and s.get("payment_method") == "in_efective",
     f"HTTP {r.status_code}; total Bs {float(s.get('total', 0)):.2f}; stock {stock_after}; método {s.get('payment_method')}")
r = call("GET", f"/sale/{sale_id}/ticket", CAJERO)
case("CN-13", "RF-12", "Generación del ticket de venta", "GET /sale/{id}/ticket",
     "HTTP 200 con un documento PDF", r.status_code == 200 and r.headers.get("content-type", "").startswith("application/pdf") and r.content[:4] == b"%PDF",
     f"HTTP {r.status_code}; tipo {r.headers.get('content-type')}; {len(r.content)} bytes")
r = call("POST", "/sale", CAJERO, json={"userId": me_cajero, "payment_method": "in_qr", "details": [{"productId": prod2_id, "quantity": 10}]})
st2 = body(call("GET", f"/products/{prod2_id}", ADMIN)).get("current_stock")
case("CN-14", "RF-09", "Venta con stock insuficiente", "10 × Agua 500 ml con stock 3",
     "HTTP 400 y el stock no cambia", r.status_code == 400 and st2 == 3, f"HTTP {r.status_code}: {body(r).get('message')}; stock {st2}")

# ---------- Stock y alertas ----------
r = call("POST", "/sale", CAJERO, json={"userId": me_cajero, "payment_method": "in_qr", "details": [{"productId": prod2_id, "quantity": 1}]})
alerts = body(call("GET", "/stock-alert/active", CAJERO))
alerts = alerts if isinstance(alerts, list) else alerts.get("data", [])
has_alert = any((a.get("product") or {}).get("id") == prod2_id for a in alerts)
case("CN-15", "RF-10", "Alerta automática al llegar al stock mínimo", "Venta de 1 × Agua 500 ml (stock 3, mínimo 2), pago QR",
     "Stock 3 → 2 y alerta activa para el producto", r.status_code == 201 and has_alert,
     f"venta HTTP {r.status_code}; stock {body(call('GET', f'/products/{prod2_id}', ADMIN)).get('current_stock')}; alerta activa: {'sí' if has_alert else 'no'}")

# ---------- Pedidos ----------
r = call("POST", "/orders", CAJERO, json={"userId": me_cajero, "clientId": cli_id, "type": "delivery",
                                          "delivery_address": "Av. América 123", "details": [{"productId": prod_id, "quantity": 2, "toppingIds": [top_id]}]})
order = body(r); order_id = order.get("id") or (order.get("order") or {}).get("id")
o = body(call("GET", f"/orders/{order_id}", CAJERO))
case("CN-16", "RF-08", "Registro de pedido a domicilio", "2 × Helado de fresa con topping, cliente María Rojas, dirección",
     "HTTP 201; pedido de tipo delivery en estado pending", r.status_code == 201 and o.get("type") == "delivery" and o.get("status") == "pending",
     f"HTTP {r.status_code}; tipo {o.get('type')}; estado {o.get('status')}")
r = call("POST", "/orders", CAJERO, json={"userId": me_cajero, "clientId": cli_id, "type": "scheduled",
                                          "scheduled_at": "2026-12-20T15:00:00", "details": [{"productId": prod_id, "quantity": 1}]})
o2 = body(r); o2_id = o2.get("id") or (o2.get("order") or {}).get("id")
o2 = body(call("GET", f"/orders/{o2_id}", CAJERO))
case("CN-17", "RF-08", "Registro de pedido programado", "1 × Helado de fresa programado para 20/12/2026 15:00",
     "HTTP 201; tipo scheduled con fecha programada", r.status_code == 201 and o2.get("type") == "scheduled" and bool(o2.get("scheduled_at")),
     f"HTTP {r.status_code}; tipo {o2.get('type')}; programado para {o2.get('scheduled_at')}")
r = call("PATCH", f"/orders/{order_id}", COCINA, json={"status": "preparing"})
r2 = call("POST", "/sale", COCINA, json={"userId": me_cajero, "payment_method": "in_qr", "details": [{"productId": prod_id, "quantity": 1}]})
case("CN-18", "RF-13", "Pantalla de preparación: cocina actualiza el estado del pedido", "Usuario Cocina: PATCH estado 'preparing'; intenta registrar una venta",
     "Actualización HTTP 200; venta HTTP 403", r.status_code == 200 and r2.status_code == 403,
     f"actualización HTTP {r.status_code} (estado {body(call('GET', f'/orders/{order_id}', COCINA)).get('status')}); venta HTTP {r2.status_code}")

# ---------- Anulaciones ----------
before = body(call("GET", f"/products/{prod_id}", ADMIN)).get("current_stock")
r0 = call("DELETE", f"/sale/{sale_id}", CAJERO, json={"reason": ""})
r = call("DELETE", f"/sale/{sale_id}", CAJERO, json={"reason": "Error en el producto registrado"})
after = body(call("GET", f"/products/{prod_id}", ADMIN)).get("current_stock")
s = body(call("GET", f"/sale/{sale_id}", CAJERO))
case("CN-19", "RF-15", "Anulación de venta con restitución de stock", "Anular la venta CN-12 sin motivo y luego con motivo",
     "Sin motivo: HTTP 400; con motivo: HTTP 200, estado canceled y +3 unidades",
     r0.status_code == 400 and r.status_code == 200 and s.get("status") == "canceled" and after == before + 3,
     f"sin motivo HTTP {r0.status_code}; con motivo HTTP {r.status_code}; estado {s.get('status')}; stock {before} → {after}")
before = after
r = call("DELETE", f"/orders/{order_id}", CAJERO)
after = body(call("GET", f"/products/{prod_id}", ADMIN)).get("current_stock")
_lst = body(call("GET", "/orders", CAJERO)); _lst = _lst if isinstance(_lst, list) else _lst.get("data", [])
o = next((x for x in _lst if x.get("id") == order_id), {})
case("CN-20", "RF-15", "Anulación de pedido con restitución de stock", "Cancelar el pedido CN-16 (2 unidades)",
     "HTTP 200, estado cancelled en el listado de pedidos y +2 unidades", r.status_code == 200 and o.get("status") == "cancelled" and after == before + 2,
     f"HTTP {r.status_code}; estado {o.get('status')}; stock {before} → {after}")

# ---------- Fuente de datos de reportes ----------
r = call("GET", "/sale", ADMIN)
lst = body(r) if isinstance(body(r), list) else body(r).get("data", [])
case("CN-21", "RF-14", "Datos de ventas para reportes", "GET /sale como administrador",
     "HTTP 200 con las ventas, su total, método de pago y estado", r.status_code == 200 and len(lst) >= 2 and all("total" in v and "status" in v for v in lst),
     f"HTTP {r.status_code}; {len(lst)} ventas con total, método de pago y estado")

json.dump({"fecha": datetime.datetime.now().isoformat(timespec="minutes"), "casos": R}, open("blackbox_results.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{sum(c['estado'] == 'Aprobado' for c in R)}/{len(R)} aprobados")
