import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to extract Hangul, English, numbers from binary HWP/DOCX
function extractTextFromBinary(buffer: Buffer): string {
  // Try UTF-8 first, then UTF-16LE
  const utf8Text = buffer.toString('utf8');
  const utf16Text = buffer.toString('utf16le');
  
  // Match Hangul syllables, english words, numbers, and basic punctuation
  const regex = /[\uAC00-\uD7A3]+|[A-Za-z0-9_@.\-+:/]+|[\s,.\(\)]+/g;
  
  const utf8Matches = utf8Text.match(regex) || [];
  const utf16Matches = utf16Text.match(regex) || [];
  
  const cleanUtf8 = utf8Matches
    .map(m => m.trim())
    .filter(m => m.length > 1 && !m.includes('<') && !m.includes('>') && !m.includes('[') && !m.includes(']'))
    .join(' ');
    
  const cleanUtf16 = utf16Matches
    .map(m => m.trim())
    .filter(m => m.length > 1 && !m.includes('<') && !m.includes('>') && !m.includes('[') && !m.includes(']'))
    .join(' ');
    
  return cleanUtf8.length > cleanUtf16.length ? cleanUtf8 : cleanUtf16;
}

app.post("/api/parse-resume", async (req, res) => {
  try {
    const { fileName, fileType, fileData } = req.body;
    
    if (!fileData) {
      return res.status(400).json({ error: "파일 데이터가 누락되었습니다." });
    }
    
    const buffer = Buffer.from(fileData, 'base64');
    let contentPart: any;
    
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.endsWith('.pdf')) {
      contentPart = {
        inlineData: {
          mimeType: "application/pdf",
          data: fileData
        }
      };
    } else if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp')) {
      contentPart = {
        inlineData: {
          mimeType: lowerName.endsWith('.png') ? "image/png" : "image/jpeg",
          data: fileData
        }
      };
    } else if (lowerName.endsWith('.txt')) {
      contentPart = {
        text: buffer.toString('utf8')
      };
    } else {
      // DOCX, HWP or other binary formats
      const textContent = extractTextFromBinary(buffer);
      if (!textContent || textContent.length < 5) {
        return res.status(400).json({ error: "파일에서 텍스트를 추출하지 못했습니다. 한글(HWP), PDF, 워드(DOCX) 또는 이미지 파일만 분석 가능합니다." });
      }
      contentPart = {
        text: `[Extracted Content from ${fileName}]:\n\n${textContent}`
      };
    }
    
    // Call Gemini with schema
    const prompt = `You are an expert Korean resume and instructor profile analyzer.
Analyze the provided resume / instructor profile content and extract structural info.
Fill in the fields accurately in Korean.
Ensure email and phone number formats are clean (e.g. 010-XXXX-XXXX).
If you cannot find specific fields, leave them as empty strings or empty arrays.

Extract and return a JSON matching this exact structure:
{
  "title": "강사 공식 직함 / 전문 분야 슬로건 (예: 리더십 및 성과 창출 전문 강사)",
  "specialties": ["전문 분야 1", "전문 분야 2"],
  "bio": "나의 다짐 및 인삿말 (한 줄 소개글, 1~2개 문장의 정중하고 당찬 소개글)",
  "region": "주 활동 지역 (예: 서울, 경기, 전국)",
  "contactEmail": "대표 연락처 이메일",
  "contactPhone": "대표 연락처 휴대전화번호",
  "education": ["학력 또는 수료 이력 1", "학력 또는 수료 이력 2"],
  "career": ["주요 대표 경력 1", "주요 대표 경력 2"],
  "bankAccount": "정산 계좌 정보 (예: 신한은행 110-123-456789 홍길동) - 파일 내에 정산이나 지급용 계좌번호가 명시되어 있다면 기재, 없으면 빈 문자열"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        contentPart,
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            specialties: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            bio: { type: Type.STRING },
            region: { type: Type.STRING },
            contactEmail: { type: Type.STRING },
            contactPhone: { type: Type.STRING },
            education: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            career: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            bankAccount: { type: Type.STRING }
          },
          required: ["title", "specialties", "bio", "region", "contactEmail", "contactPhone", "education", "career", "bankAccount"]
        }
      }
    });
    
    const jsonText = response.text;
    res.json(JSON.parse(jsonText || "{}"));
    
  } catch (err: any) {
    console.error("Resume parsing error:", err);
    res.status(500).json({ error: err.message || "파일 분석 도중 서버 오류가 발생하였습니다." });
  }
});

// Wrap startup in an async function to avoid CJS top-level await errors
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
