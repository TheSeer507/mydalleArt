import dotenv from 'dotenv';
import express from 'express';
import { Configuration, OpenAIApi } from 'openai';
import { createReadStream, readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import fileUpload from 'express-fileupload';
import FormData from 'form-data';

dotenv.config();
//Using unsecure TLS to avoid self-signed certificate error needs fixing for production
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);
const app = express();

app.use(express.json());
app.use(express.urlencoded( {extended: true}));
app.use(fileUpload());
app.use(express.static('img')); //Servce images from img folder

app.get('/', (req, res) => {
    res.send(`
      <html>
        <head>
          <!-- Add your styles here -->
        </head>
        <body>
          <h1>AI Image Variations</h1>
          <form method="POST" action="/upload" enctype="multipart/form-data">
            <label for="file">Upload image:</label>
            <input type="file" id="file" name="file" accept="image/*" />
            <button type="submit">Generate Variations</button>
          </form>
          <br />
          <form method="POST" action="/url">
            <label for="url">Image URL:</label>
            <input type="url" id="url" name="url" />
            <button type="submit">Generate Variations</button>
          </form>
        </body>
      </html>
    `);
  });

  app.post('/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
  
    const file = req.files.file;
    const imageName = `./img/${Date.now()}${file.name}`;
    await file.mv(imageName);
  
    try {
      const variations = await createVariations(createReadStream(imageName));
      renderVariations(res, variations);
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while generating the image variations.');
    }
  });
  
  app.post('/url', async (req, res) => {
    const imageUrl = req.body.url;
    const imgResult = await fetch(imageUrl);
    const buffer = await imgResult.arrayBuffer();
    const imageName = `./img/${Date.now()}.png`;
    const nodeBuffer = Buffer.from(buffer);
    writeFileSync(imageName, nodeBuffer);
  
    try {
      const variations = await createVariations(createReadStream(imageName));
      renderVariations(res, variations);
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while generating the image variations.');
    }
  });
  
  async function createVariations(readStream) {
    // Convert the readStream to a base64-encoded string
    const fileBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      readStream.on('data', chunk => chunks.push(chunk));
      readStream.on('error', reject);
      readStream.on('end', () => resolve(Buffer.concat(chunks)));
    });
    const base64Image = fileBuffer.toString('base64');
  
    // Use a JSON payload instead of FormData
    const payload = {
      file: base64Image,
      n: 2,
      size: "1024x1024"
    };
  
    const result = await fetch("https://api.openai.com/v1/images/generations", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json', // Change Content-Type header to 'application/json'
      },
      body: JSON.stringify(payload),
    });
  
    const jsonResult = await result.json();
    return jsonResult.data;
  }

function renderVariations(res, variations) {
    const imagesHtml = variations
      .map((variation, index) => {
        return `<img src="${variation.generated_url}" alt="Variation ${index + 1}" />`; // Use 'generated_url' instead of 'url'
      })
      .join('');
  
    res.send(`
      <html>
        <head>
          <!-- Add your styles here -->
        </head>
        <body>
          <h1>AI Image Variations</h1>
          ${imagesHtml}
          <br />
          <a href="/">Generate more variations</a>
        </body>
      </html>
    `);
  }

app.listen(3000, () => {
console.log('Server started on http://localhost:3000');
});