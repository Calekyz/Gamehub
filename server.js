const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serves your HTML file

// File to store orders
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Initialize orders file if it doesn't exist
if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

// Helper: Save order to JSON file
function saveOrder(orderData) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    const newOrder = {
        id: orders.length + 1,
        orderNumber: `PS5-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...orderData
    };
    orders.push(newOrder);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    return newOrder;
}

// Helper: Send email notification (using EmailJS or Nodemailer)
// For now, we'll log to console. You can upgrade to actual email later.
function sendEmailNotification(order) {
    console.log(`
    ========================================
    🎮 NEW PS5 ORDER RECEIVED! 🎮
    ========================================
    Order #: ${order.orderNumber}
    Customer: ${order.shipping.firstName} ${order.sipping.lastName}
    Email: ${order.customerEmail}
    Phone: ${order.shipping.phone}
    Address: ${order.shipping.address}, ${order.shipping.city}, ${order.shipping.state} ${order.shipping.zip}, ${order.shipping.country}
    Quantity: ${order.quantity}
    Total: $${order.totalAmount}
    Payment Method: ${order.paymentMethod}
    ========================================
    `);
}

// ============= API ENDPOINTS =============

// 1. Submit Airtm payment request
app.post('/api/submit-airtm', (req, res) => {
    const { customerEmail, airtmUsername, shipping, quantity, totalAmount } = req.body;

    // Validate required fields
    if (!customerEmail || !shipping?.firstName || !shipping?.address) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields. Please fill all shipping information.' 
        });
    }

    // Save order
    const order = saveOrder({
        customerEmail,
        paymentMethod: 'airtm',
        airtmUsername: airtmUsername || null,
        shipping,
        quantity,
        totalAmount,
        status: 'pending_payment'
    });

    // Send notification
    sendEmailNotification(order);

    res.json({
        success: true,
        message: 'Payment request sent successfully!',
        orderNumber: order.orderNumber
    });
});

// 2. Submit Crypto payment request
app.post('/api/submit-crypto', (req, res) => {
    const { customerEmail, shipping, quantity, totalAmount } = req.body;

    // Validate required fields
    if (!customerEmail || !shipping?.firstName || !shipping?.address) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields. Please fill all shipping information.' 
        });
    }

    // Save order
    const order = saveOrder({
        customerEmail,
        paymentMethod: 'crypto_usdt',
        shipping,
        quantity,
        totalAmount,
        status: 'pending_payment',
        cryptoAddress: 'TVvYRDdPyQCCg22onuaau56rS5PNP3Gx7s'
    });

    // Send notification
    sendEmailNotification(order);

    res.json({
        success: true,
        message: 'Crypto payment details sent!',
        orderNumber: order.orderNumber,
        cryptoAddress: 'TVvYRDdPyQCCg22onuaau56rS5PNP3Gx7s'
    });
});

// 3. Get all orders (for your admin view)
app.get('/api/orders', (req, res) => {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    res.json(orders);
});

// 4. Get single order by ID
app.get('/api/orders/:id', (req, res) => {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    const order = orders.find(o => o.id == req.params.id);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json(order);
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📦 Orders will be saved to: ${ORDERS_FILE}`);
});
