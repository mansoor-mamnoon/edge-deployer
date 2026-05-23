# Code Signing

Pre-built releases are unsigned by default. This document explains how to set up signing so users don't see Gatekeeper / SmartScreen warnings.

---

## macOS (Developer ID + Notarization)

You need an **Apple Developer account** ($99/year) and a **Developer ID Application** certificate.

### Generate the certificate

1. Open **Keychain Access** → Certificate Assistant → Request a Certificate from a Certificate Authority
2. Log into [developer.apple.com/account](https://developer.apple.com/account) → Certificates → `+`
3. Choose **Developer ID Application** → follow the prompts → download the `.cer`
4. Double-click the `.cer` to install into Keychain
5. Export it as a `.p12`: right-click the cert in Keychain → Export → `.p12` format → set a strong password

### Add secrets to GitHub

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|---|---|
| `APPLE_ID` | Your Apple ID email (e.g. `you@example.com`) |
| `APPLE_ID_PASSWORD` | App-specific password — generate at [appleid.apple.com](https://appleid.apple.com) → Security → App-Specific Passwords |
| `APPLE_TEAM_ID` | Your 10-character Team ID from [developer.apple.com/account](https://developer.apple.com/account) |
| `CSC_LINK` | Base64-encoded `.p12`: `base64 -i cert.p12 \| pbcopy` |
| `CSC_KEY_PASSWORD` | The password you set when exporting the `.p12` |

Once all five secrets are set, the next `v*` tag push will produce a **signed and notarized** `.dmg`.

### First-run Gatekeeper bypass (unsigned builds)

Until signing is configured, macOS users need to bypass Gatekeeper once:

```bash
xattr -cr /Applications/Edge\ Deployer.app
```

Or: right-click the app → **Open** → click Open in the dialog.

---

## Windows (Authenticode)

You need a **Code Signing Certificate** from a trusted CA (DigiCert, Sectigo, etc.).

### Add secrets to GitHub

| Secret | Value |
|---|---|
| `WIN_CSC_LINK` | Base64-encoded `.p12` or `.pfx` certificate |
| `WIN_CSC_KEY_PASSWORD` | Certificate password |

```bash
base64 -i your-cert.pfx | tr -d '\n' | pbcopy   # macOS
# Then paste as WIN_CSC_LINK secret
```

---

## Linux

Linux packages (`.AppImage`, `.deb`) are not code-signed — Linux doesn't have a centralized signing authority. Package integrity is verified by the SHA-256 checksums published with each GitHub Release.

---

## Verifying a release

```bash
# macOS — check the signature
codesign -dvv /Applications/Edge\ Deployer.app

# macOS — check notarization
spctl -a -v /Applications/Edge\ Deployer.app

# Windows — check Authenticode
Get-AuthenticodeSignature "EdgeDeployer-Setup.exe"
```
