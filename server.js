// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Qwen API configuration
const QWEN_API_URL = process.env.QWEN_API_URL || "https://api.qwen.ai";
const API_KEY = process.env.QWEN_API_KEY;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main API endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: 'Message is required'
    });
  }

  try {
    const response = await axios.post(`${QWEN_API_URL}/on_example`, {
      input: message
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error calling Qwen API:', error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      error: 'Error processing request',
      details: error.response?.data || error.message
    });
  }
});

// Chat history endpoint
app.post('/api/chat/history', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({
      error: 'Messages must be an array'
    });
  }

  try {
    const response = await axios.post(`${QWEN_API_URL}/on_example`, {
      messages: messages
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error processing chat history:', error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      error: 'Error processing chat history',
      details: error.response?.data || error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    details: err.message
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
