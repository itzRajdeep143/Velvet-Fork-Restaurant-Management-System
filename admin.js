const API_BASE = window.location.origin;
const ADMIN_TOKEN_KEY = "restaurant_admin_token";

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const statsGrid = document.getElementById("statsGrid");
const ordersTableBody = document.getElementById("ordersTableBody");
const reservationsTableBody = document.getElementById("reservationsTableBody");
const ordersPanel = document.getElementById("ordersPanel");
const reservationsPanel = document.getElementById("reservationsPanel");
const logoutBtn = document.getElementById("logoutBtn");

function money(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function getToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
}

async function adminFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers["X-Admin-Token"] = token;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
      showLogin();
    }
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

async function handleLogin(event) {
  event.preventDefault();
  loginMessage.textContent = "Signing in...";
  loginMessage.style.color = "var(--muted)";

  try {
    const result = await adminFetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: document.getElementById("adminPassword").value }),
    });
    setToken(result.token);
    loginForm.reset();
    showDashboard();
    await loadDashboard();
  } catch (error) {
    loginMessage.style.color = "#ef4444";
    loginMessage.textContent = error.message;
  }
}

function renderStats(stats) {
  statsGrid.innerHTML = `
    <article class="stat-card"><h3>Total Orders</h3><p>${stats.total_orders}</p></article>
    <article class="stat-card"><h3>Total Reservations</h3><p>${stats.total_reservations}</p></article>
    <article class="stat-card"><h3>Revenue</h3><p>${money(stats.total_revenue)}</p></article>
    <article class="stat-card"><h3>Pending Orders</h3><p>${stats.pending_orders}</p></article>
  `;
}

function statusSelect(type, id, currentStatus) {
  const options = ["pending", "confirmed", "completed", "cancelled"];
  const select = document.createElement("select");
  select.className = "status-select";
  options.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === currentStatus;
    select.appendChild(option);
  });

  select.addEventListener("change", async () => {
    try {
      await adminFetch(`/api/admin/${type}/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: select.value }),
      });
    } catch (error) {
      alert(error.message);
      select.value = currentStatus;
    }
  });

  return select;
}

function renderOrders(orders) {
  ordersTableBody.innerHTML = "";

  if (!orders.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="7">No orders yet.</td></tr>`;
    return;
  }

  orders.forEach((order) => {
    const row = document.createElement("tr");
    const itemsHtml = (order.items || [])
      .map((item) => `<li>${item.item_name} x${item.quantity} (${money(item.price)})</li>`)
      .join("");

    row.innerHTML = `
      <td>#${order.id}</td>
      <td>${order.customer_name}</td>
      <td>
        ${order.email}<br />
        ${order.phone || "-"}<br />
        <small>${order.address || "-"}</small>
      </td>
      <td><ul class="item-list">${itemsHtml || "<li>No items</li>"}</ul></td>
      <td>${money(order.total_amount)}</td>
      <td></td>
      <td>${order.created_at || "-"}</td>
    `;

    row.children[5].appendChild(statusSelect("orders", order.id, order.status));
    ordersTableBody.appendChild(row);
  });
}

function renderReservations(reservations) {
  reservationsTableBody.innerHTML = "";

  if (!reservations.length) {
    reservationsTableBody.innerHTML = `<tr><td colspan="7">No reservations yet.</td></tr>`;
    return;
  }

  reservations.forEach((reservation) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>#${reservation.id}</td>
      <td>${reservation.name}</td>
      <td>
        ${reservation.email}<br />
        ${reservation.phone || "-"}
      </td>
      <td>${reservation.reservation_date}</td>
      <td>${reservation.reservation_time}</td>
      <td>${reservation.guests}</td>
      <td></td>
    `;
    row.children[6].appendChild(
      statusSelect("reservations", reservation.id, reservation.status)
    );
    reservationsTableBody.appendChild(row);
  });
}

async function loadDashboard() {
  const [stats, orders, reservations] = await Promise.all([
    adminFetch("/api/admin/stats"),
    adminFetch("/api/admin/orders"),
    adminFetch("/api/admin/reservations"),
  ]);

  renderStats(stats);
  renderOrders(orders);
  renderReservations(reservations);
}

function switchTab(tabName) {
  document.querySelectorAll(".admin-tabs .chip").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  ordersPanel.classList.toggle("hidden", tabName !== "orders");
  reservationsPanel.classList.toggle("hidden", tabName !== "reservations");
}

document.querySelectorAll(".admin-tabs .chip").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

loginForm.addEventListener("submit", handleLogin);
logoutBtn.addEventListener("click", () => {
  clearToken();
  showLogin();
});

async function bootstrap() {
  if (!getToken()) {
    showLogin();
    return;
  }

  showDashboard();
  try {
    await loadDashboard();
  } catch (error) {
    loginMessage.style.color = "#ef4444";
    loginMessage.textContent = error.message;
    showLogin();
  }
}

bootstrap();
