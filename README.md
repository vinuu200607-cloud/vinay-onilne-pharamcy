# Vinay's Online Pharmacy Management System

A beginner-friendly college project built with HTML, CSS, JavaScript, Node.js, Express and MySQL.

## Features
- Customer medicine search, category filters, price and stock display.
- Add to basket and place orders.
- Orders and order items are saved in MySQL.
- Stock is reduced automatically after a successful order.
- Admin can add, edit and delete medicines.
- Admin can view orders and update order status.
- Medicine expiry dates are stored; expired medicines cannot be ordered.

## Four MySQL tables
1. `users` – customer/admin details
2. `medicines` – medicine inventory, price, stock and expiry date
3. `orders` – order header, customer and total
4. `order_items` – medicines and quantities inside an order

## Setup in VS Code

### 1. Install requirements
Install Node.js and MySQL Server / MySQL Workbench.

### 2. Create database
1. Open MySQL Workbench and connect to your local MySQL server.
2. Open `database.sql`.
3. Click the lightning icon to execute the complete script.
4. It creates the `vinays_pharmacy` database, four connected tables and sample medicines.

### 3. Configure MySQL password
1. In VS Code, open this project folder.
2. Copy `.env.example` and rename the copy to `.env`.
3. Set `DB_PASSWORD` to your MySQL root password.
4. Keep `DB_USER=root` if you use the root account.
5. Change `ADMIN_KEY` to a private value for your local demo.

Example:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=vinays_pharmacy
PORT=3000
ADMIN_KEY=admin123
```

### 4. Start the website
Open Terminal in the project folder and run:
```
npm install
npm start
```
Open this address in your browser:
`http://localhost:3000`

### 5. Admin panel
Click **Admin panel** on the website and enter the `ADMIN_KEY` value from your `.env` file.

## Important project note
This is an educational demonstration, not a production pharmacy. It does not process online payments, verify prescriptions, authenticate real customer accounts, or provide medicine-safety advice. Before real-world use, add secure authentication, HTTPS, audit logging, privacy controls and applicable pharmacy/legal compliance.
