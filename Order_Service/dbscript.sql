CREATE DATABASE IF NOT EXISTS order_service;
USE order_service;

CREATE TABLE IF NOT EXISTS order (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id), -- Ensure each user has unique products in the cart
    FOREIGN KEY (user_id) REFERENCES customer_service.customers(id),
    FOREIGN KEY (product_id) REFERENCES product_service.products(id)
);

