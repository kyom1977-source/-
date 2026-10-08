import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // JSON body parser with limit for base64 images
  app.use(express.json({ limit: '25mb' }));

  // API Route: Analyze seating chart image with Gemini Vision
  app.post('/api/analyze-seating-chart', async (req, res) => {
    try {
      const { imageBase64, mimeType, studentsList } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: '이미지 데이터가 전달되지 않았습니다.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다.' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `이 교실 자리 배치표 이미지에 나와 있는 학생들의 배치 구조를 분석해줘. 우리 반 학생 명단은 다음과 같아: [${studentsList || ''}].
교실 각 분단(그룹 1, 2, 3)과 각 행(줄 1, 2, 3, 4, 5)별 좌석(왼쪽 c0, 오른쪽 c1)에 앉아 있는 학생 이름을 분석하여, seatId (예: seat_g1_r5_c0, seat_g1_r5_c1)와 학생 이름 매핑('arrangement'), 좌우 짝꿍 쌍 목록('pairs'), 이미지 상단에 적힌 제목('title')을 포함한 JSON 형식으로만 응답해줘.

주의사항:
1. 책상이 비어있는 칸이나 '빈자리' 또는 '-'로 표시된 칸은 "빈자리"로 입력해줘.
2. 학생 이름 앞에 번호가 적혀있으면 번호를 제외한 순수 이름만 추출해줘. (예: "23번 김한결" -> "김한결")
3. 응답은 반드시 마크다운 코드블록이나 불필요한 텍스트 없이 유효한 JSON 문자열 하나만 반환해줘.

예시 JSON 구조:
{
  "title": "2026년 10월 스마트 자리배치도",
  "arrangement": {
    "seat_g1_r5_c0": "빈자리",
    "seat_g1_r5_c1": "김한결",
    "seat_g2_r5_c0": "김선율",
    "seat_g2_r5_c1": "차윤설"
  },
  "pairs": [
    ["김선율", "차윤설"],
    ["홍지후", "황가영"]
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: imageBase64,
            },
          },
          { text: prompt },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ success: false, error: 'AI 분석 결과에서 JSON 데이터를 찾을 수 없습니다.' });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error('Gemini vision analysis error:', err);
      return res.status(500).json({ success: false, error: err.message || '이미지 분석 처리 중 오류가 발생했습니다.' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
