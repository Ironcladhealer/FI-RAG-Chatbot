import { GoogleGenAI } from '@google/genai'; 
import { DataAPIClient } from "@datastax/astra-db-ts";
// Removed: import OpenAI from "openai";
// Removed: import { OpenAIStream, StreamingTextResponse } from "ai"; 
// We will use native streaming functionality.

// IMPORTANT: Ensure 'ReadableStream' is available in your environment (e.g., Node.js v18+, Next.js/Vercel Edge runtime).
// If running in a standard Node.js environment without a global ReadableStream, you might need:
// import { ReadableStream } from 'node:stream/web';

const {ASTRA_DB_ENDPOINT, ASTRA_DB_TOKEN, ASTRA_DB_NAME, ASTRA_DB_COLLECTION, GEMINI_API} = process.env;

const ai = new GoogleGenAI({ apiKey: GEMINI_API });
const client = new DataAPIClient(ASTRA_DB_TOKEN);
// Assuming db initialization is correct from the previous step
const db = client.db(ASTRA_DB_ENDPOINT, {namespace: ASTRA_DB_NAME});

/**
 * Handles the RAG chat request using Gemini for embedding and generation.
 * @param req The incoming request object.
 * @returns A streaming text response.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        // Handle both { message: string } and { messages: array } formats
        const latestMessage = typeof body.message === 'string' 
            ? body.message 
            : body.messages?.[body.messages.length - 1]?.content;

        if (!latestMessage) {
            return new Response(JSON.stringify({ error: "No message provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        let docContent = "";

        // --- 1. Fix: Embedding Call ---
        // Must use embedContent and a dedicated embedding model (text-embedding-004)
        const embeddingResponse = await ai.models.embedContent({
            model: "text-embedding-004", // Correct embedding model
            contents: latestMessage,
        });

        // --- 2. Fix: Embedding Response Parsing ---
        // Access the vector from the correct structure and ensure it's a number[]
        let vector: number[] = [];
        const embeddingsAny = (embeddingResponse as any).embeddings;

        // If embeddings is an iterable with a values() method (e.g., Map/Set/Iterable)
        if (embeddingsAny && typeof embeddingsAny.values === "function") {
            // Convert iterator to array of numbers (flatten if nested)
            vector = Array.from(embeddingsAny.values()).flat() as number[];
        } else if (Array.isArray(embeddingsAny) && embeddingsAny.length > 0) {
            // Common shapes: array of numbers, or array of objects containing .values / .embedding / .vector
            const first = embeddingsAny[0];
            if (Array.isArray(first)) {
                vector = first as number[];
            } else if (Array.isArray(first?.values)) {
                vector = first.values as number[];
            } else if (Array.isArray(first?.embedding)) {
                vector = first.embedding as number[];
            } else if (Array.isArray(first?.vector)) {
                vector = first.vector as number[];
            } else if (typeof first?.value === "function") {
                vector = Array.from(first.value()).flat() as number[];
            }
        }

        try {
            const collection = await db.collection(ASTRA_DB_COLLECTION);
            
            // Query Astra DB using the generated vector
            const cursor = collection.find(null, {
                // $vector is used here
                sort: { $vector: vector }, 
                limit: 10,
            });

            const documents = await cursor.toArray();
            const docsMap = documents?.map(doc => doc.text);

            docContent = JSON.stringify(docsMap);
        } catch (error) {
            console.error('Error querying db:', error);
            // Continue execution even if DB query fails, using an empty context
            docContent = "[]"; 
        }

        // --- 3. Final Generation: Construct Prompt and use Gemini Streaming ---
        
        // Context is embedded into the user prompt for the RAG step
        const promptWithContext = `You are a helpful assistant that helps users find information about Formula 1 based on the context provided. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. Context: ${docContent} Question: ${latestMessage}`;

        // Use a powerful, fast model for chat/RAG
        const geminiStream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash", // Good model for RAG tasks
            contents: [
                { role: "user", parts: [{ text: promptWithContext }] }
            ],
        });

        // --- 4. Fix: Return JSON Response ---
        // Collect the full response text before returning
        let fullResponse = "";
        for await (const chunk of geminiStream) {
            fullResponse += chunk.text || "";
        }

        return new Response(JSON.stringify({ response: fullResponse }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("An error occurred in POST handler:", error);
        return new Response(JSON.stringify({ error: (error as Error).message || "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}