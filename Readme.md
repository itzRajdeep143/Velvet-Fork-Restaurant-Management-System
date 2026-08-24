# Velvet Fork - Restaurant Website (Full Stack)

Modern restaurant website with frontend + backend + SQLite database.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python Flask (REST API)
- **Database:** SQLite (`backend/restaurant.db`)

## Features

- Menu loaded from database (search + category filter)
- Special burgers loaded from database
- Cart with quantity controls
- Checkout saves order to database
- Table reservation saved to database
- **Admin dashboard** to view orders/reservations and update status
- VEG / NON-VEG badges
- Light/Dark theme
- Responsive design

## Database Tables

- `menu_items` - dishes and beverages
- `burgers` - special burger section
- `orders` + `order_items` - customer orders
- `reservations` - table bookings

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu` | Menu items (`?category=&search=`) |
| GET | `/api/categories` | Category list |
| GET | `/api/burgers` | Special burgers |
| POST | `/api/orders` | Place order |
| POST | `/api/reservations` | Book table |
| GET | `/api/orders` | Recent orders (demo) |
| GET | `/api/reservations` | Recent reservations (demo) |
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/orders` | All orders with items |
| GET | `/api/admin/reservations` | All reservations |
| PATCH | `/api/admin/orders/:id/status` | Update order status |
| PATCH | `/api/admin/reservations/:id/status` | Update reservation status |

## How to Run

1. Go to project folder:

```bash
cd /home/niks_2801/Documents/restaurant-webapp
```

2. Start server (creates virtual environment automatically):

```bash
chmod +x start.sh
./start.sh
```

Or manually:

```bash
python3 -m venv venv
./venv/bin/pip install -r backend/requirements.txt
./venv/bin/python backend/app.py
```

3. Open in browser:

- Website: `http://localhost:5000`
- Admin panel: `http://localhost:5000/admin.html`

**Default admin password:** `admin123`

> Important: Open the site through the Flask server URL above. Opening `index.html` directly will not connect to the backend API.

## Project Structure

```
restaurant-webapp/
├── index.html
├── styles.css
├── script.js
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── requirements.txt
│   └── restaurant.db   (auto-created on first run)
└── README.md
```

