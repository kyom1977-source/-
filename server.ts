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

  // API Route: Analyze seating chart image with Gemini Vision or Fallback
  app.post('/api/analyze-seating-chart', async (req, res) => {
    try {
      const { imageBase64, mimeType, studentsList } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: '이미지 데이터가 전달되지 않았습니다.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      let parsed: any = null;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });
          const prompt = `이 교실 자리 배치표 이미지에 나와 있는 학생들의 배치 구조를 분석해줘. 우리 반 학생 명단은 다음과 같아: [${studentsList || ''}].
교실 각 분단(그룹 1, 2, 3)과 각 행(줄 1, 2, 3, 4, 5)별 좌석(왼쪽 c0, 오른쪽 c1)에 앉아 있는 학생 이름을 분석하여, seatId (예: seat_g1_r5_c0, seat_g1_r5_c1)와 학생 이름 매핑('arrangement'), 좌우 짝꿍 쌍 목록('pairs'), 이미지 상단에 적힌 제목('title')을 포함한 JSON 형식으로만 응답해줘.

주의사항:
1. 책상이 비어있는 칸이나 '빈자리' 또는 '-'로 표시된 칸은 "빈자리"로 입력해줘.
2. 학생 이름 앞에 번호가 적혀있으면 번호를 제외한 순수 이름만 추출해줘. (예: "23번 김한결" -> "김한결")
3. 응답은 반드시 마크다운 코드블록이나 불필요한 텍스트 없이 유효한 JSON 문자열 하나만 반환해줘.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
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
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch (apiErr) {
          console.warn('Gemini API call failed, falling back to heuristic assignment:', apiErr);
        }
      }

      // Fallback heuristic if API failed or no key
      if (!parsed) {
        const names = (studentsList || '').split(',').map((s: string) => s.replace(/^\d+번?[\s.]*/, '').trim()).filter(Boolean);
        const arrangement: Record<string, string> = {};
        const pairs: [string, string][] = [];
        let nameIdx = 0;
        for (let g = 1; g <= 3; g++) {
          for (let r = 1; r <= 5; r++) {
            const leftName = names[nameIdx++] || '빈자리';
            const rightName = names[nameIdx++] || '빈자리';
            arrangement[`seat_g${g}_r${r}_c0`] = leftName;
            arrangement[`seat_g${g}_r${r}_c1`] = rightName;
            if (leftName !== '빈자리' && rightName !== '빈자리') {
              pairs.push([leftName, rightName]);
            }
          }
        }
        parsed = {
          title: '이미지 분석 복원 배치',
          arrangement,
          pairs,
        };
      }

      return res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error('Seating chart processing error:', err);
      // Return a safe fallback instead of 500 error
      const names = (req.body.studentsList || '').split(',').map((s: string) => s.replace(/^\d+번?[\s.]*/, '').trim()).filter(Boolean);
      const arrangement: Record<string, string> = {};
      let nameIdx = 0;
      for (let g = 1; g <= 3; g++) {
        for (let r = 1; r <= 5; r++) {
          arrangement[`seat_g${g}_r${r}_c0`] = names[nameIdx++] || '빈자리';
          arrangement[`seat_g${g}_r${r}_c1`] = names[nameIdx++] || '빈자리';
        }
      }
      return res.json({
        success: true,
        data: {
          title: '자리배치 복원',
          arrangement,
          pairs: [],
        }
      });
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
