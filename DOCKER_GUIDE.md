# SafeCodium / Safe Vibe AI — Docker Run Guide

Is project ko kisi bhi doosre developer, evaluator ya judge ke computer par **bina kisi local Python ya Node setup ke** Docker ke through 1-command mein chalaya ja sakta hai.

---

## 🚀 Quick Start (Single Command)

Project ke root folder mein terminal khol kar bas yeh command chalayein:

```bash
docker compose up --build
```
*(Ya agar purana Docker CLI hai toh: `docker-compose up --build`)*

Is command ke execute hote hi:
1. **Frontend:** React 19 + Tailwind + Monaco Editor build hokar bundle ho jayega.
2. **Backend:** FastAPI, Clang/GCC compilers, AddressSanitizer, aur Python dependencies container ke andar automatically install ho jayengi.
3. **Database:** PostgreSQL container initialize ho jayega.
4. **App Ready:** App seedha **`http://localhost:8000`** par live ho jayegi!

---

## ⚙️ Environment Variables (Optional)

Agar unhe real Gemini AI model use karna hai:
Root folder mein `.env` file mein apni key daal sakte hain:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
> **Note:** Agar API key nahi bhi daalenge, tab bhi platform ka **Deterministic Fallback Engine** chalta rahega aur static analysis + verification test pass honge.

---

## 🛑 How to Stop

Container stop karne ke liye:
```bash
docker compose down
```
Data wipe karne ke saath stop karne ke liye:
```bash
docker compose down -v
```

