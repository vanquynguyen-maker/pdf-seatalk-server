const { pdf } = require('pdf-to-img');
const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { pdf_base64, webhook_url } = req.body;

    if (!pdf_base64 || !webhook_url) {
      return res.status(400).json({ error: 'Thiếu pdf_base64 hoặc webhook_url' });
    }

    // Chuyển Base64 sang Buffer
    const pdfBuffer = Buffer.from(pdf_base64, 'base64');

    // Chuyển trang 1 của PDF sang ảnh PNG
    const document = await pdf(pdfBuffer, { scale: 2 });
    let imageBuffer;

    for await (const image of document) {
      imageBuffer = image;
      break; // Lấy trang đầu tiên
    }

    const imageBase64 = imageBuffer.toString('base64');

    // Gửi ảnh sang SeaTalk
    await axios.post(webhook_url, {
      tag: "image",
      image_base64: imageBase64
    });

    return res.status(200).json({ success: true, message: "Chuyển đổi và gửi ảnh thành công!" });

  } catch (error) {
    console.error("Lỗi Convert:", error);
    return res.status(500).json({ 
      error: "Server convert PDF lỗi", 
      details: error.message 
    });
  }
};
