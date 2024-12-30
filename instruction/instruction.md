# Project Requirements Document (PRD)

## Project Overview

建立一個網站，讓使用者可以上傳多份 PDF 履歷，並透過 AI 分析這些履歷，找出最適合的人選並提供建議。此平台將為招聘流程提供高效且智能化的解決方案，幫助企業快速篩選和評估候選人。

### Key Workflows

1. **履歷上傳**
   - 使用者可以上傳多份 PDF 格式的履歷。
   - 支援批量上傳及單一檔案上傳。
   - 提供上傳進度指示與成功/失敗回饋。

2. **條件設定**
   - 使用者輸入篩選條件，包括：
     - 必要條件（必須滿足的條件）
     - 加分條件（滿足後將提升候選人評分）
     - 排除條件（不符合條件的候選人將被排除）
   - 支援多種條件類型，如關鍵詞、技能、經驗年限等。

3. **AI 分析履歷**
   - 系統使用 AI 技術分析上傳的履歷。
   - 根據設定的條件篩選並排序候選人。
   - 提供智能建議，如優化條件、潛在最佳候選人等。

4. **結果展示**
   - 透過表格清晰顯示分析結果。
   - 表格包含候選人基本資訊、匹配分數、相關技能、經驗等詳情。
   - 支援篩選、排序及導出結果。

### Tech Stack

- **Frontend**: 
  - **框架**: Next.js 14
  - **樣式**: Tailwind CSS
  - **UI 元件庫**: Shadcn UI

- **Backend**:
  - **資料庫與存儲**: Supabase
  - **AI 分析**: OpenAI API

- **AI API**:
  - **OpenAI**: 使用其 GPT 模型進行履歷分析與推薦。

## Core Functionalities

### 1. Workspace and Resume Organization

#### 1.1 Workspace: Card-Based Layout

- **設計**:
  - 使用卡片式佈局來展示不同的工作區域。
  - 卡片之間的間距設為 `16px`。

- **Card 元件樣式**:
  - **背景色**: `#ffffff`
  - **邊框**: `#e5e7eb`
  - **邊框圓角**: `8px`
  - **陰影效果**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`

#### 1.2 Resume Organization

- **上傳與管理**:
  - 使用者可以上傳多份 PDF 履歷。
  - 支援履歷的移除功能。

- **資料存儲**:
  - 使用 Supabase 儲存使用者上傳的履歷內容。

- **資料表結構**:
  - **表名**: `resume`
  - **欄位**:
    - `id`: `uuid` (主鍵)
    - `user_id`: `uuid` (關聯使用者)
    - `resume_name`: `string`
    - `resume_tech_skills`: `text`
    - `resume_experience`: `text`
    - `resume_education`: `text`
    - `resume_projects`: `text`
    - `iscandidate`: `boolean`
    - `created_at`: `timestamp`
    - `updated_at`: `timestamp`

## Detailed File Structure

為了確保專案結構清晰且易於維護，以下是建議的文件結構：

```
your-project/
├── README.md
├── app/
│   ├── favicon.ico
│   ├── fonts/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Card.tsx
│   ├── ResumeUploader.tsx
│   ├── ConditionForm.tsx
│   ├── AnalysisTable.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── hooks/
│   ├── useMobile.tsx
│   └── useToast.tsx
├── lib/
│   ├── supabaseClient.ts
│   ├── openAIClient.ts
│   └── utils.ts
├── pages/
│   ├── api/
│   │   ├── uploadResume.ts
│   │   ├── analyzeResumes.ts
│   │   └── ... (其他 API 路徑)
│   └── ... (其他頁面)
├── styles/
│   └── tailwind.css
├── next.config.js
├── package.json
├── tsconfig.json
├── postcss.config.js
└── tailwind.config.js
```

### 文件結構說明

1. **`app/`**
   - **用途**: 存放主要的應用組件與全域配置。
   - **主要文件**:
     - `layout.tsx`: 定義應用的整體佈局。
     - `page.tsx`: 主頁面組件。
     - `globals.css`: 全域樣式，包括 Tailwind CSS 引入。

2. **`components/`**
   - **用途**: 儲存所有可重用的 React 組件。
   - **主要組件**:
     - `Card.tsx`: 實現卡片式佈局。
     - `ResumeUploader.tsx`: 處理 PDF 履歷的上傳。
     - `ConditionForm.tsx`: 讓使用者輸入篩選條件。
     - `AnalysisTable.tsx`: 以表格形式展示 AI 分析結果。
   - **`ui/` 子目錄**:
     - 儲存通用的 UI 元件，如按鈕 (`Button.tsx`)、輸入框 (`Input.tsx`)、彈窗 (`Modal.tsx`) 等，以促進組件的重用性。

3. **`hooks/`**
   - **用途**: 包含自定義的 React hooks。
   - **主要 Hooks**:
     - `useMobile.tsx`: 檢測是否為行動裝置視窗。
     - `useToast.tsx`: 管理通知提示（toast）。

4. **`lib/`**
   - **用途**: 包含工具函數及外部服務的客戶端。
   - **主要文件**:
     - `supabaseClient.ts`: 初始化並匯出 Supabase 客戶端。
     - `openAIClient.ts`: 初始化並匯出 OpenAI API 客戶端。
     - `utils.ts`: 全域通用的工具函數。

5. **`pages/`**
   - **用途**: 定義 API 路徑與其他頁面（如需要）。
   - **主要子目錄與文件**:
     - `api/`:
       - `uploadResume.ts`: 處理履歷上傳至 Supabase。
       - `analyzeResumes.ts`: 使用 OpenAI API 進行履歷分析。
       - `...`: 其他相關的 API 路徑。
     - `...`: 其他頁面（視專案需求新增）。

6. **`styles/`**
   - **用途**: 儲存 Tailwind CSS 配置與自定義樣式。
   - **主要文件**:
     - `tailwind.css`: 引入 Tailwind 指令及自定義樣式（如有）。

7. **配置文件**
   - `next.config.js`: Next.js 的配置文件。
   - `tailwind.config.js`: Tailwind CSS 的配置文件。
   - `postcss.config.js`: PostCSS 的配置文件，用於 Tailwind。
   - `tsconfig.json`: TypeScript 的配置文件。
   - `package.json`: 管理專案的依賴及腳本。

### 重要組件與功能詳述

#### 1. ResumeUploader Component

**目的**: 提供使用者介面讓使用者上傳多份 PDF 履歷，並管理已上傳的履歷。

**功能需求**:
- 支援多文件上傳。
- 顯示上傳進度與狀態。
- 允許使用者刪除已上傳的履歷。

**範例界面**:
```markdown
+---------------------------------------------------+
| [Upload PDF] [Upload Another]                     |
| - Resume1.pdf [Remove]                            |
| - Resume2.pdf [Remove]                            |
| ...                                               |
+---------------------------------------------------+
```

**互動流程**:
1. 使用者點擊「Upload PDF」按鈕，選擇檔案進行上傳。
2. 選擇多個檔案後，顯示每個檔案的名稱及「Remove」按鈕。
3. 使用者可選擇刪除不需要的檔案。
4. 上傳完成後，檔案資訊儲存至 Supabase。

#### 2. ConditionForm Component

**目的**: 提供介面讓使用者設定篩選條件，以便 AI 分析履歷時能夠根據這些條件篩選最合適的人選。

**功能需求**:
- 輸入必要條件、加分條件、排除條件。
- 支援不同類型的條件，例如技能、經驗年限、教育背景等。
- 提供即時驗證與提示。

**範例界面**:
```markdown
+---------------------------------------------------+
| [Form Title: Setting Conditions]                 |
|                                                   |
| 必要條件: [__________________] [Add Condition]    |
| 加分條件: [__________________] [Add Condition]    |
| 排除條件: [__________________] [Add Condition]    |
|                                                   |
| [Submit] [Cancel]                                 |
+---------------------------------------------------+
```

**互動流程**:
1. 使用者在對應的欄位輸入條件。
2. 點擊「Add Condition」新增更多條件。
3. 完成後，點擊「Submit」提交條件。
4. 系統將條件傳遞至後端進行履歷分析。

#### 3. AnalysisTable Component

**目的**: 以表格形式展示經 AI 分析後的履歷篩選結果，方便使用者查看與比較。

**功能需求**:
- 顯示候選人的基本資訊、匹配分數、相關技能、經驗等。
- 支援表格排序與篩選。
- 支援結果導出，如 CSV 或 Excel 格式。

**範例界面**:
```markdown
+---------------------------------------------------------------------------------+
| Name | Email | Phone | Matching Score | Skills           | Experience         | Actions |
|------|-------|-------|----------------|------------------|---------------------|---------|
| John | ...   | ...   | 95             | JavaScript, React | 5 years at XYZ Corp | [View]  |
| Jane | ...   | ...   | 90             | Python, Django    | 4 years at ABC Inc  | [View]  |
| ...                                                              |         |
+---------------------------------------------------------------------------------+
```

**互動流程**:
1. 分析完成後，系統將結果以表格形式展示。
2. 使用者可透過點擊表頭進行排序。
3. 使用者可輸入關鍵詞以進行篩選。
4. 使用者可選擇導出結果。

### API 路徑與端點

#### 1. Upload Resume API

**端點**: `POST /api/uploadResume`

**功能**: 接收使用者上傳的履歷檔案，解析並儲存至 Supabase。

**請求範例**:
```json
{
  "userId": "uuid-string",
  "resumeName": "John_Doe_Resume.pdf",
  "resumeFile": "base64-encoded-pdf"
}
```

**回應範例**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid-string",
    "resumeName": "John_Doe_Resume.pdf",
    "createdAt": "2023-10-01T12:34:56Z"
  }
}
```

**錯誤回應範例**:
```json
{
  "status": "error",
  "message": "Failed to upload resume."
}
```

**相關套件文件**:
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

#### 2. Analyze Resumes API

**端點**: `POST /api/analyzeResumes`

**功能**: 根據使用者設定的條件，利用 OpenAI API 分析並篩選履歷。

**請求範例**:
```json
{
  "userId": "uuid-string",
  "conditions": {
    "mandatory": ["JavaScript", "React"],
    "optional": ["TypeScript", "Node.js"],
    "excluded": ["PHP"]
  }
}
```

**回應範例**:
```json
{
  "status": "success",
  "results": [
    {
      "id": "uuid-1",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "123-456-7890",
      "matchingScore": 95,
      "skills": ["JavaScript", "React", "Node.js"],
      "experience": "5 years at XYZ Corp"
    },
    {
      "id": "uuid-2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "987-654-3210",
      "matchingScore": 90,
      "skills": ["JavaScript", "React", "TypeScript"],
      "experience": "4 years at ABC Inc"
    }
    // ...更多結果
  ]
}
```

**錯誤回應範例**:
```json
{
  "status": "error",
  "message": "AI analysis failed."
}
```

**相關套件文件**:
- [OpenAI API Documentation](https://beta.openai.com/docs/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

### Libraries and Tools Documentation

#### 1. Next.js

**用途**: React 框架，用於建立高效能的伺服器渲染應用。

- **官方文件**: [Next.js Documentation](https://nextjs.org/docs)
- **關鍵功能**:
  - **頁面路由**: 基於文件系統的路由。
  - **API Routes**: 建立伺服器端 API。
  - **Static & Server Rendering**: 支援靜態生成與伺服器渲染。

**範例**:
```tsx
// pages/index.tsx
import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div>
      <h1>Welcome to the Resume Analyzer</h1>
    </div>
  );
};

export default HomePage;
```

#### 2. Tailwind CSS

**用途**: 高效能的 CSS 框架，提供實用的 CSS 類別以快速建立響應式介面。

- **官方文件**: [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- **關鍵功能**:
  - **Utility-First**: 使用小型、可組合的類別來建立樣式。
  - **Responsive Design**: 提供簡單的響應式設計工具。
  - **Customization**: 可自定義主題、顏色、斷點等。

**範例**:
```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```tsx
// components/Button.tsx
import React from 'react';

const Button: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      {children}
    </button>
  );
};

export default Button;
```

#### 3. Shadcn UI

**用途**: 一套基於 Tailwind CSS 的高質量 UI 元件。

- **官方文件**: [Shadcn UI Documentation](https://shadcn.com/)
- **關鍵功能**:
  - **預製元件**: 提供各種現成的 UI 元件，如按鈕、模態框、表格等。
  - **可定制性**: 易於根據專案需求調整樣式和功能。
  - **無依賴性**: 與 Tailwind CSS 深度整合，不依賴其他框架。

**範例**:
```tsx
// components/ui/Modal.tsx
import React from 'react';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6">
        <button onClick={onClose} className="float-right">X</button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
```

#### 4. Supabase

**用途**: 提供後端即服務（Backend as a Service），包含資料庫、認證、存儲等功能。

- **官方文件**: [Supabase Documentation](https://supabase.com/docs)
- **關鍵功能**:
  - **資料庫管理**: PostgreSQL 資料庫，支援實時更新。
  - **認證**: 用戶註冊、登入及管理。
  - **存儲**: 文件存儲與管理。

**範例**:
```ts
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

```ts
// pages/api/uploadResume.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userId, resumeName, resumeFile } = req.body;
    const { data, error } = await supabase
      .from('resume')
      .insert([
        {
          user_id: userId,
          resume_name: resumeName,
          // 解析 resumeFile 並填入其他欄位
        },
      ]);

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    return res.status(200).json({ status: 'success', data });
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
```

#### 5. OpenAI API

**用途**: 使用 OpenAI 的 GPT 模型進行自然語言處理，分析履歷內容並生成建議。

- **官方文件**: [OpenAI API Documentation](https://beta.openai.com/docs/)
- **關鍵功能**:
  - **文本分析**: 分析履歷中的技能、經驗、教育背景等。
  - **生成建議**: 根據分析結果與使用者條件生成匹配建議。
  - **靈活集成**: 支援多種 API 請求方式，可根據需求調整。

**範例**:
```ts
// lib/openAIClient.ts
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openai = new OpenAIApi(configuration);
```

```ts
// pages/api/analyzeResumes.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { openai } from '../../lib/openAIClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userId, conditions } = req.body;
    // 從 Supabase 獲取該用戶的所有履歷
    const { data: resumes, error } = await supabase
      .from('resume')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    // 用 OpenAI 分析每一份履歷
    const results = await Promise.all(
      resumes.map(async (resume) => {
        const prompt = `分析以下履歷並根據條件進行評分。\n條件: ${JSON.stringify(conditions)}\n履歷: ${resume.resume_experience} ${resume.resume_education} ...`;
        const response = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt,
          max_tokens: 150,
        });

        // 假設回應中包含匹配分數
        const matchingScore = parseInt(response.data.choices[0].text.trim());

        return {
          id: resume.id,
          name: resume.resume_name,
          // 其他字段
          matchingScore,
        };
      })
    );

    return res.status(200).json({ status: 'success', results });
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
```

## Documentation

### 1. Getting Started

**Prerequisites**:
- Node.js v14 或以上
- 註冊並設定 Supabase 帳戶
- 申請並取得 OpenAI API 金鑰

**安裝步驟**:
1. **克隆專案**:
   ```bash
   git clone https://github.com/your-repo/your-project.git
   cd your-project
   ```

2. **安裝依賴**:
   ```bash
   npm install
   ```

3. **設定環境變數**:
   - 建立 `.env.local` 檔案，並添加以下變數：
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     OPENAI_API_KEY=your-openai-api-key
     ```

4. **啟動開發伺服器**:
   ```bash
   npm run dev
   ```

### 2. API 使用指南

#### 2.1. Upload Resume API

**URL**: `/api/uploadResume`

**方法**: `POST`

**請求參數**:
- `userId` (string, required): 使用者的 UUID
- `resumeName` (string, required): 履歷名稱
- `resumeFile` (string, required): 履歷檔案，Base64 編碼

**成功回應**:
- **狀態碼**: `200 OK`
- **內容**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "uuid-string",
      "resumeName": "John_Doe_Resume.pdf",
      "createdAt": "2023-10-01T12:34:56Z"
    }
  }
  ```

**失敗回應**:
- **狀態碼**: `500 Internal Server Error`
- **內容**:
  ```json
  {
    "status": "error",
    "message": "Failed to upload resume."
  }
  ```

#### 2.2. Analyze Resumes API

**URL**: `/api/analyzeResumes`

**方法**: `POST`

**請求參數**:
- `userId` (string, required): 使用者的 UUID
- `conditions` (object, required):
  - `mandatory` (array of strings): 必要條件
  - `optional` (array of strings): 加分條件
  - `excluded` (array of strings): 排除條件

**成功回應**:
- **狀態碼**: `200 OK`
- **內容**:
  ```json
  {
    "status": "success",
    "results": [
      {
        "id": "uuid-1",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "123-456-7890",
        "matchingScore": 95,
        "skills": ["JavaScript", "React", "Node.js"],
        "experience": "5 years at XYZ Corp"
      },
      {
        "id": "uuid-2",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "987-654-3210",
        "matchingScore": 90,
        "skills": ["JavaScript", "React", "TypeScript"],
        "experience": "4 years at ABC Inc"
      }
      // ...更多結果
    ]
  }
  ```

**失敗回應**:
- **狀態碼**: `500 Internal Server Error`
- **內容**:
  ```json
  {
    "status": "error",
    "message": "AI analysis failed."
  }
  ```

### 3. Frontend Component 詳細說明

#### 3.1. Card Component

**目的**: 提供統一的卡片樣式，便於在不同區域展示內容。

**屬性**:
- `children` (React.ReactNode): 卡片內部的內容。

**設計規範**:
- **背景色**: `#ffffff`
- **邊框顏色**: `#e5e7eb`
- **邊框圓角**: `8px`
- **陰影效果**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`

**範例使用**:
```tsx
import Card from './Card';

const Example = () => (
  <Card>
    <h2>Card Title</h2>
    <p>Card content goes here.</p>
  </Card>
);
```

#### 3.2. Button Component

**目的**: 提供統一的按鈕樣式與行為。

**屬性**:
- `onClick` (function): 按鈕點擊事件處理函數。
- `children` (React.ReactNode): 按鈕內部的內容。

**設計規範**:
- **背景色**: `bg-blue-500`
- **文字顏色**: `text-white`
- **內邊距**: `px-4 py-2`
- **邊框圓角**: `rounded`
- **懸停效果**: `hover:bg-blue-600`

**範例使用**:
```tsx
import Button from './ui/Button';

const SubmitButton = () => (
  <Button onClick={() => console.log('Button clicked!')}>
    Submit
  </Button>
);
```

### 4. 開發流程與最佳實踐

#### 4.1. 分支管理

- **main/master 分支**: 主要的穩定分支，僅包含已測試的代碼。
- **develop 分支**: 開發中的功能分支，合併至 main/master 前需經過測試。
- **feature/xxx 分支**: 各功能開發分支，完成後合併至 develop。

#### 4.2. 代碼風格

- 使用 **Prettier** 與 **ESLint** 來保持代碼一致性。
- 遵循 **Airbnb JavaScript Style Guide**。
- 強制使用 TypeScript 進行型別檢查。

#### 4.3. 測試

- 使用 **Jest** 與 **React Testing Library** 進行單元測試與組件測試。
- 覆蓋關鍵功能，如 API 路徑、組件交互等。

#### 4.4. 部署

- 使用 **Vercel** 部署 Next.js 應用，支援自動化部署與持續整合。
- 設定環境變數於部署平台上，確保安全性。

### 5. 安全性與權限管理

#### 5.1. 使用者認證

- 使用 Supabase 提供的認證功能，管理使用者註冊、登入與權限。
- 所有 API 路徑需驗證使用者身份，防止未授權存取。

#### 5.2. 資料保護

- 所有敏感資料（如 API 金鑰）存放於環境變數，避免硬編碼於代碼中。
- 使用 HTTPS 保護資料傳輸安全。

## Conclusion

本 PRD 詳細描述了網站的主要功能、技術堆疊、文件結構以及相關的實作細節。通過明確的需求與範例，開發團隊能夠高效地進行專案開發，確保最終產品符合預期目標。請參考各相關套件的官方文件以獲取更多技術細節與最佳實踐指引。