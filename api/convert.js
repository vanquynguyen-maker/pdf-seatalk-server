module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }

  let pdf2img;
  try {
    // Đưa require vào đây (thay vì đầu file) để nếu thư viện load lỗi,
    // mình bắt được và trả JSON rõ ràng thay vì server crash im lặng.
    pdf2img = require('pdf-img-convert');
  } catch (loadErr) {
    console.error('Lỗi load thư viện pdf-img-convert:', loadErr);
    return res.status(500).json({
      error: 'LOAD_LIBRARY_FAILED: ' + (loadErr.message || String(loadErr)),
      stack: loadErr.stack
    });
  }

  try {
    const { pdf_base64, webhook_url, scale } = req.body || {};

    if (!pdf_base64 || !webhook_url) {
      return res.status(400).json({ error: 'Thiếu pdf_base64 hoặc webhook_url trong body' });
    }

    const pdfBuffer = Buffer.from(pdf_base64, 'base64');

    // scale càng cao càng nét, nhưng lâu hơn. scale=4 là mức nét cao, an toàn với PDF 1 trang nhỏ (bảng phân bổ ca).
    const outputImages = await pdf2img.convert(pdfBuffer, {
      scale: scale || 4
    });

    if (!outputImages || outputImages.length === 0) {
      return res.status(500).json({ error: 'Không convert được PDF sang ảnh' });
    }

    // Chỉ lấy trang đầu tiên (vùng chụp A1:N24 luôn nằm gọn 1 trang)
    const pngBuffer = Buffer.from(outputImages[0]);
    const pngBase64 = pngBuffer.toString('base64');

    const seatalkPayload = {
      tag: 'image',
      image_base64: { content: pngBase64 }
    };

    const seatalkResp = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seatalkPayload)
    });

    const seatalkResultText = await seatalkResp.text();

    return res.status(200).json({
      success: true,
      seatalk_status: seatalkResp.status,
      seatalk_response: seatalkResultText
    });
  } catch (err) {
    console.error('Lỗi convert PDF:', err);
    return res.status(500).json({ error: err.message || String(err), stack: err.stack });
  }
};
