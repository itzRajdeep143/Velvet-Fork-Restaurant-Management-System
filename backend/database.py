import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "restaurant.db"

MENU_SEED = [
    ("Smoky Alfredo Pasta", "Main Course", 329, "https://images.unsplash.com/photo-1645112411341-6c4fd0234027?auto=format&fit=crop&w=900&q=80", "non-veg"),
    ("Farmhouse Pizza", "Main Course", 379, "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80", "veg"),
    ("Citrus Berry Cooler", "Beverages", 149, "https://images.unsplash.com/photo-1496318447583-f524534e9ce1?auto=format&fit=crop&w=900&q=80", "veg"),
    ("Classic Tiramisu", "Dessert", 229, "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80", "veg"),
    ("Garlic Butter Shrimp", "Starters", 289, "https://images.unsplash.com/photo-1625943555419-56a2cb596640?auto=format&fit=crop&w=900&q=80", "non-veg"),
    ("Mango Cheesecake", "Dessert", 249, "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80", "veg"),
    ("Herb Grilled Sandwich", "Starters", 199, "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80", "veg"),
    ("Signature Cold Coffee", "Beverages", 159, "https://images.unsplash.com/photo-1521302200778-33500795e128?auto=format&fit=crop&w=900&q=80", "veg"),
    ("Coca-Cola", "Beverages", 89, "https://images.unsplash.com/photo-1629203432180-71e9bfa6f74b?auto=format&fit=crop&w=900&q=80", "veg"),
    ("Energy Drink", "Beverages", 129, "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=900&q=80", "veg"),
]

BURGER_SEED = [
    (
        "Maharaja Spicy Chicken Burger",
        "Double chicken patty, spicy peri sauce, onion rings, and cheese.",
        329,
        "non-veg",
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    ),
    (
        "Smoky Paneer Tikka Burger",
        "Grilled paneer tikka, mint mayo, lettuce, and caramelized onions.",
        289,
        "veg",
        "https://images.unsplash.com/photo-1550547660-d9450f8590e2?auto=format&fit=crop&w=900&q=80",
    ),
    (
        "Triple Cheese Veg Crunch Burger",
        "Crispy veg patty, cheddar + mozzarella, jalapeno mayo.",
        269,
        "veg",
        "https://images.unsplash.com/photo-1572804013309-59a88b7e03f9?auto=format&fit=crop&w=900&q=80",
    ),
]


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price INTEGER NOT NULL,
            image TEXT,
            food_type TEXT DEFAULT 'veg'
        );

        CREATE TABLE IF NOT EXISTS burgers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price INTEGER NOT NULL,
            food_type TEXT DEFAULT 'veg',
            image TEXT
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT,
            total_amount INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            item_type TEXT NOT NULL,
            item_id INTEGER NOT NULL,
            price INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );

        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            reservation_date TEXT NOT NULL,
            reservation_time TEXT NOT NULL,
            guests INTEGER NOT NULL,
            status TEXT DEFAULT 'confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    cur.execute("SELECT COUNT(*) AS count FROM menu_items")
    if cur.fetchone()["count"] == 0:
        cur.executemany(
            """
            INSERT INTO menu_items (name, category, price, image, food_type)
            VALUES (?, ?, ?, ?, ?)
            """,
            MENU_SEED,
        )

    cur.execute("SELECT COUNT(*) AS count FROM burgers")
    if cur.fetchone()["count"] == 0:
        cur.executemany(
            """
            INSERT INTO burgers (name, description, price, food_type, image)
            VALUES (?, ?, ?, ?, ?)
            """,
            BURGER_SEED,
        )

    conn.commit()
    conn.close()
