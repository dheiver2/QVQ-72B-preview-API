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
app.use(express.json({ limit: '10mb' }));  // Aumentado limite do body
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
        
        // Validação da mensagem
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Message is required and must be a string',
                timestamp: new Date().toISOString()
            });
        }

        // Log da requisição para debug
        console.log('Received request:', {
            message,
            image_url,
            timestamp: new Date().toISOString()
        });

        // Prepara o conteúdo da mensagem
        const content = [
            {
                type: "text",
                text: message
            }
        ];

        // Adiciona imagem se fornecida e válida
        if (image_url && typeof image_url === 'string') {
            content.push({
                type: "image_url",
                image_url: { url: image_url }
            });
        }

        // Prepara os inputs para o modelo
        const inputMessages = [{
            role: "user",
            content: content
        }];

        // Chamada à API do Hugging Face
        const generated = await hf.textGeneration({
            model: "Qwen/QVQ-72B-Preview",
            inputs: message,  // Enviando apenas a mensagem direta
            parameters: {
                max_new_tokens: 500,
                temperature: 0.7,
                return_full_text: false,
                do_sample: true
            }
        });

        // Log da resposta para debug
        console.log('HF Response:', generated);

        // Verifica se a resposta contém o texto gerado
        if (!generated || !generated.generated_text) {
            throw new Error('No response generated from the model');
        }

        // Retorna a resposta estruturada
        res.json({
            response: {
                message: generated.generated_text,
                model: "Qwen/QVQ-72B-Preview",
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        // Log detalhado do erro
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Determina o código de status apropriado
        const statusCode = error.name === 'ValidationError' ? 400 : 500;

        // Retorna erro estruturado
        res.status(statusCode).json({
            error: 'Error processing request',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling para erros não capturados
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

// Inicialização do servidor
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} - ${new Date().toISOString()}`);
});
