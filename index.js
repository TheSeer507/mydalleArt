import express from 'express';
const app = express();
import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import { createReadStream, readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';

dotenv.config();

//Using unsecure TLS to avoid self-signed certificate error needs fixing for production
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const maxRequest = 5;
let remainingRequest = maxRequest;

app.use(express.json());
app.use(express.urlencoded( {extended: true}));

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
            <style>
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
    }
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
    }
    h1 {
        margin-bottom: 20px;
    }
    form {
        display: flex;
        flex-direction: column;
    }
    label, textarea, button {
        margin-bottom: 10px;
    }
    img {
        max-width: 100%;
        height: auto;
    }
    .prompt {
        font-weight: bold;
    }
</style>
                <title>OpenAI Image Generator</title>
                </head>
                <body>
                <div class="container">
                <h1>AI Image Generator</h1>
        <p>Remaining requests today: ${remainingRequest}</p>
        <form method="POST" action="/index">
          <label for="prompt">Enter the prompt:</label><br>
          <textarea id="prompt" name="prompt" rows="4" cols="50"></textarea><br>
          <button type="submit">Generate Image</button>
        </form>
      </div>
      </body>
    </html>
  `);
});

app.post("/index", async (req, res) => {
    if (remainingRequest  <= 0) {
      return res.status(429).send("Too many requests today.");
    }
  
    const prompt = req.body.prompt;
  
    try {
      const result = await openai.createImage({
        prompt,
        n: 1,
        size: "1024x1024",
        user: "papatelh",
      });
  
      const url = result.data.data[0].url;
      console.log(url);
  
      // Save Image to Disk
      const imgResult = await fetch(url);
      const blob = await imgResult.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      writeFileSync(`./img/${Date.now()}.png`, buffer);
  
      remainingRequest--;
      res.send(`
        <html>
          <head>
          <style>
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
    }
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
    }
    h1 {
        margin-bottom: 20px;
    }
    form {
        display: flex;
        flex-direction: column;
    }
    label, textarea, button {
        margin-bottom: 10px;
    }
    img {
        max-width: 100%;
        height: auto;
    }
    .prompt {
        font-weight: bold;
    }
</style>
            <title>AI Image Generator</title>
          </head>
          <body>
          <div class="container">
          <h1>AI Image Generator</h1>
          <p>Remaining requests today: ${remainingRequest}</p>
          <p class="prompt">Prompt: ${prompt}</p>
          <img src="${url}" />
          <br>
          <a href="/">Generate another image</a>
      </div>
        </html>
      `);
    } catch (error) {
      console.error(error);
      res.status(500).send("An error occurred while generating the image.");
    }
  });
  
  app.listen(3000, () => {
    console.log("Server started on http://localhost:3000");
  });