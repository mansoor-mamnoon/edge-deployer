# ⚡ Edge Deployer – Serverless IDE for Multi-Cloud Deployment

**Edge Deployer** is a lightweight Electron-based IDE for building, previewing, and deploying serverless functions to edge platforms. Built for developers who want CLI-free cloud deployment — with one-click support for Cloudflare Workers and Infrastructure-as-Code generation via Pulumi.

---

<img width="1512" alt="image" src="https://github.com/user-attachments/assets/26a50f46-86b0-4e09-9f1f-739d0d53e8f9" />

<img width="468" alt="image" src="https://github.com/user-attachments/assets/3ede13f6-b023-4019-b78b-4acd9499731a" />


## ✅ Current Capabilities

- 🖥️ Write and preview JavaScript serverless functions in a local IDE
- 💾 Save and open local files seamlessly
- 🧠 Live preview inside an embedded iframe sandbox
- ☁️ Deploy to **Cloudflare Workers** with custom config
- 📥 **Download Pulumi IaC ZIP** (Pulumi.yaml + tsconfig + index.ts) for Cloudflare
- 🛠️ Configurable settings (script name, credentials) via UI
- 📦 Download deployable ZIP for general serverless packaging 

---

## ✨ Features

- ⚡ One-click deployment to Cloudflare Workers (AWS and Vercel support scaffolded)
- 📝 Live code editor with Monaco (VSCode-style)
- 🔐 Environment variable config modal
- 📟 **Real-time Deploy Logs** with:
  - Timestamped log lines
  - Color-coded messages (✅ success, ⚠️ warning, ❌ error)
  - IPC communication between Electron and UI
- 🧪 Built-in test panel for API request preview
- 📦 **Deploy History Panel**: Displays your last 5 deployments with timestamp, cloud provider, and deploy URL — saved locally for persistence across sessions.

### 🧠 Live Preview Enhancements

- Shows real-time status of your code's output (e.g., ✅ 200 OK or ❌ error)
- Displays detailed error messages directly inside the preview panel
- Includes a loading animation while your code is being processed




## 🛠️ Stack Overview

| Layer          | Tech Used                                      |
|----------------|------------------------------------------------|
| Frontend       | React, TypeScript, Electron (Renderer)         |
| Infra-as-Code  | Pulumi (TS-based Cloudflare scripts)           |
| Bundling       | Webpack, JSZip, file-saver                     |
| Backend Logic  | Electron (Main), Node, IPC + `contextBridge`   |
| Multi-Cloud    | Modular deployers per provider (WIP for AWS/Vercel) |

---

## 🧱 Architecture

```

Electron (Main)
│
├── preload.ts                ← Exposes secure APIs to Renderer via contextBridge
│
├── electron/
│   ├── multiCloudDeployer.ts         ← Handles switching between cloud targets
│   ├── generatePulumiCloudflare.ts   ← Builds Pulumi project files from user code
│
├── src/
│   ├── components/
│   │   └── Toolbar.tsx               ← Main UI buttons (Deploy, Save, Pulumi, etc.)
│   ├── cloudDeployers/
│   │   └── cloudflareDeployer.ts     ← Executes pulumi up for Cloudflare
│   ├── infra/cloudflare/
│   │   └── pulumi.ts                 ← Pulumi YAML + TS config generators
│   └── types/
│       └── index.ts                  ← Shared types like EnvConfig

```


## 🧪 How Pulumi Works

When you click **Download Pulumi**, the app:
1. Reads your code from the editor
2. Uses `generatePulumiCloudflare.ts` to generate:
   - `Pulumi.yaml` (project config)
   - `index.ts` (function handler)
   - `tsconfig.json`
3. Bundles the files into a ZIP via JSZip
4. Downloads the ZIP to your local system

> The generated project can be deployed manually via `pulumi up` if Pulumi CLI is installed and authenticated.

---

## 🧠 Why This Project Matters

Unlike typical CRUD or front-end apps, **Edge Deployer**:
- Bridges developer UX and backend infrastructure
- Uses real-world tools like Pulumi and Electron IPC
- Enables deployable code with *no CLI* required
- Prepares users for **multi-cloud, serverless environments**

---

## 🔮 Roadmap

- ⏳ **Deploy to AWS Lambda** via Terraform or CLI wrappers
- ⏳ **Deploy to Vercel** via REST API or CLI
- ⏳ **Terraform `.tf` download** (like Pulumi, but HCL)
- ⏳ **Real-time deploy logs** for all cloud targets
- ✅ Pulumi ZIP export for Cloudflare
- ⏳ Interactive deploy history panel

---

## 🧑‍💻 Author

**Mansoor Mamnoon**  
UC Berkeley • Software Engineer • Systems + Infra Enthusiast  
🔗 [LinkedIn](https://www.linkedin.com/in/mansoormamnoon) • 🌐 [Portfolio](https://mansoor-mamnoon.github.io/personal-website/)

---

## 🖼️ Screenshot

<img width="1512" alt="image" src="https://github.com/user-attachments/assets/38176360-f4c4-4157-aaf5-8663908b645b" />



## 🛠️ To Run Locally

```bash
git clone https://github.com/your-username/edge-deployer.git
cd edge-deployer
npm install
npm run dev


