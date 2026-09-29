const express = require("express");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));

const meals = ["Veg Thali", "Paneer Wrap", "Masala Sandwich", "Fruit Bowl"];
const slots = ["12:00 - 12:15", "12:15 - 12:30", "12:30 - 12:45", "12:45 - 1:00"];
const orders = [];
let nextId = 1;

const sourceCommit = process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || "local";
const commit = sourceCommit.slice(0, 7);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character];
  });
}

function queuePosition(order) {
  if (order.status !== "Pending") return null;
  return orders.filter((entry) => entry.status === "Pending").findIndex((entry) => entry.id === order.id) + 1;
}

function orderView(order) {
  return { ...order, queuePosition: queuePosition(order) };
}

function selectOptions(values, selected) {
  return values
    .map((value) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(value)}</option>`)
    .join("");
}

function renderPage({ selectedSlot = "", error = "" } = {}) {
  const visibleOrders = selectedSlot ? orders.filter((order) => order.pickupSlot === selectedSlot) : orders;
  const pendingCount = orders.filter((order) => order.status === "Pending").length;
  const readyCount = orders.filter((order) => order.status === "Ready").length;
  const orderRows = visibleOrders.length
    ? visibleOrders
      .map((order) => {
        const position = queuePosition(order);
        const action = order.status === "Pending"
          ? `<form class="inline-form" method="POST" action="/orders/${order.id}/ready"><button class="ready-button" type="submit">Mark ready</button></form>`
          : "<span class=\"ready-label\">Ready for pickup</span>";
        return `<tr>
          <td>#${order.id}</td>
          <td><strong>${escapeHtml(order.studentName)}</strong><br><span class="note">${escapeHtml(order.notes || "No note")}</span></td>
          <td>${escapeHtml(order.meal)}</td>
          <td>${escapeHtml(order.pickupSlot)}</td>
          <td>${position ? `#${position}` : "-"}</td>
          <td><span class="status ${order.status.toLowerCase()}">${escapeHtml(order.status)}</span></td>
          <td>${action}</td>
        </tr>`;
      })
      .join("")
    : "<tr><td colspan=\"7\" class=\"empty\">No orders match this pickup slot yet.</td></tr>";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Campus Meal Queue Manager</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <main class="container">
      <header>
        <p class="eyebrow">CCA 2 Dynamic Web Application</p>
        <h1>Campus Meal Queue Manager</h1>
        <p class="intro">Students reserve a canteen meal and pickup slot. Staff can see the queue and mark each order ready.</p>
      </header>

      <section class="metrics" aria-label="Order summary">
        <div><span>${orders.length}</span><small>Total orders</small></div>
        <div><span>${pendingCount}</span><small>Waiting in queue</small></div>
        <div><span>${readyCount}</span><small>Ready for pickup</small></div>
      </section>

      <section class="panel" aria-labelledby="order-heading">
        <h2 id="order-heading">Reserve your meal</h2>
        ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
        <form class="order-form" method="POST" action="/orders">
          <label>Student name<input name="studentName" maxlength="50" required placeholder="e.g. Aditi Kulkarni"></label>
          <label>Meal<select name="meal" required>${selectOptions(meals)}</select></label>
          <label>Pickup slot<select name="pickupSlot" required>${selectOptions(slots)}</select></label>
          <label>Optional note<input name="notes" maxlength="80" placeholder="No onions, if possible"></label>
          <button type="submit">Join the queue</button>
        </form>
      </section>

      <section class="orders-section" aria-labelledby="queue-heading">
        <div class="section-heading">
          <div><h2 id="queue-heading">Live order queue</h2><p>Queue position updates automatically when an order is marked ready.</p></div>
          <form method="GET" action="/" class="filter-form">
            <label>Filter by pickup slot<select name="slot" onchange="this.form.submit()"><option value="">All slots</option>${selectOptions(slots, selectedSlot)}</select></label>
          </form>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Order</th><th>Student</th><th>Meal</th><th>Pickup</th><th>Queue</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${orderRows}</tbody>
        </table></div>
      </section>
    </main>
    <footer>Campus Meal Queue Manager | Running commit <strong>${escapeHtml(commit)}</strong> | <a href="/api/orders">JSON API</a> | <a href="/health">Health</a></footer>
  </body>
</html>`;
}

function validateOrder(input) {
  const studentName = String(input.studentName || "").trim();
  const meal = String(input.meal || "").trim();
  const pickupSlot = String(input.pickupSlot || "").trim();
  const notes = String(input.notes || "").trim();

  if (!/^[A-Za-z][A-Za-z .'-]{1,48}$/.test(studentName)) {
    return { error: "Enter a valid student name using 2 to 49 letters." };
  }
  if (!meals.includes(meal)) return { error: "Choose a meal from the available menu." };
  if (!slots.includes(pickupSlot)) return { error: "Choose one of the available pickup slots." };
  if (notes.length > 80) return { error: "Optional notes can be at most 80 characters." };
  return { value: { studentName, meal, pickupSlot, notes } };
}

app.get("/", (req, res) => {
  const selectedSlot = slots.includes(req.query.slot) ? req.query.slot : "";
  res.type("html").send(renderPage({ selectedSlot }));
});

app.post("/orders", (req, res) => {
  const result = validateOrder(req.body);
  if (result.error) return res.status(400).type("html").send(renderPage({ error: result.error }));

  orders.push({ id: nextId, ...result.value, status: "Pending" });
  nextId += 1;
  return res.redirect(303, "/");
});

app.post("/orders/:id/ready", (req, res) => {
  const order = orders.find((entry) => entry.id === Number(req.params.id));
  if (!order) return res.status(404).send("Order not found");
  order.status = "Ready";
  return res.redirect(303, "/");
});

app.get("/api/orders", (req, res) => res.json(orders.map(orderView)));
app.get("/health", (req, res) => res.json({ status: "ok", commit }));

function resetOrders() {
  orders.length = 0;
  nextId = 1;
}

module.exports = { app, resetOrders, validateOrder };
