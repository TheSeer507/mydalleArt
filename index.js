import express from 'express';
const app = express();
import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import { createReadStream, readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import request from 'request';

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
app.use(express.urlencoded({ extended: true }));



app.get('/', (req, res) => {
  res.send(`
  <html>
  <head>
    <title>OpenAI Image Generator</title>
    <style>
     .spinner {
       border: 16px solid #f3f3f3; /* Light grey */
       border-top: 16px solid #3498db; /* Blue */
       border-radius: 50%;
       width: 120px;
       height: 120px;
       animation: spin 2s linear infinite;
     }

     @keyframes spin {
       0% { transform: rotate(0deg); }
       100% { transform: rotate(360deg); }
     }
   </style>
  </head>
  <body>
    <div class="container">
      <h1>AI Image Generator</h1>
      <p>Remaining requests today: ${remainingRequest}</p>
      <form id="image-form">
        <label for="prompt">Enter the prompt:</label><br>
        <textarea id="prompt" name="prompt" rows="4" cols="50"></textarea><br>
        <button type="submit">Generate Image</button>
      </form>
      <div id="loader" style="display: none;">
        <div class="spinner"></div>
      </div>
      <div id="result"></div>
    </div>
    <script>
       document.querySelector('#image-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const loader = document.getElementById('loader');
            const submitButton = document.querySelector('button[type="submit"]');
            const resultDiv = document.getElementById('result');
            
            loader.style.display = 'block';
            submitButton.disabled = true;
            
            const prompt = document.getElementById('prompt').value;
            const response = await fetch('/index', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ prompt }),
            });
            
            const result = await response.json();
            const url = result.url;
            
            resultDiv.innerHTML = \`
              <p class="prompt">Prompt: \${prompt}</p>
              <img src="\${url}" />
              <br>
              <a href="/">Generate another image</a>
            \`;
            
            loader.style.display = 'none';
            submitButton.disabled = false;
          });
    </script>
  </body>
</html>
  `);
});

app.post('/index', async (req, res) => {
  if (remainingRequest <= 0) {
    return res.status(429).json({ error: 'Too many requests today.' });
  }

  const prompt = req.body.prompt;

  try {
    const result = await openai.createImage({
      prompt,
      n: 1,
      size: '1024x1024',
      user: 'papatelh',
    });

    const url = result.data.data[0].url;
    console.log(url);

    // Save Image to Disk
    const imgResult = await fetch(url);
    const blob = await imgResult.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    writeFileSync(`./img/${Date.now()}.png`, buffer);

    remainingRequest--;
    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while generating the image.' });
  }
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});