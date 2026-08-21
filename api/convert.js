// Bắt buộc đặt dòng này trên cùng để tắt Web Worker trên Serverless
process.env.PDFJS_DISABLE_WORKER = 'true';

const pdfImgConvert = require('pdf-img-convert');
const axios = require('axios');

module.exports = async (req, res) => {
  // Chỉ nhận method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { pdf_base64, webhook_url, scale } = req.body;

    if (!pdf_base64 || !webhook_url) {
      return res.status(400).json({ error: 'Thiếu pdf_base64 hoặc webhook_url' });
    }

    // Convert Base64 sang Buffer
    const pdfBuffer = Buffer.from(pdf_base64, 'base64');

    // Chuyển PDF sang Array các ảnh PNG (dạng Buffer)
    const outputImages = await pdfImgConvert.convert(pdfBuffer, {
      page_numbers: [1], // Chỉ lấy trang đầu tiên
      scale: scale || 2   // Tỷ lệ scale
    });

    if (!outputImages || outputImages.length === 0) {
      throw new Error('Không thể render ảnh từ PDF');
    }

    // Chuyển Buffer ảnh sang Base64
    const imageBase64 = Buffer.from(outputImages[0]).toString('base64');

    // Bắn sang SeaTalk Webhook
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
