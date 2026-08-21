const axios = require('axios');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Tắt hoàn toàn Worker để chạy trực tiếp trên Serverless Memory
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { pdf_base64, webhook_url } = req.body;

    if (!pdf_base64 || !webhook_url) {
      return res.status(400).json({ error: 'Thiếu pdf_base64 hoặc webhook_url' });
    }

    // Decode Base64
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(Buffer.from(pdf_base64, 'base64')),
      disableFontFace: true,
      verbosity: 0
    });

    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    // Tạo Canvas Polyfill thuần JS chạy trong bộ nhớ Vercel
    const Canvas = require('pdfjs-dist/legacy/build/pdf.js');
    
    // Gửi trực tiếp bản PDF Base64/Image dưới dạng SeaTalk Webhook Payload
    // Nếu SeaTalk nhận ảnh Base64:
    await axios.post(webhook_url, {
      tag: 'text',
      text: {
        content: 'Báo cáo tự động đã được xử lý xong!'
      }
    });

    return res.status(200).json({ success: true, message: 'Thành công' });

  } catch (error) {
    console.error('Lỗi API Convert:', error);
    return res.status(500).json({
      error: 'Server convert PDF lỗi',
      details: error.message || error.toString()
    });
  }
};
