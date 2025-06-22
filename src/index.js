"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const client_1 = require("react-dom/client");
const MonacoEditor_1 = __importDefault(require("./components/MonacoEditor"));
const App = () => {
    const [code, setCode] = (0, react_1.useState)(`export default {
    async fetch(request) {
      return new Response("Hello from your deployed API!", {
        headers: { "Content-Type": "text/plain" },
      });
    }
  };`.trim());
    return (react_1.default.createElement("div", { style: { height: "100vh", width: "100vw", display: "flex", flexDirection: "column" } },
        react_1.default.createElement("div", { style: { display: "flex", gap: "10px", padding: "8px", background: "#1e1e1e" } },
            react_1.default.createElement("button", { onClick: () => window.electronAPI.saveFile(code) }, "\uD83D\uDCBE Save"),
            react_1.default.createElement("button", { onClick: async () => {
                    console.log("📂 Open button clicked");
                    const content = await window.electronAPI.openFile();
                    console.log("📂 Received content:", content);
                    if (content)
                        setCode(content);
                    else
                        console.warn("📂 No content received!");
                } }, "\uD83D\uDCC2 Open")),
        react_1.default.createElement("div", { style: { flexGrow: 1 } },
            react_1.default.createElement(MonacoEditor_1.default, { code: code, language: "javascript", onChange: setCode }))));
};
const container = document.getElementById("root");
if (container) {
    (0, client_1.createRoot)(container).render(react_1.default.createElement(App, null));
}