CREATE DATABASE IF NOT EXISTS vinays_pharmacy;
USE vinays_pharmacy;

-- 1. Customers and administrators
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE,
    phone VARCHAR(20),
    role ENUM('customer','admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Medicine inventory
CREATE TABLE IF NOT EXISTS medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(80),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer orders
CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('Pending','Confirmed','Packed','Delivered','Cancelled') DEFAULT 'Pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 4. Items belonging to each order
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
);

INSERT INTO medicines (name, category, description, price, stock, expiry_date) VALUES
('Paracetamol 500mg', 'Pain Relief', 'For temporary relief of pain and fever.', 25.00, 100, '2027-12-31'),
('Vitamin C Tablets', 'Vitamins', 'Vitamin C supplement.', 90.00, 60, '2027-10-31'),
('Cetirizine 10mg', 'Allergy Care', 'Antihistamine medicine.', 35.00, 80, '2027-08-31'),
('Antiseptic Cream', 'First Aid', 'For minor cuts and scrapes.', 55.00, 40, '2027-11-30'),
('ORS Sachets', 'Wellness', 'Oral rehydration salts.', 20.00, 120, '2027-09-30'),
('Digital Thermometer', 'Healthcare Devices', 'Digital temperature measuring device.', 150.00, 25, '2029-12-31');
