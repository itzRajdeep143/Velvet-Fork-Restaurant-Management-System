const API_BASE = window.location.origin;

const menuGrid = document.getElementById("menuGrid");
const burgersGrid = document.getElementById("burgersGrid");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
const cartDrawer = document.getElementById("cartDrawer");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const cartCountEl = document.getElementById("cartCount");
const reservationForm = document.getElementById("reservationForm");
const reservationMessage = document.getElementById("reservationMessage");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutMessage = document.getElementById("checkoutMessage");

const openCartBtn = document.getElementById("openCart");
const closeCartBtn = document.getElementById("closeCart");
const checkoutBtn = document.getElementById("checkoutBtn");
const closeCheckoutBtn = document.getElementById("closeCheckout");
const themeToggle = document.getElementById("themeToggle");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

const CART_KEY = "restaurant_cart";
const THEME_KEY = "restaurant_theme";

let activeCategory = "All";
let categories = ["All"];
let dishes = [];
let burgers = [];
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

function money(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function foodBadge(type) {
  const isVeg = type === "veg";
  const label = isVeg ? "VEG" : "NON-VEG";
  const cls = isVeg ? "badge-veg" : "badge-nonveg";
  return `<span class="food-badge ${cls}">${label}</span>`;
}

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error("Failed to load data from server.");
  }
  return response.json();
}

async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

function addToCart(item, itemType) {
  const key = `${itemType}-${item.id}`;
  const existing = cart.find((entry) => entry.key === key);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      key,
      id: item.id,
      item_type: itemType,
      name: item.name,
      price: item.price,
      qty: 1,
    });
  }
  saveCart();
  renderCart();
}

function updateQty(key, delta) {
  cart = cart
    .map((item) => (item.key === key ? { ...item, qty: item.qty + delta } : item))
    .filter((item) => item.qty > 0);
  saveCart();
  renderCart();
}

function renderFilters() {
  categoryFilters.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = `chip ${activeCategory === category ? "active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      activeCategory = category;
      renderFilters();
      loadMenu();
    });
    categoryFilters.appendChild(button);
  });
}

async function loadMenu() {
  const search = searchInput.value.trim();
  const params = new URLSearchParams();
  if (activeCategory !== "All") {
    params.set("category", activeCategory);
  }
  if (search) {
    params.set("search", search);
  }

  try {
    dishes = await apiGet(`/api/menu?${params.toString()}`);
    renderMenu();
  } catch (error) {
    menuGrid.innerHTML = `<p class="error-text">${error.message}</p>`;
  }
}

function renderMenu() {
  menuGrid.innerHTML = "";

  if (!dishes.length) {
    menuGrid.innerHTML = `<p>No dish found. Try another keyword.</p>`;
    return;
  }

  dishes.forEach((dish) => {
    const card = document.createElement("article");
    card.className = "dish-card";
    card.innerHTML = `
      <img src="${dish.image}" alt="${dish.name}" />
      <div class="dish-body">
        <div class="dish-meta">
          <h4>${dish.name}</h4>
          <strong>${money(dish.price)}</strong>
        </div>
        <p class="dish-category">${dish.category} ${foodBadge(dish.food_type)}</p>
        <button class="btn btn-primary add-btn">Add to Cart</button>
      </div>
    `;
    card.querySelector(".add-btn").addEventListener("click", () => addToCart(dish, "menu"));
    menuGrid.appendChild(card);
  });
}

async function loadBurgers() {
  try {
    burgers = await apiGet("/api/burgers");
    renderBurgers();
  } catch (error) {
    burgersGrid.innerHTML = `<p class="error-text">${error.message}</p>`;
  }
}

function renderBurgers() {
  burgersGrid.innerHTML = "";
  burgers.forEach((burger) => {
    const card = document.createElement("article");
    card.className = "offer-card burger-card";
    card.innerHTML = `
      <img src="${burger.image}" alt="${burger.name}" class="burger-image" />
      <h3>${burger.name}</h3>
      <p>${burger.description}</p>
      <p class="special-price">${money(burger.price)} ${foodBadge(burger.food_type)}</p>
      <button class="btn btn-primary add-btn">Add to Cart</button>
    `;
    card.querySelector(".add-btn").addEventListener("click", () => addToCart(burger, "burger"));
    burgersGrid.appendChild(card);
  });
}

function renderCart() {
  cartItemsEl.innerHTML = "";
  if (!cart.length) {
    cartItemsEl.innerHTML = "<p>Your cart is empty.</p>";
  } else {
    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <strong>${item.name}</strong>
        <p>${money(item.price)} x ${item.qty}</p>
        <div>
          <button class="chip minus">-</button>
          <button class="chip plus">+</button>
        </div>
      `;
      row.querySelector(".minus").addEventListener("click", () => updateQty(item.key, -1));
      row.querySelector(".plus").addEventListener("click", () => updateQty(item.key, 1));
      cartItemsEl.appendChild(row);
    });
  }

  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  cartCountEl.textContent = count;
  cartTotalEl.textContent = money(total);
}

async function handleReservationSubmit(event) {
  event.preventDefault();
  reservationMessage.textContent = "Saving reservation...";
  reservationMessage.style.color = "var(--muted)";

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("resPhone").value.trim(),
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    guests: Number(document.getElementById("guests").value),
  };

  try {
    const result = await apiPost("/api/reservations", payload);
    reservationMessage.style.color = "#22c55e";
    reservationMessage.textContent = `Reservation #${result.reservation_id} confirmed for ${result.name} (${result.guests} guests) on ${result.date} at ${result.time}.`;
    reservationForm.reset();
  } catch (error) {
    reservationMessage.style.color = "#ef4444";
    reservationMessage.textContent = error.message;
  }
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();
  checkoutMessage.textContent = "Placing order...";
  checkoutMessage.style.color = "var(--muted)";

  const payload = {
    customer_name: document.getElementById("customerName").value.trim(),
    email: document.getElementById("customerEmail").value.trim(),
    phone: document.getElementById("customerPhone").value.trim(),
    address: document.getElementById("customerAddress").value.trim(),
    items: cart.map((item) => ({
      item_id: item.id,
      item_type: item.item_type,
      name: item.name,
      price: item.price,
      quantity: item.qty,
    })),
  };

  try {
    const result = await apiPost("/api/orders", payload);
    checkoutMessage.style.color = "#22c55e";
    checkoutMessage.textContent = `Order #${result.order_id} placed. Total: ${money(result.total_amount)}`;
    cart = [];
    saveCart();
    renderCart();
    checkoutForm.reset();
    setTimeout(() => {
      checkoutModal.classList.remove("open");
      cartDrawer.classList.remove("open");
      checkoutMessage.textContent = "";
    }, 1800);
  } catch (error) {
    checkoutMessage.style.color = "#ef4444";
    checkoutMessage.textContent = error.message;
  }
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "light") {
    document.body.classList.add("light");
    themeToggle.textContent = "☀";
  }
}

async function bootstrap() {
  try {
    categories = await apiGet("/api/categories");
    renderFilters();
    await Promise.all([loadMenu(), loadBurgers()]);
  } catch (error) {
    menuGrid.innerHTML = `<p class="error-text">Backend not running. Start server with: python3 backend/app.py</p>`;
  }
  renderCart();
}

openCartBtn.addEventListener("click", () => cartDrawer.classList.add("open"));
closeCartBtn.addEventListener("click", () => cartDrawer.classList.remove("open"));
checkoutBtn.addEventListener("click", () => {
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }
  checkoutModal.classList.add("open");
});
closeCheckoutBtn.addEventListener("click", () => checkoutModal.classList.remove("open"));

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
  themeToggle.textContent = isLight ? "☀" : "🌙";
});

menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
searchInput.addEventListener("input", loadMenu);
reservationForm.addEventListener("submit", handleReservationSubmit);
checkoutForm.addEventListener("submit", handleCheckoutSubmit);

applySavedTheme();
bootstrap();
