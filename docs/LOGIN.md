# Login & API credentials — Telegrow

Telegrow is a normal Telegram client: aap apne **hi naam** se login karte ho, koi bot ya proxy nahi.
Bas ek cheez chahiye — apni khud ki **API ID / API Hash** (Telegram har client app ko ek pair deta hai).

---

## 1. API ID / API Hash kahan se milega

1. Browser me kholo: **https://my.telegram.org** (ye Telegram ka official developer portal hai).
2. Apna **mobile number** daalo (country code ke saath, jaise `+91XXXXXXXXXX`).
3. Telegram app me ya SMS se aaya **login code** daalo.
4. Login hone ke baad → **“API development tools”** pe click karo.
5. Form bharo (koi bhi value chalegi):
   - **App title:** `Telegrow`
   - **Short name:** `telegrow`
   - **URL:** `https://sanjeettiwari1299-eng.github.io/telegram/`
   - **Platform:** `Other` / `Web`
   - **Description:** anything
6. **Create application** dabao. Ab screen pe:
   - **App api_id** → ek number, jaise `1234567`
   - **App api_hash** → 32 character ka hex string, jaise `0123456789abcdef0123456789abcdef`

Yahi do values chahiye. **api_hash ko secret treat karo** — public repo me commit mat karo.

> Ek Telegram account se ek hi app ban sakta hai. Agar “api_id” already bana hua hai to wahi purana pair use karo.

---

## 2. Ye values kahan daalni hain

### A) Live site (GitHub Pages) ke liye — recommended

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
| --- | --- |
| `TELEGRAM_API_ID` | app api_id |
| `TELEGRAM_API_HASH` | app api_hash |

Phir **Actions → Deploy to GitHub Pages → Run workflow** (ya koi bhi push) — build in values ke saath
hoga aur login kaam karega.

### B) Local development ke liye

Repo me `.env` file:

```env
TELEGRAM_API_ID=1234567
TELEGRAM_API_HASH=0123456789abcdef0123456789abcdef
BASE_URL=http://localhost:1234/
```

```sh
npm install
npm run dev     # http://localhost:1234
```

`.env` git-ignored hai — commit nahi hoga.

---

## 3. Login kaise hota hai (do tarike)

### Tarika 1 — QR code (sabse fast)

1. Site kholo → screen pe QR code dikhega.
2. Phone me Telegram kholo → **Settings → Devices → Link Desktop Device** (ya “Scan QR code”).
3. QR scan karo → browser me login ho jayega.

### Tarika 2 — Mobile number (OTP)

1. QR screen pe **“Log in by phone number”** pe click karo.
2. Country select karo (India: **+91**) aur apna number daalo → **Next**.
3. Telegram app me ya SMS se **5-digit code** aayega → daalo.
4. Agar account pe **2-step verification (2FA password)** laga hua hai to password bhi maangega — wahi daalo jo Telegram app me set kiya tha.

Number login bilkul supported hai — ye wahi official flow hai jo web.telegram.org pe hai.

---

## 4. “QR code hi nahi aa raha” — sabse common wajah

Agar login screen khaali hai / QR draw nahi hota, 99% chance ye hai ki build me **API credentials
missing** hain. Us case me Telegram har request `API_ID_INVALID` se reject karta hai, is liye login
token ban hi nahi paata.

Pehchano:
- App ke top pe **amber banner**: *“API credentials missing”* dikhega
- GitHub Actions run ke **annotations** me warning: *“Add TELEGRAM_API_ID and TELEGRAM_API_HASH …”*

Fix:

1. *Settings → Secrets and variables → Actions* me `TELEGRAM_API_ID` + `TELEGRAM_API_HASH` add karo
2. *Actions → Deploy to GitHub Pages → Run workflow* (ya koi push)
3. Hard refresh (Ctrl/Cmd + Shift + R) — service worker purana bundle cache kar sakta hai

## 5. Common errors

| Error | Matlab / fix |
| --- | --- |
| `API_ID_INVALID` | `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` galat ya missing hain — my.telegram.org se dobara check karo (aur secrets add karne ke baad redeploy karo) |
| QR box khaali / spinner | Credentials missing (upar section 4 dekho) ya Telegram WebSocket aapke network pe block hai |
| `PHONE_NUMBER_INVALID` | Country code ke saath poora number daalo, `+91` ke baad space/`0` nahi |
| `FLOOD_WAIT_xxx` | Telegram ne temporarily rate-limit kiya — xxx seconds/ghante ruk kar try karo |
| `SESSION_PASSWORD_NEEDED` | 2FA password maanga ja raha hai — apna Telegram cloud password daalo |
| Login ke baad blank/connection error | Network/DNS block; Telegram ke WebSocket block hote hain kuch ISPs pe — mobile data ya VPN try karo |

---

## 6. Security notes

- `api_hash` sirf build time pe bundle hota hai; repo me **secret** ke roop me rakho.
- Ye client aapke browser me session store karta hai (IndexedDB/localStorage) — public/shared computer pe login mat karo, ya baad me **Settings → Devices → Terminate** kar do.
- Koi ad/tracker nahi hai, par Telegram ke servers se connection obviously rehta hai (wahi to app hai).
