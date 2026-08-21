import { fromBuffer } from "pdf2pic";
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { pdf_base64, webhook_url } = req.body;

    if (!pdf_base64 || !webhook_url) {
      return res.status(400).json({ error: 'Thiếu pdf_base64 hoặc webhook_url' });
    }

    const pdfBuffer = Buffer.from(pdf_base64, 'base64');

    // Cấu hình chuyển đổi trang 1 của PDF sang PNG
    const options = {
      density: 150,
      format: "png",
      width: 1200,
      height: 1600
    };

    const convert = fromBuffer(pdfBuffer, options);
    const pageToConvert = 1;
    const resolve = await convert(pageToConvert, { responseType: "base64" });

    const base64Image = resolve.base64;

    // Gửi ảnh trực tiếp sang SeaTalk Webhook
    await axios.post(webhook_url, {
      tag: "image",
      image_key: base64Image // Hoặc định dạng payload ảnh của SeaTalk API
    });

    return res.status(200).json({ success: true, message: "Đã gửi ảnh thành công!" });

  } catch (error) {
    console.error("Lỗi Convert:", error);
    return res.status(500).json({ 
      error: "Convert PDF thất bại", 
      details: error.message 
    });
  }
}
