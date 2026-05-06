# ระบบจองที่นั่งห้องเรียน (Classroom Seat Booking System)

## 📋 ข้อมูลโปรเจกต์

ระบบจองที่นั่งห้องเรียนแบบ Real-time ที่พัฒนาด้วย **Node.js + Express + Socket.io**

พร้อม **Admin Panel** สำหรับจัดการการจอง

- ✅ เก็บข้อมูลการจองในไฟล์ `bookings.json`
- ✅ UI Responsive ด้วย Tailwind CSS
- ✅ อัปเดตข้อมูลแบบ Real-time ผ่าน Socket.io
- ✅ ป้องกันการจองซ้ำ
- ✅ เรียงรูปแบบตามภาพออกแบบ (3 columns, 5 rows = 45 seats)
- ✅ **Admin Panel** - จัดการการจองทั้งหมด (ลบ เพิ่ม ค้นหา)

---

## 🚀 วิธีติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. รันเซิร์ฟเวอร์

```bash
npm start
```

หรือสำหรับโหมด Development (ใช้ nodemon):

```bash
npm run dev
```

### 3. เข้าชมระบบ

เปิด Browser แล้วไปที่: **http://localhost:3000**

---

## 📁 โครงสร้างไฟล์

```
seat/
├── server.js              # เซิร์ฟเวอร์ Express + Socket.io
├── package.json           # Dependencies
├── bookings.json          # ไฟล์เก็บข้อมูลการจอง
├── views/
│   └── index.ejs         # หน้าเว็บ (HTML + Tailwind CSS)
└── README.md             # ไฟล์อธิบาย
```

---

## 🎯 คุณสมบัติหลัก

### 1. **การจองที่นั่ง**
- ค้นหาที่นั่งบนแผนผังหรือกรอกรหัสที่นั่ง (เช่น A1)
- ป้อนชื่อและเลขประจำตัวนักศึกษา
- กดปุ่ม "จองที่นั่ง"

### 2. **Real-time Updates**
- ทุกคนที่เข้าชมระบบจะได้ดูการจองแบบสด
- ไม่ต้องกด Refresh
- อัปเดตข้อมูลผ่าน Socket.io

### 3. **ป้องกันการจองซ้ำ**
- ระบบตรวจสอบถ้า seatId ถูกจองแล้วจะแสดง Alert

### 4. **ยกเลิกการจอง**
- สามารถยกเลิกการจองได้จากรายการ "การจองล่าสุด"

---

## 📊 โครงสร้าง Seat (45 ที่นั่ง)

```
TV (ที่ด้านหน้าห้อง)

บล็อค A, B, C  (แถวที่ 1)
บล็อค D, E, F  (แถวที่ 2)
บล็อค G, H, I  (แถวที่ 3)
บล็อค J, K, L  (แถวที่ 4)
บล็อค M, N, O  (แถวที่ 5)

เทพ: ได้ะครู (ที่นั่งผู้สอน)
หน้าต่าง 1, 2 (ด้านซ้าย)
ประตู 1, 2 (ด้านขวา)
```

แต่ละบล็อคมี 3 ที่นั่งย่อย:
- บล็อค A = A1, A2, A3
- บล็อค B = B1, B2, B3
- ... และอื่นๆ

**รวมทั้งหมด = 15 บล็อค × 3 ที่นั่ง = 45 ที่นั่ง**

---

## 📝 ไฟล์ bookings.json

ตัวอย่างข้อมูลการจอง:

```json
[
  {
    "seatId": "A1",
    "nickname": "โต้ง",
    "timestamp": "2026-05-04T10:30:00Z"
  },
  {
    "seatId": "B2",
    "nickname": "แต้ว",
    "timestamp": "2026-05-04T10:35:00Z"
  }
]
```

---

## 🔌 API Endpoints

### GET /
หน้าเหลือบ

### GET /admin
หน้าแอดมิน - จัดการการจองทั้งหมด

### GET /api/bookings
ดึงข้อมูลการจองทั้งหมด

```javascript
[
  {
    "seatId": "A1",
    "nickname": "โต้ง",
    "timestamp": "2026-05-04T10:30:00Z"
  }
]
```

### POST /api/bookings
เพิ่มการจองใหม่

**Request Body:**
```json
{
  "seatId": "A1",
  "nickname": "โต้ง"
}
```

### DELETE /api/bookings/:seatId
ยกเลิกการจอง

---

## 🔌 Socket.io Events

### Client → Server

- **book-seat**: ส่งการจองใหม่
  ```javascript
  socket.emit('book-seat', {
    seatId: 'A1',
    nickname: 'โต้ง'
  });
  ```

- **cancel-booking**: ยกเลิกการจอง
  ```javascript
  socket.emit('cancel-booking', 'A1');
  ```

### Server → Client

- **load-bookings**: ส่งข้อมูลการจองทั้งหมด
- **booking-success**: แจ้งการจองสำเร็จ
- **booking-failed**: แจ้งการจองล้มเหลว
- **cancel-success**: แจ้งยกเลิกสำเร็จ
- **cancel-failed**: แจ้งยกเลิกล้มเหลว

---

## 🎨 UI Layout

| หน้าต่าง 1 |   หลัก   | ประตู 1 |
|----------|---------|---------|
|    TV    |  ได้ะครู | ประตู 1 |
| บล็อค A  | บล็อค B | บล็อค C |
| บล็อค D  | บล็อค E | บล็อค F |
| บล็อค G  | บล็อค H | บล็อค I |
| บล็อค J  | บล็อค K | บล็อค L |
| บล็อค M  | บล็อค N | บล็อค O |

---

---

## ⚙️ Admin Panel

### เข้าถึง Admin

ไปที่: **http://localhost:3000/admin**

### ฟีเจอร์ Admin

✅ **Dashboard** - ดูสถิติการจองแบบ Real-time
✅ **เพิ่มการจอง** - จองที่นั่งให้คนอื่น
✅ **ค้นหา** - ค้นหาชื่อเล่นหรือที่นั่ง
✅ **ลบการจอง** - ลบการจองที่ผิดพลาด
✅ **ภาพรวมที่นั่ง** - ดูสถานะที่นั่งทั้งหมด
✅ **เรียงลำดับ** - เรียงตามที่นั่งหรือเวลา

---

## 🛠️ Technologies Used

- **Backend**: Node.js + Express.js
- **Real-time**: Socket.io
- **Frontend**: EJS Template + Vanilla JavaScript
- **Styling**: Tailwind CSS
- **Storage**: JSON File

---

## ⚙️ Configuration

Port Default: `3000`

สามารถเปลี่ยนได้ที่ `server.js`:

```javascript
const PORT = process.env.PORT || 3000;
```

---

## 📄 License

MIT

---

## 👨‍💻 Author

Classroom Seat Booking System
