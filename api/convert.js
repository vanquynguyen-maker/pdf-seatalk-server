const { createCanvas } = require('@napi-rs/canvas');
const axios = require('axios');

// Nạp pdfjs legacy dành cho môi trường Node.js
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

// Tắt Worker hoàn toàn để chạy thuần JS/WASM
pdfjs.GlobalWorkerOptions.workerSrc = '';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { pdf_base64, webhook_url } = req.body;

    if (!pdf_base64 || !webhook_url) {
      return res.status(400).json({ error: 'Thiếu pdf_base64 hoặc webhook_url' });
    }

    const pdfData = new Uint8Array(Buffer.from(pdf_base64, 'base64'));

    // Đọc file PDF
    const loadingTask = pdfjs.getDocument({
      data: pdfData,
      disableFontFace: true,
      verbosity: 0
    });
    const pdfDocument = await loadingTask.promise;

    // Lấy trang 1
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    // Tạo Canvas vẽ ảnh bằng Rust Native (Fast & Safe on Vercel)
    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Xuất ảnh PNG Base64
    const imageBuffer = canvas.toBuffer('image/png');
    const imageBase64 = imageBuffer.toString('base64');

    // Gửi ảnh sang SeaTalk
    await axios.post(webhook_url, {
      tag: "image",
      image_base64: imageBase64
    });

    return res.status(200).json({ success: true, message: "Thành công!" });

  } catch (error) {
    console.error("Lỗi:", error);
    return res.status(500).json({ 
      error: "Server convert PDF lỗi", 
      details: error.message 
    });
  }
};
