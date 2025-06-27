// ========================================
// BACKEND SERVER IMPLEMENTATION (Node.js/Express)
// ========================================

// 1. Install dependencies:
// npm install @sendgrid/mail express cors dotenv express-rate-limit

// ========================================

const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// CORS setup (very important!)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Set SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Rate limiting (optional)
const emailRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many email requests, please try again later.'
});
app.use('/api/send-email', emailRateLimit);

// Unified endpoint to send emails (supports custom fromEmail/fromName)
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, html, fromEmail, fromName } = req.body;

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and text/html' 
      });
    }

    // Email configuration
    const msg = {
      to: to,
      from: {
        email: fromEmail || process.env.FROM_EMAIL || 'anya.sunglassretailer@gmail.com',
        name: fromName || process.env.FROM_NAME || 'Anya Ganger'
      },
      subject: subject,
      text: text,
      html: html || text,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    // Send email
    const response = await sgMail.send(msg);

    // Log success
    console.log('Email sent successfully:', {
      to: to,
      subject: subject,
      messageId: response[0].headers['x-message-id']
    });

    res.status(200).json({
      success: true,
      messageId: response[0].headers['x-message-id'],
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('SendGrid error:', error);

    if (error.response) {
      res.status(error.code || 500).json({
        error: 'SendGrid API error',
        details: error.response.body.errors || error.message
      });
    } else {
      res.status(500).json({
        error: 'Server error',
        details: error.message
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

// ========================================
// SENDGRID WEBHOOK HANDLER (Optional - for tracking)
// ========================================

// Endpoint to handle SendGrid event webhooks
app.post('/api/sendgrid-webhook', express.raw({type: 'application/json'}), (req, res) => {
  const events = JSON.parse(req.body.toString());
  
  events.forEach(event => {
    console.log('SendGrid Event:', {
      email: event.email,
      event: event.event,
      timestamp: event.timestamp,
      messageId: event.sg_message_id
    });
    
    // Update your database based on the event
    switch(event.event) {
      case 'delivered':
        // Update email status to delivered
        break;
      case 'open':
        // Increment open count
        break;
      case 'click':
        // Track click events
        break;
      case 'bounce':
      case 'dropped':
        // Handle failed delivery
        break;
    }
  });
  
  res.status(200).send('OK');
});

// ========================================
// TESTING WITH CURL
// ========================================

/*
Test your backend API with curl:

curl -X POST http://localhost:3001/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "samanthamdurrant@gmail.com",
    "subject": "Test Email",
    "text": "This is a test email from the sunglasses dashboard!"
  }'
*/

// ========================================
// ERROR HANDLING AND VALIDATION
// ========================================

// Enhanced error handling function
const handleSendGridError = (error) => {
  if (error.response) {
    const { errors } = error.response.body;
    
    // Common SendGrid error handling
    if (errors) {
      errors.forEach(err => {
        switch(err.field) {
          case 'from.email':
            console.error('Invalid sender email - make sure it\'s verified in SendGrid');
            break;
          case 'personalizations.0.to':
            console.error('Invalid recipient email address');
            break;
          default:
            console.error('SendGrid error:', err.message);
        }
      });
    }
  }
  
  return error.message;
};

// Email validation function
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ========================================
// ENVIRONMENT VARIABLES (.env file)
// ========================================

// Move the following lines to a separate .env file in your project root:
// SENDGRID_API_KEY=your_sendgrid_api_key
// FROM_EMAIL=ganger@wharton.upenn.edu
// FROM_NAME=Anya Ganger
// PORT=3001

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
