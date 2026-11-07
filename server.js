require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vinays_pharmacy",
  waitForConnections: true,
  connectionLimit: 10
});

function adminOnly(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: "Invalid admin key." });
  }
  next();
}

app.get("/api/medicines", async (req, res) => {
  try {
    const search = `%${req.query.search || ""}%`;
    const [rows] = await pool.execute(
      `SELECT medicine_id, name, category, description, price, stock, expiry_date
       FROM medicines
       WHERE name LIKE ? OR category LIKE ?
       ORDER BY name`,
      [search, search]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Could not load medicines." });
  }
});

app.post("/api/orders", async (req, res) => {
  const { name, phone, email, items } = req.body;
  if (!name || !phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Enter your name, phone and add at least one medicine." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let userId;
    if (email) {
      const [existing] = await conn.execute("SELECT user_id FROM users WHERE email = ?", [email]);
      if (existing.length) {
        userId = existing[0].user_id;
        await conn.execute("UPDATE users SET name=?, phone=? WHERE user_id=?", [name, phone, userId]);
      }
    }
    if (!userId) {
      const [user] = await conn.execute(
        "INSERT INTO users (name, email, phone, role) VALUES (?, ?, ?, 'customer')",
        [name, email || null, phone]
      );
      userId = user.insertId;
    }

    let total = 0;
    const orderLines = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1) throw new Error("Invalid medicine quantity.");
      const [meds] = await conn.execute(
        "SELECT medicine_id, name, price, stock, expiry_date FROM medicines WHERE medicine_id=? FOR UPDATE",
        [item.medicine_id]
      );
      if (!meds.length) throw new Error("A selected medicine was not found.");
      const med = meds[0];
      const expiry = new Date(med.expiry_date);
      if (med.stock < qty) throw new Error(`Not enough stock for ${med.name}.`);
      if (expiry < new Date(new Date().toDateString())) throw new Error(`${med.name} has expired and cannot be ordered.`);
      total += Number(med.price) * qty;
      orderLines.push({ id: med.medicine_id, qty, price: med.price });
    }

    const [order] = await conn.execute(
      "INSERT INTO orders (user_id, total_amount) VALUES (?, ?)",
      [userId, total.toFixed(2)]
    );
    for (const line of orderLines) {
      await conn.execute(
        "INSERT INTO order_items (order_id, medicine_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [order.insertId, line.id, line.qty, line.price]
      );
      await conn.execute(
        "UPDATE medicines SET stock = stock - ? WHERE medicine_id = ?",
        [line.qty, line.id]
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Order placed successfully!", order_id: order.insertId, total });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message || "Order could not be placed." });
  } finally {
    conn.release();
  }
});

app.get("/api/admin/orders", adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT o.order_id, u.name AS customer, u.phone, o.total_amount, o.status, o.order_date,
       GROUP_CONCAT(CONCAT(m.name, ' x ', oi.quantity) SEPARATOR ', ') AS items
       FROM orders o JOIN users u ON o.user_id=u.user_id
       JOIN order_items oi ON o.order_id=oi.order_id
       JOIN medicines m ON oi.medicine_id=m.medicine_id
       GROUP BY o.order_id ORDER BY o.order_date DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Could not load orders." });
  }
});

app.post("/api/admin/medicines", adminOnly, async (req, res) => {
  const { name, category, description, price, stock, expiry_date } = req.body;
  if (!name || Number(price) < 0 || !Number.isInteger(Number(stock)) || !expiry_date) {
    return res.status(400).json({ message: "Enter valid medicine details." });
  }
  try {
    const [result] = await pool.execute(
      "INSERT INTO medicines (name, category, description, price, stock, expiry_date) VALUES (?, ?, ?, ?, ?, ?)",
      [name, category || "", description || "", price, stock, expiry_date]
    );
    res.status(201).json({ message: "Medicine added.", medicine_id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Could not add medicine." });
  }
});

app.put("/api/admin/medicines/:id", adminOnly, async (req, res) => {
  const { name, category, description, price, stock, expiry_date } = req.body;
  try {
    await pool.execute(
      "UPDATE medicines SET name=?, category=?, description=?, price=?, stock=?, expiry_date=? WHERE medicine_id=?",
      [name, category || "", description || "", price, stock, expiry_date, req.params.id]
    );
    res.json({ message: "Medicine updated." });
  } catch (err) {
    res.status(500).json({ message: "Could not update medicine." });
  }
});

app.delete("/api/admin/medicines/:id", adminOnly, async (req, res) => {
  try {
    await pool.execute("DELETE FROM medicines WHERE medicine_id=?", [req.params.id]);
    res.json({ message: "Medicine deleted." });
  } catch (err) {
    res.status(400).json({ message: "This medicine may be part of an order, so it cannot be deleted." });
  }
});

app.patch("/api/admin/orders/:id", adminOnly, async (req, res) => {
  const allowed = ["Pending", "Confirmed", "Packed", "Delivered", "Cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid status." });
  try {
    await pool.execute("UPDATE orders SET status=? WHERE order_id=?", [req.body.status, req.params.id]);
    res.json({ message: "Order status updated." });
  } catch (err) {
    res.status(500).json({ message: "Could not update order." });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ database: "connected" });
  } catch {
    res.status(500).json({ database: "not connected", message: "Check your .env MySQL settings." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Vinay's Pharmacy running at http://localhost:${port}`));
