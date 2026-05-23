# 🤝 Contributing to Edge Deployer

Welcome — and thanks for your interest in contributing to **Edge Deployer**!

This project aims to make cloud deployment effortless through a native, no-terminal, drag-and-drop IDE. Whether you’re fixing a bug, building a new deployer, or improving the UX, your contributions are welcome and appreciated.

---

## 🛠 Local Development Setup

To get started locally:

```bash
git clone https://github.com/mansoor-mamnoon/edge-deployer.git
cd edge-deployer
npm install
npm run dev

```

This will launch the Electron app in development mode with hot reload.

---

## 🧩 Areas You Can Help With

Here are some great ways to contribute:

### 🖥️ Platform Support
- Add Windows and Linux installers  
- Package `.AppImage` for universal Linux support

### 🌐 Cloud Providers
Add deployers for:
- Vercel (REST API or CLI)  
- AWS Lambda ZIP deploys  
- Netlify, Fly.io, Railway

### 🧠 Editor & UX Features
- Monaco linting + TypeScript errors  
- Tabbed multi-file editing  
- Live deploy preview links  
- Keyboard shortcuts and accessibility features

### 🛠 Dev Infra
- Add E2E test framework (Playwright or Spectron)  
- GitHub Actions workflow for lint + package builds

---

## 🧪 Testing Your Changes

There’s no formal test suite yet. You can test locally by running:

```bash
npm run dev

```

Make sure you can:

- Write and preview a handler  
- Deploy to a selected cloud (Cloudflare = default supported)  
- See console logs and API tester output  
- Download a working Pulumi ZIP  

Please test your changes across both dev and prod builds if possible.

---

## 💬 Communication

If you're planning a larger change or want to ask questions, please:

- Open a GitHub issue to start a conversation  
- Use the Discussions tab (coming soon)  
- Reach out on [LinkedIn](https://www.linkedin.com/in/mansoormamnoon)

---

## 📄 Code Style

Edge Deployer uses:

- TypeScript (strict mode)  
- ESLint for linting  
- Prettier for formatting

Please run:

```bash
npm run lint
```

And format with:

```bash
npx prettier --write .
```

before opening a pull request.

---

## 🏷️ Issue Labels

Look out for issues tagged:

- `good first issue` – beginner-friendly entry points  
- `help wanted` – actively seeking collaborators  
- `discussion` – ideas and RFCs in progress  

---

## 📦 Submitting a Pull Request

1. Fork the repo  
2. Create a new branch:

```bash
git checkout -b feat/your-feature-name
```

3. Make your changes with clear commit messages  
4. Push your branch and open a pull request to `main`  
5. Describe your changes clearly and reference related issues  

---

Thanks for helping simplify serverless — one deploy at a time 🚀





