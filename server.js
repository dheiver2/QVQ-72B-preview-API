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

        // Log da requisição para debug
        console.log('Received request:', {
            message,
            image_url,
            timestamp: new Date().toISOString()
        });

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

        // Chamada à API do Hugging Face
        const generated = await hf.textGeneration({
            model: "Qwen/QVQ-72B-Preview",
            inputs: JSON.stringify(messages),
            parameters: {
                max_new_tokens: 500,
                temperature: 0.7,
                return_full_text: true
            }
        });

        // Log da resposta para debug
        console.log('HF Response:', generated);

        // Retorna a resposta estruturada
        res.json({
            response: {
                message: generated.generated_text,
                model: "Qwen/QVQ-72B-Preview",
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'Error processing request',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Global error handler:', {
        error: err.stack,
        timestamp: new Date().toISOString()
    });

    res.status(500).json({
        error: 'Something went wrong!',
        details: err.message,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} - ${new Date().toISOString()}`);
});
