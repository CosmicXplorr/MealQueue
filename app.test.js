const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { app, resetOrders } = require("../app");

let server;

async function withServer(run) {
  server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  await run(baseUrl);
}

afterEach(() => {
  if (server) server.close();
  server = undefined;
  resetOrders();
});

test("health route returns ok status and a commit value", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "ok");
  });
});

test("a valid meal reservation appears in the JSON API with queue position one", async () => {
  await withServer(async (baseUrl) => {
    const create = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      body: new URLSearchParams({
        studentName: "Aditi Kulkarni",
        meal: "Veg Thali",
        pickupSlot: "12:00 - 12:15",
        notes: "Less spicy"
      }),
      redirect: "manual"
    });
    assert.equal(create.status, 303);

    const orders = await (await fetch(`${baseUrl}/api/orders`)).json();
    assert.deepEqual(orders[0], {
      id: 1,
      studentName: "Aditi Kulkarni",
      meal: "Veg Thali",
      pickupSlot: "12:00 - 12:15",
      notes: "Less spicy",
      status: "Pending",
      queuePosition: 1
    });
  });
});

test("invalid student names are rejected without adding an order", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      body: new URLSearchParams({ studentName: "1", meal: "Veg Thali", pickupSlot: "12:00 - 12:15" }),
      redirect: "manual"
    });
    assert.equal(response.status, 400);
    assert.match(await response.text(), /Enter a valid student name/);
    assert.equal((await (await fetch(`${baseUrl}/api/orders`)).json()).length, 0);
  });
});

test("marking an order ready updates its status and removes its queue position", async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/orders`, {
      method: "POST",
      body: new URLSearchParams({ studentName: "Riya Sharma", meal: "Paneer Wrap", pickupSlot: "12:15 - 12:30" })
    });
    const ready = await fetch(`${baseUrl}/orders/1/ready`, { method: "POST", redirect: "manual" });
    assert.equal(ready.status, 303);
    const orders = await (await fetch(`${baseUrl}/api/orders`)).json();
    assert.equal(orders[0].status, "Ready");
    assert.equal(orders[0].queuePosition, null);
  });
});
