module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }

  let pdfToImg;
  let sharp;
  try {
    // pdf-to-img là thư viện ESM, dùng dynamic import() để gọi được từ CommonJS
    ({ pdf: pdfToImg } = await import('pdf-to-img'));
    sharp = require('sharp');
  } catch (loadErr) {
    console.error('Lỗi load thư viện:', loadErr);
    return res.status(500).json({
      error: 'LOAD_LIBRARY_FAILED: ' + (loadErr.message || String(loadErr)),
      stack: loadErr.stack
    });
  }

  try {
    const { pdf_base64, webhook_url, scale, aspect_ratio } = req.body || {};

    if (!pdf_base64 || !webhook_url) {
      return res.status(400).json({ error: 'Thiếu pdf_base64 hoặc webhook_url trong body' });
    }

    const pdfBuffer = Buffer.from(pdf_base64, 'base64');

    const document = await pdfToImg(pdfBuffer, { scale: scale || 4 });

    let pngBuffer = null;
    for await (const image of document) {
      pngBuffer = image; // Chỉ lấy trang đầu tiên (vùng chụp A1:N24 luôn nằm gọn 1 trang)
      break;
    }

    if (!pngBuffer) {
      return res.status(500).json({ error: 'Không convert được PDF sang ảnh' });
    }

    let finalBuffer = Buffer.from(pngBuffer);

    // Cắt khít theo đúng tỷ lệ khung hình thật của vùng dữ liệu (loại bỏ khoảng trắng thừa
    // do Google PDF export vẫn giữ khoảng đệm trang, đặc biệt ở chiều cao).
    // Đệm thêm 4% chiều cao để không cắt hụt mất dòng cuối cùng.
    const HEIGHT_BUFFER = 1.04;
    if (aspect_ratio && aspect_ratio > 0) {
      const meta = await sharp(finalBuffer).metadata();
      const targetHeight = Math.min(
        meta.height,
        Math.round((meta.width / aspect_ratio) * HEIGHT_BUFFER)
      );
      if (targetHeight > 0 && targetHeight < meta.height) {
        finalBuffer = await sharp(finalBuffer)
          .extract({ left: 0, top: 0, width: meta.width, height: targetHeight })
          .png()
          .toBuffer();
      }
    }

    const pngBase64 = finalBuffer.toString('base64');

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
