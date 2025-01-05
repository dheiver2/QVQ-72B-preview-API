import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { InferenceClient } from 'huggingface-hub';
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

// Initialize Hugging Face client
const client = new InferenceClient({
    apiKey: process.env.HUGGINGFACE_API_KEY
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
    });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    const { message, image_url } = req.body;

    if (!message) {
        return res.status(400).json({
            error: 'Message is required'
        });
    }

    try {
        const messages = [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: message
                    },
                    image_url ? {
                        type: "image_url",
                        image_url: {
                            url: image_url
                        }
                    } : null
                ].filter(Boolean)
            }
        ];

        const completion = await client.chat.completions.create({
            model: "Qwen/QVQ-72B-Preview",
            messages: messages,
            max_tokens: 500
        });

        res.json({
            response: completion.choices[0].message
        });

    } catch (error) {
        console.error('Error calling Hugging Face API:', error);
        
        res.status(500).json({
            error: 'Error processing request',
            details: error.message
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
        const completion = await client.chat.completions.create({
            model: "Qwen/QVQ-72B-Preview",
            messages: messages,
            max_tokens: 500
        });

        res.json({
            response: completion.choices[0].message
        });

    } catch (error) {
        console.error('Error processing chat history:', error);
        
        res.status(500).json({
            error: 'Error processing chat history',
            details: error.message
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
