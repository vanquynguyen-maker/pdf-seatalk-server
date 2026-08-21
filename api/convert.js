process.env.PDFJS_DISABLE_WORKER = 'true';
const { pdf } = require('pdf-to-img');

module.exports = async (req, res) => {
  try {
    const { pdf_base64, webhook_url } = req.body;
    const buffer = Buffer.from(pdf_base64, 'base64');
    
    const document = await pdf(buffer, { scale: 3 });
    let imageBuffer;
    
    for await (const image of document) {
      imageBuffer = image;
      break; // Lấy trang đầu tiên
    }

    // Xử lý gửi imageBuffer sang SeaTalk...
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
