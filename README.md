# Evoo AI OS — All-in-One

Zintegrowana aplikacja PWA łącząca wszystkie moduły Evoo w jedno miejsce.

## Moduły

| Moduł | Opis |
|-------|------|
| **Czat AI** | Wielo-providerowy czat z routerem modeli (Gemini, Groq, Cerebras, Mistral, DeepSeek, xAI) |
| **Vault** | Lokalny, szyfrowany menadżer haseł (AES-GCM 256 + PBKDF2 150k) |
| **Gemini Deep** | Powierzchnia integracji z Gemini |
| **Pipi** | Asystent planów dnia i zadań |
| **Aurora** | Status i możliwości zaawansowanego agenta |

## Uruchomienie lokalne

```bash
# dowolny serwer statyczny, np.
npx serve .
# lub
python -m http.server 8080
```

Otwórz w przeglądarce i dodaj do ekranu głównego (PWA).

## Deploy na Vercel

1. Połącz to repo z Vercel
2. Framework Preset: Other
3. Build Command: (puste)
4. Output Directory: `.`
5. Deploy

Backend Convex (jeśli używasz) jest skonfigurowany w `config.js`.

## Struktura

```
├── index.html          # Launcher + wszystkie widoki
├── styles.css          # Motyw dark (Sora + Manrope)
├── app.js              # Nawigacja, czat, integracja
├── vault.js            # Szyfrowanie AES-GCM
├── config.js           # Adres API / Convex
├── sw.js               # Service Worker (offline)
└── manifest.webmanifest
```

## Bezpieczeństwo Vault

- Klucz wyprowadzany z hasła głównego (PBKDF2)
- Dane szyfrowane AES-GCM przed zapisem do localStorage
- Nic nie jest wysyłane na serwer

---

**Twój cel. Mój plan. Nasz wynik.**
