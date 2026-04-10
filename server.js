const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your HTML file from 'public' folder

const GREY_API_KEY = process.env.GREY_SECRET_KEY; // 🔐 Store in .env file
const GREY_API_URL = 'https://api.grey.co/v1';     // Verify exact endpoint in Grey docs

// Endpoint to create a payment intent or charge
app.post('/api/create-payment', async (req, res) => {
    const { fullName, cardNumber, expiry, cvc, amount, currency } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Split expiry MM/YY
    const [expMonth, expYear] = expiry.split('/');

    try {
        // Step 1: Create a Payment Method (Tokenize card)
        const paymentMethod = await axios.post(`${GREY_API_URL}/payment_methods`, {
            type: 'card',
            card: {
                number: cardNumber,
                exp_month: expMonth,
                exp_year: `20${expYear}`,
                cvc: cvc
            }
        }, {
            headers: { 'Authorization': `Bearer ${GREY_API_KEY}`, 'Content-Type': 'application/json' }
        });

        const paymentMethodId = paymentMethod.data.id;

        // Step 2: Create the Charge
        const charge = await axios.post(`${GREY_API_URL}/charges`, {
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency.toLowerCase(),
            payment_method: paymentMethodId,
            description: `Payment from ${fullName}`
        }, {
            headers: { 'Authorization': `Bearer ${GREY_API_KEY}` }
        });

        res.json({ success: true, transactionId: charge.data.id });

    } catch (error) {
        console.error('Grey API Error:', error.response?.data || error.message);
        res.status(400).json({ success: false, message: error.response?.data?.error?.message || 'Transaction failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
