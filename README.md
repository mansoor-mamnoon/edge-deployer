# ⚡ Edge Deployer — Zero-Config Serverless IDE for Multi-Cloud APIs

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white)
![Pulumi](https://img.shields.io/badge/Pulumi-infra--as--code-purple?style=flat&logo=pulumi&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-FA743E?style=flat&logo=cloudflare&logoColor=white)
![Last Commit](https://img.shields.io/github/last-commit/mansoor-mamnoon/edge-deployer)
![Open Issues](https://img.shields.io/github/issues/mansoor-mamnoon/edge-deployer)
![GitHub stars](https://img.shields.io/github/stars/mansoor-mamnoon/edge-deployer?style=social)
![MIT License](https://img.shields.io/badge/License-MIT-green.svg)

**Edge Deployer** is a no-code, drag-and-drop Electron IDE for deploying serverless APIs to multiple clouds.  
Powered by Monaco, Pulumi, and a modular deployment layer — all **without using the CLI.**

> A multi-cloud deployment IDE for solo devs, teams, and builders who hate YAML.

---

## 📚 Table of Contents

- [Why Edge Deployer](#-why-edge-deployer)
- [Demo](#-demo)
- [Features](#-key-features)
- [Install](#-install)
- [Architecture](#-system-architecture)
- [How It Works](#-how-it-works-step-by-step)
- [Tech Stack](#-tech-stack)
- [Output Example](#-output-example)
- [Who Is This For](#-who-is-this-for)
- [Used In](#-used-in)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [About the Author](#-about-the-author)

---

## 🔥 Why Edge Deployer?

Cloud deployment should feel like clicking “Run,” not reading AWS docs for 45 minutes.  
Edge Deployer simplifies the dev → test → deploy loop:

- ✅ Write edge functions in JavaScript/TypeScript
- ✅ Preview instantly in a secure iframe
- ✅ Deploy to Cloudflare, AWS Lambda, or Vercel in 1 click
- ✅ View deploy logs and test the live endpoint — all inside the app

Perfect for solo devs, hackathon teams, or internal tools — without the infra setup headache.

---

## 📸 Demo

<p align="center">
  <img src="docs/demo.gif" width="700" alt="Edge Deployer Demo" />
</p>
<p align="center"><i>Live-edit → Preview → One-click Deploy</i></p>

---

## ✨ Key Features

### 🧠 Code + Preview
- Monaco editor with dark mode, drag-and-drop file support
- Live preview iframe executes fetch handlers + logs output
- Real-time feedback: `✅ 200 OK`, `❌ Error`, or console output

### ☁️ Deploy in One Click
- Supports **Cloudflare Workers** (via Pulumi), AWS Lambda, Vercel
- Stores credentials in localStorage
- Color-coded deploy logs + deploy history viewer

### 📦 Pulumi ZIP Generator
- Automatically creates:
  - `Pulumi.yaml`
  - `index.ts` function handler
  - `tsconfig.json`
- Downloadable as ZIP — deployable via `pulumi up`

### 🧪 Built-in API Testing
- Set method (`GET` / `POST`)
- Add body payload
- View response logs and status codes inline

---

## 🚀 Install

```bash
# One-liner install via GitHub Release
curl -L https://github.com/mansoor-mamnoon/edge-deployer/releases/download/v1.0.0/edge-deployer-mac.dmg -o edge-deployer.dmg
```

> Builds for Windows and Linux coming soon. Planning Homebrew formula + .AppImage for cross-platform support.

---

## 📚 Documentation

> Full documentation coming soon. For now, explore the app via the live demo above.

Planned docs include:
- Architecture diagrams
- Deployment model explainers
- Plugin authoring guide

---

## 🧱 System Architecture

```text
Electron (Main)
│
├── preload.ts                  ← Secure bridge to frontend via contextBridge
├── multiCloudDeployer.ts       ← Handles Cloudflare/AWS/Vercel dispatch
├── generatePulumiCloudflare.ts ← Creates ZIP with Pulumi IaC
│
└── Renderer (React + TS)
    ├── MonacoEditor.tsx         ← VSCode-style drag & drop editor
    ├── Preview.tsx              ← Sandboxed fetch-based live runner
    ├── DeployLogPanel.tsx       ← Streams logs via IPC
    ├── TestPanel.tsx            ← API tester with method + body
    ├── DeployHistoryPanel.tsx   ← View last 5 deploys
    └── ConfigModal.tsx          ← Credential + project config
```

---

## 🧪 How It Works (Step-by-Step)

```bash
# 1. Clone and run locally
git clone https://github.com/mansoor-mamnoon/edge-deployer
cd edge-deployer
npm install
npm run dev
```

```md
2. Then inside the app:
- 💡 Write or paste a JavaScript fetch handler
- ▶️ Click “Run” to preview the live response
- ☁️ Click “Deploy” to push to your chosen cloud
- 🔗 Copy the deployment URL (Cloudflare or AWS)
- 🧪 Use the built-in tester to send requests
- 📥 Download the Pulumi ZIP for GitOps or manual deployment
```

---

## 📤 Output Example

```ts
// Deployed Function
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  return new Response("Hello from your deployed API!", {
    headers: { "Content-Type": "text/plain" },
  });
}
```

```yaml
# Pulumi.yaml (generated)
name: edge-worker
runtime: nodejs
description: Cloudflare worker generated by Edge Deployer
```

```ts
// index.ts (Pulumi entrypoint)
import * as cloudflare from "@pulumi/cloudflare";

export const worker = new cloudflare.WorkerScript("my-worker", {
  name: "my-worker",
  content: `...`,
});
```

---

## 👤 Who Is This For?

- 🧑‍💻 Devs tired of managing IAM roles and YAML
- 🧪 API teams building internal tools
- 🚀 Hackathon teams needing fast deploys
- 🛠 Engineers prototyping serverless workflows

---

## 🌍 Used In

> Feature coming soon: public usage showcase.

Want to be featured? Fork the project and tag [`#EdgeDeployer`](https://github.com/topics/edgedeployer).

---

## 🧠 Tech Stack

| Layer         | Technology                            |
|---------------|----------------------------------------|
| Desktop Shell | Electron                               |
| Editor        | React + TypeScript + Monaco Editor     |
| Deploy Logic  | Pulumi, JSZip, file-saver              |
| Infra-as-Code | Pulumi (TypeScript generator)          |
| Cloud Targets | Cloudflare Workers (✅), AWS, Vercel (WIP) |

---

## 🔮 Roadmap

- [ ] Vercel deploy via REST API
- [ ] AWS Lambda ZIP + region picker
- [ ] Terraform `.tf` export
- [ ] Plugin-based provider system
- [ ] UI improvements: tabbed editing, autosave, onboarding
- [x] Configurable deploy target
- [x] Downloadable Pulumi bundle
- [x] API tester panel
- [x] Deploy history with timestamp + URL

---

## 🤝 Contributing

Want to extend to Azure, Netlify, or Railway?

Feel free to:
- Submit an issue
- Fork and PR a new deployer
- Improve UX with keyboard shortcuts or linting

📬 Or message me directly via [LinkedIn](https://www.linkedin.com/in/mansoormamnoon)

---

## 📄 License

This project is licensed under the MIT License.  
Feel free to fork, build, remix, or contribute.

> Built to remove the friction between development and deployment.

---

## 👨‍💻 About the Author

**Mansoor Mamnoon**  
Creator of **Edge Deployer**, NeuroQuant Agent, and BlackUnicrn tooling.  
UC Berkeley • Software Engineer • Systems & Infra Enthusiast  

> Passionate about building fast developer tools, systems UX, and low-ceremony infrastructure.

🔗 [LinkedIn](https://www.linkedin.com/in/mansoormamnoon) • 🌐 [Portfolio](https://mansoor-mamnoon.github.io/personal-website)
