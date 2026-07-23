# 🐺 Werewolf Cards — แจกการ์ดบทบาทลับบนมือถือ

## วิธีเล่น

### 👑 คนดำเนินเกม (GM)
1. เปิดเว็บ → กด **"สร้างห้อง"**
2. ตั้งชื่อ + ตั้งรหัสผ่านห้อง
3. ได้ **รหัสห้อง 4 หลัก** → บอกเพื่อน
4. รอผู้เล่นเข้า → เลือกจำนวนบทบาท (ต้อง = จำนวนผู้เล่น)
5. กด **"สุ่มแจกการ์ด!"** → ทุกคนได้การ์ดลับบนมือถือตัวเอง

### 📱 ผู้เล่น
1. เปิดเว็บ → กด **"เข้าร่วมห้อง"**
2. ใส่รหัสห้อง + รหัสผ่าน + ชื่อ
3. รอ GM แจกการ์ด → **กดค้างเพื่อดูการ์ด** (ปล่อยมือ = ซ่อน)
4. เล่นเกมด้วยปาก/ในวง ตามปกติ

---

## วิธี Deploy (ฟรี)

### ตัวเลือก 1: Render.com (แนะนำ — ฟรี)
1. สร้าง repo ใน GitHub แล้ว push โค้ดนี้ขึ้นไป
2. ไปที่ [render.com](https://render.com) → New → Web Service
3. เชื่อม GitHub repo → เลือก:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. กด Deploy → ได้ลิงก์ `https://your-app.onrender.com`

### ตัวเลือก 2: Railway.app (ฟรี)
1. ไปที่ [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. เลือก repo → Deploy อัตโนมัติ

### ตัวเลือก 3: รันบนเครื่องตัวเอง (LAN เดียวกัน)
```bash
cd werewolf-cards
npm install
npm start
```
เปิด `http://YOUR_IP:3000` บนมือถือทุกเครื่อง (ต้องอยู่ WiFi เดียวกัน)

---

## โครงสร้างโปรเจกต์
```
werewolf-cards/
├── package.json        # dependencies
├── server.js           # Express + WebSocket server
├── public/
│   └── index.html      # Frontend (Mobile-first)
└── README.md
```

## เทคโนโลยี
- **Backend**: Node.js + Express + ws (WebSocket)
- **Frontend**: Vanilla HTML/CSS/JS (ไม่มี framework)
- **Realtime**: WebSocket ส่งการ์ดให้แต่ละคนทันที
- **ขนาด**: ~20KB (โหลดเร็วมาก)
