import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
    });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, image_url } = req.body;

        if (!message) {
            return res.status(400).json({
                error: 'Message is required'
            });
        }

        const messages = [{
            role: "user",
            content: [
                {
                    type: "text",
                    text: message
                },
                ...(image_url ? [{
                    type: "image_url",
                    image_url: { url: image_url }
                }] : [])
            ]
        }];

        const response = await hf.textGenerationStream({
            model: "Qwen/QVQ-72B-Preview",
            inputs: messages,
            parameters: {
                max_new_tokens: 500,
                temperature: 0.7
            }
        });

        res.json({
            response: response
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Error processing request',
            details: error.message
        });
    }
});

// Error handling
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
