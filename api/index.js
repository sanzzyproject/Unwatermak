// api/index.js
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const Busboy = require('busboy');

// --- Logika Asli (Diadaptasi untuk Buffer) ---
async function createjob(fileBuffer, fileName, productSerial) {
  const form = new FormData();

  // Kirim Buffer, bukan Stream file
  form.append('original_image_file', fileBuffer, {
    filename: fileName,
    contentType: 'image/jpeg' // Default assumption
  });

  form.append('output_format', 'jpg');
  form.append('is_remove_text', 'true');
  form.append('is_remove_logo', 'true');
  form.append('is_enhancer', 'true');

  const r = await axios.post('https://api.unwatermark.ai/api/web/v1/image-watermark-auto-remove-upgrade/create-job',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'Product-Serial': productSerial,
        'Product-Code': '067003',
        origin: 'https://unwatermark.ai',
        referer: 'https://unwatermark.ai/'
      }
    }
  );

  return r.data.result.job_id;
}

async function getjob(jobId, productSerial) {
  const r = await axios.get(`https://api.unwatermark.ai/api/web/v1/image-watermark-auto-remove-upgrade/get-job/${jobId}`,
    {
      headers: {
        'Product-Serial': productSerial,
        'Product-Code': '067003',
        origin: 'https://unwatermark.ai',
        referer: 'https://unwatermark.ai/'
      }
    }
  );
  return r.data;
}

// --- Handler Serverless Vercel ---
module.exports = async (req, res) => {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse Upload menggunakan Busboy
  const busboy = Busboy({ headers: req.headers });
  let fileBuffer = null;
  let fileName = '';

  busboy.on('file', (fieldname, file, info) => {
    const { filename } = info;
    fileName = filename;
    const chunks = [];
    file.on('data', (data) => chunks.push(data));
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  busboy.on('finish', async () => {
    if (!fileBuffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const productSerial = crypto.randomUUID();
      const jobId = await createjob(fileBuffer, fileName, productSerial);
      
      let attempts = 0;
      // Loop polling (Maks 15 detik untuk menghindari timeout serverless free tier)
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 2000));
        const s = await getjob(jobId, productSerial);

        if (s.code === 100000 && s.result?.output_url) {
           const output = Array.isArray(s.result.output_url)
            ? s.result.output_url[0]
            : s.result.output_url;
            
            return res.status(200).json({
              success: true,
              input_url: s.result.input_url,
              output_url: output
            });
        }
        attempts++;
      }
      
      res.status(408).json({ error: 'Timeout waiting for image processing.' });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });

  if (req.rawBody) {
      busboy.end(req.rawBody);
  } else {
      req.pipe(busboy);
  }
};
