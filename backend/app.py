import os
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from database import get_connection, init_db

BASE_DIR = Path(__file__).resolve().parent.parent
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "velvet-fork-admin-token")

app = Flask(__name__)
CORS(app)

init_db()


def row_to_dict(row):
    return dict(row)


def require_admin(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-Admin-Token", "")
        if token != ADMIN_TOKEN:
            return jsonify({"error": "Unauthorized admin access."}), 401
        return view(*args, **kwargs)

    return wrapper


def fetch_order_items(cur, order_id):
    cur.execute(
        """
        SELECT item_name, item_type, item_id, price, quantity
        FROM order_items WHERE order_id = ?
        ORDER BY id
        """,
        (order_id,),
    )
    return [row_to_dict(row) for row in cur.fetchall()]


@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    if filename.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    file_path = BASE_DIR / filename
    if file_path.exists() and file_path.is_file():
        return send_from_directory(BASE_DIR, filename)
    return jsonify({"error": "Not found"}), 404


@app.get("/api/menu")
def get_menu():
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip().lower()

    conn = get_connection()
    cur = conn.cursor()
    query = "SELECT * FROM menu_items WHERE 1=1"
    params = []

    if category and category.lower() != "all":
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND LOWER(name) LIKE ?"
        params.append(f"%{search}%")

    query += " ORDER BY category, name"
    cur.execute(query, params)
    items = [row_to_dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(items)


@app.get("/api/categories")
def get_categories():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT category FROM menu_items ORDER BY category")
    categories = ["All", *[row["category"] for row in cur.fetchall()]]
    conn.close()
    return jsonify(categories)


@app.get("/api/burgers")
def get_burgers():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM burgers ORDER BY id")
    burgers = [row_to_dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(burgers)


@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True) or {}

    customer_name = (data.get("customer_name") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()
    items = data.get("items") or []

    if not customer_name or not email or not phone:
        return jsonify({"error": "Name, email, and phone are required."}), 400

    if not items:
        return jsonify({"error": "Cart is empty."}), 400

    total_amount = 0
    for item in items:
        qty = int(item.get("quantity", 0))
        price = int(item.get("price", 0))
        if qty <= 0 or price < 0:
            return jsonify({"error": "Invalid cart item."}), 400
        total_amount += qty * price

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO orders (customer_name, email, phone, address, total_amount, status)
        VALUES (?, ?, ?, ?, ?, 'confirmed')
        """,
        (customer_name, email, phone, address, total_amount),
    )
    order_id = cur.lastrowid

    for item in items:
        cur.execute(
            """
            INSERT INTO order_items (order_id, item_name, item_type, item_id, price, quantity)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                order_id,
                item.get("name"),
                item.get("item_type", "menu"),
                int(item.get("item_id", 0)),
                int(item.get("price", 0)),
                int(item.get("quantity", 1)),
            ),
        )

    conn.commit()
    conn.close()

    return jsonify(
        {
            "message": "Order placed successfully.",
            "order_id": order_id,
            "total_amount": total_amount,
        }
    ), 201


@app.post("/api/reservations")
def create_reservation():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    reservation_date = (data.get("date") or "").strip()
    reservation_time = (data.get("time") or "").strip()
    guests = data.get("guests")

    if not all([name, email, reservation_date, reservation_time, guests]):
        return jsonify({"error": "Please complete all required reservation fields."}), 400

    guests = int(guests)
    if guests < 1 or guests > 20:
        return jsonify({"error": "Guests must be between 1 and 20."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO reservations (name, email, phone, reservation_date, reservation_time, guests)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (name, email, phone, reservation_date, reservation_time, guests),
    )
    reservation_id = cur.lastrowid
    conn.commit()
    conn.close()

    return jsonify(
        {
            "message": "Reservation confirmed.",
            "reservation_id": reservation_id,
            "name": name,
            "guests": guests,
            "date": reservation_date,
            "time": reservation_time,
        }
    ), 201


@app.get("/api/orders")
def list_orders():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, customer_name, email, phone, total_amount, status, created_at
        FROM orders ORDER BY id DESC LIMIT 20
        """
    )
    orders = [row_to_dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(orders)


@app.get("/api/reservations")
def list_reservations():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, email, phone, reservation_date, reservation_time, guests, status, created_at
        FROM reservations ORDER BY id DESC LIMIT 20
        """
    )
    reservations = [row_to_dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(reservations)


@app.post("/api/admin/login")
def admin_login():
    data = request.get_json(silent=True) or {}
    password = (data.get("password") or "").strip()

    if password != ADMIN_PASSWORD:
        return jsonify({"error": "Invalid admin password."}), 401

    return jsonify({"message": "Login successful.", "token": ADMIN_TOKEN})


@app.get("/api/admin/stats")
@require_admin
def admin_stats():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) AS count FROM orders")
    total_orders = cur.fetchone()["count"]

    cur.execute("SELECT COUNT(*) AS count FROM reservations")
    total_reservations = cur.fetchone()["count"]

    cur.execute("SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM orders")
    total_revenue = cur.fetchone()["revenue"]

    cur.execute("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'")
    pending_orders = cur.fetchone()["count"]

    conn.close()
    return jsonify(
        {
            "total_orders": total_orders,
            "total_reservations": total_reservations,
            "total_revenue": total_revenue,
            "pending_orders": pending_orders,
        }
    )


@app.get("/api/admin/orders")
@require_admin
def admin_orders():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, customer_name, email, phone, address, total_amount, status, created_at
        FROM orders ORDER BY id DESC
        """
    )
    orders = [row_to_dict(row) for row in cur.fetchall()]
    for order in orders:
        order["items"] = fetch_order_items(cur, order["id"])
    conn.close()
    return jsonify(orders)


@app.get("/api/admin/reservations")
@require_admin
def admin_reservations():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, email, phone, reservation_date, reservation_time, guests, status, created_at
        FROM reservations ORDER BY id DESC
        """
    )
    reservations = [row_to_dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(reservations)


@app.patch("/api/admin/orders/<int:order_id>/status")
@require_admin
def update_order_status(order_id):
    data = request.get_json(silent=True) or {}
    status = (data.get("status") or "").strip().lower()
    allowed = {"pending", "confirmed", "completed", "cancelled"}

    if status not in allowed:
        return jsonify({"error": "Invalid status value."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    if cur.rowcount == 0:
        conn.close()
        return jsonify({"error": "Order not found."}), 404
    conn.commit()
    conn.close()
    return jsonify({"message": "Order status updated.", "status": status})


@app.patch("/api/admin/reservations/<int:reservation_id>/status")
@require_admin
def update_reservation_status(reservation_id):
    data = request.get_json(silent=True) or {}
    status = (data.get("status") or "").strip().lower()
    allowed = {"pending", "confirmed", "completed", "cancelled"}

    if status not in allowed:
        return jsonify({"error": "Invalid status value."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE reservations SET status = ? WHERE id = ?", (status, reservation_id))
    if cur.rowcount == 0:
        conn.close()
        return jsonify({"error": "Reservation not found."}), 404
    conn.commit()
    conn.close()
    return jsonify({"message": "Reservation status updated.", "status": status})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
