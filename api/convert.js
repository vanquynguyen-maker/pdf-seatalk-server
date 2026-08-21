// Tắt Web Worker hoàn toàn để chạy trên Serverless
process.env.PDFJS_DISABLE_WORKER = 'true';

const axios = require('axios');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('pure-canvas');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { pdf_base64, webhook_url } = req.body;

    if (!pdf_base64 || !webhook_url) {
      return res.status(400).json({ error: 'Thiếu pdf_base64 hoặc webhook_url' });
    }

    // Convert base64 sang Uint8Array
    const pdfData = new Uint8Array(Buffer.from(pdf_base64, 'base64'));

    // Tải file PDF bằng pdfjs
    const loadingTask = pdfjs.getDocument({
      data: pdfData,
      disableFontFace: true,
      verbosity: 0
    });
    const pdfDocument = await loadingTask.promise;

    // Lấy trang 1
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    // Tạo Canvas thuần JS không dùng node-gyp C++
    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Xuất chuỗi Base64 PNG
    const imageBase64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');

    // Gửi ảnh sang SeaTalk Webhook
    await axios.post(webhook_url, {
      tag: 'image',
      image_base64: imageBase64
    });

    return res.status(200).json({ success: true, message: 'Đã convert và gửi ảnh thành công!' });

  } catch (error) {
    console.error('Lỗi API Convert:', error);
    return res.status(500).json({
      error: 'Server convert PDF lỗi',
      details: error.message || error.toString()
    });
  }
};
