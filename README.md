# Jongwen · ระบบจองสถานที่ ยืม–คืนครุภัณฑ์ และแจ้งซ่อม ผ่าน LINE OA (Monorepo)

แปลงจากต้นฉบับ `booking-uiux_jongwen_17 (5).html` เป็น **Web Monorepo** ด้วย **Next.js + NestJS + Tailwind CSS + Shared Mock Data (`mockDataAccount`)**
*(ไม่รวมส่วน **Design Tokens** และ **ตั้งค่าการแสดงผล** ตามที่กำหนด)*

---

## โครงสร้าง Monorepo

```text
BookingV1/
├── packages/
│   └── shared/                 # @jongwen/shared — Types, Labels, Logic และ Mock Data
│       └── src/
│           ├── mock/
│           │   ├── accounts.ts   # mockAccounts (mockDataAccount ครบทุกบทบาท)
│           │   ├── resources.ts  # mockVenues & mockEquipment
│           │   └── requests.ts   # mockRequests, mockNotifications, mockActivities
│           ├── types.ts
│           ├── labels.ts
│           └── logic.ts
├── apps/
│   ├── api/                    # @jongwen/api — NestJS REST API (:4000/api)
│   │   └── src/
│   │       ├── auth/             # Login, Register, Signature, PIN, Mock Accounts
│   │       ├── resources/        # Venues, Equipment, Monthly Availability, Conflict Check
│   │       ├── requests/         # Booking, Borrow, Repair, 3-Level Sign, Handover, Reschedule
│   │       ├── admin/            # Users & Permissions, Reports Summary, Overview, Notifications
│   │       └── db/               # In-memory Mock Database Service
│   └── web/                    # @jongwen/web — Next.js (App Router) + Tailwind CSS (:3000)
│       └── src/
│           ├── app/              # หน้าจอทั้งหมด 16 Flow (Responsive Phone/Tablet/Desktop)
│           ├── components/       # AppShell, AuthProvider, CalendarC4, Stepper, PinKeypad ฯลฯ
│           └── lib/api.ts
├── package.json
└── pnpm-workspace.yaml
```

---

## บัญชีทดสอบ (`mockDataAccount`)

สามารถคลิกสลับบทบาทได้ทันทีจากแถบ **`mockDataAccount`** ด้านบนสุดของทุกหน้า หรือเข้าผ่านหน้า `/login`:

| ชื่อผู้ใช้ (`username`) | ชื่อ-นามสกุล | บทบาท (`role`) | รหัสผ่าน | PIN ลงนาม |
| :--- | :--- | :--- | :--- | :--- |
| `somchai` | สมชาย ใจดี | ผู้ใช้งานทั่วไป (`USER`) | `1234` | - |
| `manee` | มานี มีนา | ผู้ใช้งานทั่วไป (`USER`) | `1234` | - |
| `suda` | สุดา มีสุข | เจ้าหน้าที่ (`STAFF`) | `1234` | `123456` |
| `wichai` | วิชัย รักถิ่น | ปลัด อบต. · ผู้อนุมัติระดับ 2 (`APPROVER_L2`) | `1234` | `123456` |
| `prasert` | ประเสริฐ ศรีสุข | นายก อบต. · ผู้อนุมัติระดับ 1 (`APPROVER_L1`) | `1234` | *(ยังไม่ตั้ง — ทดสอบหน้าตั้งค่าได้)* |
| `admin` | ผู้ดูแลระบบ | แอดมิน (`ADMIN`) | `1234` | - |

---

## วิธีรันโปรเจกต์

```bash
# 1. ติดตั้งแพ็กเกจทั้งหมด
pnpm install

# 2. รันทั้งระบบ (Build @jongwen/shared + รัน NestJS API :4000 และ Next.js Web :3000 พร้อมกัน)
pnpm dev
```

- **เว็บแอป (Next.js)**: http://localhost:3000
- **API (NestJS)**: http://localhost:4000/api *(Next.js ตั้งค่า Proxy `/api/*` ไปยัง `:4000` ให้แล้ว)*

---

## รายการหน้าจอในระบบ

1. **เข้าสู่ระบบและหน้าแรก**
   - `/login` — เข้าสู่ระบบ LINE Login + บัญชีผู้ใช้ + PDPA + แผงเลือก `mockDataAccount`
   - `/register` — ลงทะเบียนผู้ใช้ใหม่ + ยืนยันรหัส OTP 6 หลัก + PDPA
   - `/` — หน้าแรกประชาชน (บริการหลัก 3 เมนู, คำขอของฉันแยกแท็บ, ใกล้ถึงกำหนดคืน, แจ้งเตือนล่าสุด)
2. **จองสถานที่ (4 ขั้นตอน)**
   - `/booking` — `1/4` เลือกสถานที่ (พร้อมตัวกรอง) → `2/4` เลือกวัน-เวลา (ปฏิทิน C4 + ตรวจสอบช่วงเวลาซ้อนทับ) → `3/4` กรอกแบบคำขอ → `4/4` ลงนามและส่ง
3. **ยืม–คืนครุภัณฑ์ (3 ขั้นตอน + รายการยืมของฉัน)**
   - `/borrow` — `1/3` เลือกอุปกรณ์ → `2/3` กรอกคำขอยืม → `3/3` ลงนามและส่ง
   - `/borrow/my` — รายการยืมของฉัน + ปุ่มแจ้งคืน
4. **แจ้งซ่อม และติดตามคำขอ**
   - `/repair` — แจ้งปัญหา/ซ่อมบำรุง (แนบรูป) + ติดตามแจ้งซ่อม & ตรวจรับงาน
   - `/requests/[id]` — รายละเอียดคำขอและไทม์ไลน์ความคืบหน้า 5 ขั้นตอน
   - `/requests/[id]/reschedule` — ขอเลื่อนวัน / ยกเลิกการจอง
5. **เจ้าหน้าที่ (`STAFF`)**
   - `/staff` — หน้าหลักเจ้าหน้าที่
   - `/staff/review` — ตรวจและอนุมัติคำขอ + เช็คลิสต์ 4 ข้อ
   - `/staff/handover` — รับมอบ-คืน (เช็คลิสต์ ก่อนใช้ / หลังใช้)
   - `/staff/walk-in` — กรอกคำขอแทนผู้มาติดต่อที่เคาน์เตอร์
6. **ลงนามเอกสาร 3 ระดับ (`STAFF` → `APPROVER_L2` → `APPROVER_L1`)**
   - `/approver` — หน้าหลักผู้มีอำนาจ (ปลัด / นายก)
   - `/approver/settings` — ตั้งค่าลายเซ็น + ตั้งรหัส PIN 6 หลัก
   - `/approver/sign/[id]` — ลงนามเอกสาร 3 ระดับ + ยืนยันด้วย PIN 6 หลัก
   - `/approver/permit/[id]` — ลงนามครบ + เอกสารใบอนุญาต (PDF)
7. **ผู้ดูแลระบบและรายงาน (`ADMIN`)**
   - `/admin` — หน้าแรกผู้ดูแลระบบ
   - `/admin/permissions` — จัดการสิทธิ์และบทบาทผู้ใช้
   - `/admin/resources` — จัดการทรัพยากรและแบบฟอร์ม (เปิด/ปิดให้จอง)
   - `/admin/resources/new` — เพิ่มรายการสถานที่/อุปกรณ์ (2 ขั้นตอนบนมือถือ / 2 คอลัมน์บน Desktop)
   - `/reports` — รายงานการใช้งาน + ส่งออกไฟล์ Excel (CSV) / PDF
