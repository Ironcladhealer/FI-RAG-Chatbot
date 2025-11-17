import {DataAPIClient} from '@datastax/astra-db-ts'
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenAI } from '@google/genai';
import OpenAI from "openai";

import "dotenv/config";
import { text } from 'stream/consumers';
import { create } from 'domain';

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {ASTRA_DB_ENDPOINT, ASTRA_DB_TOKEN, ASTRA_DB_NAME, ASTRA_DB_COLLECTION, GEMINI_API, OPENAI_API} = process.env;

const ai = new OpenAI({apiKey: OPENAI_API });

const f1Data = [
    "https://en.wikipedia.org/wiki/Formula_One",
    "https://www.formula1.com/en/latest/all",
    "https://www.formula1.com/en/results.html",
    "https://www.formula1.com/en/teams.html",
    "https://www.formula1.com/en/drivers.html"
]

const client = new DataAPIClient(ASTRA_DB_TOKEN);
const db = client.db(ASTRA_DB_ENDPOINT, {namespace: ASTRA_DB_NAME});

const split = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
});

const createCollection = async (SimilarityMetric: SimilarityMetric = "dot_product") => {
    const res = await db.createCollection(ASTRA_DB_COLLECTION, {
        vector: {
            dimension: 1024,
            metric: SimilarityMetric
        }
    });
    console.log(res)
}

const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION);
    for await (const url of f1Data) {
        const content = await scrapePage(url);
        const chunks = await split.splitText(content);
        for (const chunk of chunks) {
            const embedding = await ai.embeddings.create({
                model: "text-embedding-3-small",
                input: chunk,
                encoding_format: "float"
            })
            const vector = embedding.data[0].embedding

            const res = await collection.insertOne({
                $vector: vector,
                text: chunk 
            })
            console.log(res);
        }
}
}

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true
        },
        gotoOptions:{
            waitUntil: "domcontentloaded"
        },
        evaluate: async(page, browser) => {
            const result = await page.evaluate(() => document.body.innerHTML);
            await browser.close();
            return result;
        }
    })
    return (await loader.scrape())?.replace(/\s+/g, ' ') || '';
}

createCollection().then(() => loadSampleData())
