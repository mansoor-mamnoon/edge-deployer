# ⚡ Edge Deployer — Zero-Config Serverless IDE for Multi-Cloud APIs

> **🧩 Drag-and-drop desktop IDE for instantly deploying JS/TS APIs to Cloudflare, AWS, and Vercel — no config, no terminal, just deploy.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white)
![Pulumi](https://img.shields.io/badge/Pulumi-infra--as--code-purple?style=flat&logo=pulumi&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-FA743E?style=flat&logo=cloudflare&logoColor=white)
![Last Commit](https://img.shields.io/github/last-commit/mansoor-mamnoon/edge-deployer)
![Open Issues](https://img.shields.io/github/issues/mansoor-mamnoon/edge-deployer)
![Closed Issues](https://img.shields.io/github/issues-closed/mansoor-mamnoon/edge-deployer)
![GitHub stars](https://img.shields.io/github/stars/mansoor-mamnoon/edge-deployer?style=social)
![MIT License](https://img.shields.io/badge/License-MIT-green.svg)

> A multi-cloud deployment IDE for solo devs, teams, and builders who hate YAML.

---

## 📚 Table of Contents

- [Why Edge Deployer](#-why-edge-deployer)
- [Demo](#-demo)
- [Features](#-key-features)
- [Install](#-install)
- [Documentation](#-documentation)
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

Cloud deployment should feel like clicking “Run,” not configuring IAM.  
Edge Deployer removes devops friction and replaces it with velocity:

- ✅ Write JS/TS edge functions
- ✅ Preview instantly in-browser
- ✅ Deploy to Cloudflare, AWS, or Vercel — no CLI, no YAML
- ✅ View logs and test endpoints — all in one UI

Perfect for solo devs, hackathon teams, or internal APIs that need to ship now.

---

## 📸 Demo

<p align="center">
  <img src="docs/demo.gif" width="700" alt="Edge Deployer Demo" />
</p>
<p align="center"><i>Live-edit → Preview → One-click Deploy</i></p>

> 🎯 Tip: A version with mouse cursor and annotations is in progress.  
> Want to contribute a screencast or Loom walk-through? [Open an issue](https://github.com/mansoor-mamnoon/edge-deployer/issues)!

---

## ✨ Key Features

- ⚡ **Live Monaco Editor** – VSCode-like, drag-and-drop, multi-file aware
- 👁️ **Secure Preview Iframe** – Runs your fetch handler with real console output
- ☁️ **One-Click Cloud Deploy** – Cloudflare (via Pulumi), AWS Lambda, and Vercel (WIP)
- 🧪 **Built-in API Tester** – Send POST/GET to deployed endpoint, log responses
- 📦 **Pulumi ZIP Export** – Download full project with `Pulumi.yaml`, `index.ts`, `tsconfig.json`
- 📜 **Deploy History Viewer** – Last 5 deploys with timestamp, provider, and URL
- ⚙️ **Cloud Config Modal** – Store tokens, script names, regions, etc.

---

## 🚀 Install

```bash
# MacOS (universal)
curl -L https://github.com/mansoor-mamnoon/edge-deployer/releases/latest/download/edge-deployer-mac.dmg -o edge-deployer.dmg
```

> Don't see your platform in [Releases](https://github.com/mansoor-mamnoon/edge-deployer/releases)?  
> CLI support not planned — this tool is proudly **no-terminal™**.

---

## 📚 Documentation

> Full documentation is coming soon.

In the meantime:
- Use the demo above to explore the UI
- Check the codebase — it’s cleanly modular with deployers per provider
- Devs welcome to contribute `/docs` content!

---

## 🧱 System Architecture

```text
Electron (Main)
│
├── preload.ts                  ← Secure bridge to frontend via contextBridge
├── multiCloudDeployer.ts       ← Dispatch Cloudflare/AWS/Vercel handlers
├── generatePulumiCloudflare.ts ← Pulumi YAML + TS bundler
│
└── Renderer (React + TS)
    ├── MonacoEditor.tsx         ← VSCode-style rich editor
    ├── Preview.tsx              ← Sandbox iframe + feedback panel
    ├── DeployLogPanel.tsx       ← IPC-connected log streamer
    ├── TestPanel.tsx            ← Interactive API tester
    ├── DeployHistoryPanel.tsx   ← Persistent deploy summary
    └── ConfigModal.tsx          ← Env var and credential config
```

---

## 🧪 How It Works (Step-by-Step)

```bash
# 1. Run locally for dev
git clone https://github.com/mansoor-mamnoon/edge-deployer
cd edge-deployer
npm install
npm run dev
```

```md
2. Then inside the app:
- 🧠 Paste or write a JavaScript edge handler
- ▶️ Run to preview status (✅ 200 OK, ❌ error, etc.)
- ☁️ Deploy to your selected cloud
- 🔗 Grab the deployed URL
- 🧪 Test it in-app with POST/GET + body
- 📥 Export Pulumi bundle for GitOps or CLI use
```

---

## 📤 Output Example

```ts
// Deployed Worker
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
# Pulumi.yaml
name: edge-worker
runtime: nodejs
description: Generated with Edge Deployer
```

---

## 🧠 Tech Stack

| Layer         | Technology                            |
|---------------|----------------------------------------|
| Desktop Shell | Electron                               |
| Editor        | React + TypeScript + Monaco Editor     |
| Deploy Logic  | Pulumi, JSZip, file-saver              |
| Infra-as-Code | Pulumi (TS-based cloud config)         |
| Cloud Targets | Cloudflare (✅), AWS Lambda (WIP), Vercel (WIP) |

---

## 👤 Who Is This For?

- 🧑‍💻 Devs tired of IAM roles and CLI errors
- 🚀 Hackathon participants needing deploy speed
- 🧪 Teams testing internal APIs without overhead
- 🛠 Students learning cloud platforms the visual way

---

## 🌍 Used In

> Currently under development. This section will include real usage once version 1.0.0 is released and adopted.

---

## 🔮 Roadmap

- [ ] Vercel REST deployer
- [ ] AWS Lambda with ZIP + region config
- [ ] Terraform `.tf` generation
- [ ] Drag-and-drop ZIP upload deploys
- [ ] Inline error linter + Monaco warnings
- [x] Pulumi ZIP bundler
- [x] Deploy log + tester panels
- [x] Configurable cloud selection

---

## 🤝 Contributing

Want to:
- Add support for Azure, Netlify, or Fly.io?
- Improve onboarding flow or keyboard UX?
- Ship a CLI wrapper despite our “no-terminal” stance?

> PRs, issues, and discussions welcome.  
> Start here 👉 [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 License

MIT License — do what you want, just don't gate it behind YAML again 😄

> Built to replace cloud anxiety with deployment joy.

---

## 👨‍💻 About the Author

**Mansoor Mamnoon**  
UC Berkeley • Software Engineer • Systems & Infra Enthusiast  

> Creator of Edge Deployer, NeuroQuant Agent, and BlackUnicrn tooling.  
> Passionate about building fast developer tools, reducing friction, and enabling shipping over suffering.

🔗 [LinkedIn](https://www.linkedin.com/in/mansoormamnoon) • 🌐 [Portfolio](https://mansoor-mamnoon.github.io/personal-website)
