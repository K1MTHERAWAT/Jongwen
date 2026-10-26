# Jongwen · ระบบขอใช้สถานที่ ขอใช้อุปกรณ์ และแจ้งซ่อม ผ่าน LINE OA (Monorepo)

แปลงจากต้นฉบับ `booking-uiux_jongwen_17 (5).html` เป็น **Web Monorepo** ระดับ Production-ready ด้วย **Next.js + NestJS + Tailwind CSS + PostgreSQL (Prisma ORM) + Docker Compose**
*(ไม่รวมส่วน **Design Tokens**, **ตั้งค่าการแสดงผล** และตัดส่วน **รายงาน (`/reports`)** ออกตามข้อกำหนด)*

---

## สถาปัตยกรรมระบบ (Architecture)

* **Frontend**: Next.js 15 (App Router) + Tailwind CSS (Responsive Desktop / Tablet / Mobile)
* **Backend API**: NestJS 11 + Express + RESTful API
* **Database**: PostgreSQL 16 (Alpine) ผ่าน Docker Compose
* **ORM & Migrations**: Prisma ORM v6
* **Shared Package**: `@jongwen/shared` (TypeScript Types, Labels, Mock Data, RBAC Logic, Date Helpers)

---

## โครงสร้าง Monorepo

```text
BookingV1/
├── docker-compose.yml          # PostgreSQL 16 Service (Port 5433:5432, Healthcheck, Volume)
├── .env.example                # ตัวอย่าง Environment Variables สำหรับ Root
├── packages/
│   └── shared/                 # @jongwen/shared — Types, Labels, Logic และ Mock Data
│       └── src/
│           ├── mock/
│           │   ├── accounts.ts   # mockAccounts (ข้อมูลบัญชีครบทุกบทบาท)
│           │   ├── resources.ts  # mockVenues & mockEquipment
│           │   └── requests.ts   # mockRequests, mockNotifications, mockActivities
│           ├── types.ts          # Shared Models, Request Types, OfficialFormPurposeItem
│           ├── labels.ts         # ข้อความ/ป้ายกำกับภาษาไทยสำหรับบทบาท สถานะ และประเภทคำขอ
│           ├── logic.ts          # RBAC (canAccessRoute), สายอนุมัติ 3 ระดับ, ตรวจสอบช่วงเวลา
│           └── index.ts
├── apps/
│   ├── api/                    # @jongwen/api — NestJS REST API (:4000/api)
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Prisma Data Model (10 ตาราง + Enums)
│   │   │   ├── migrations/       # SQL Migration Files (Prisma Migrate)
│   │   │   └── seed.ts           # Standalone Seed Script (tsx)
│   │   ├── .env.example          # ตัวอย่าง DATABASE_URL สำหรับ NestJS
│   │   └── src/
│   │       ├── auth/             # Login, Register, Signature, PIN, Session Tokens, Brute-force Lock
│   │       ├── resources/        # Venues, Equipment, Monthly Availability, Conflict Check
│   │       ├── requests/         # Booking, Borrow, Repair, 3-Level Sign, Handover, Reschedule
│   │       ├── admin/            # Users & Permissions, Overview, Notifications
│   │       └── db/               # Prisma Database Service (Auto-seed & Hydration to PostgreSQL)
│   └── web/                    # @jongwen/web — Next.js (App Router) + Tailwind CSS (:3000)
│       ├── public/               # Static Assets (โลโก้ อบต.น้ำชำ, ไอคอน)
│       └── src/
│           ├── app/              # หน้าจอทั้งหมดตามบทบาท (Responsive Phone/Tablet/Desktop)
│           │   ├── (auth)/       # /login, /register
│           │   ├── booking/      # สถานที่ (4 ขั้นตอน + แบบขอใช้สถานที่ราชการ)
│           │   ├── borrow/       # อุปกรณ์ และ /borrow/my (รายการอุปกรณ์ของฉัน)
│           │   ├── repair/       # แจ้งซ่อมบำรุงและติดตามสถานะ
│           │   ├── requests/     # รายละเอียดคำขอและขอเลื่อนวัน/ยกเลิก
│           │   ├── history/      # ประวัติคำขอและการดำเนินการ (แยกตามบทบาทและฟิลเตอร์ครบชุด)
│           │   ├── staff/        # เจ้าหน้าที่ (ตรวจคำขอ, รับมอบ-คืน, Walk-in)
│           │   ├── approver/     # ผู้อนุมัติ L2/L1 (ลงนาม PIN 6 หลัก, ใบอนุญาต PDF)
│           │   └── admin/        # แอดมิน (จัดการทรัพยากร/แบบฟอร์ม, จัดการสิทธิ์)
│           ├── components/       # AppShell, CalendarC4, OfficialGovFormDocument, SignatureBox, PinKeypad
│           └── lib/api.ts        # Client API SDK
├── package.json
└── pnpm-workspace.yaml
```

---

## การเชื่อมต่อฐานข้อมูล (PostgreSQL & Docker)

ระบบใช้งาน PostgreSQL 16 บน Docker โดย Map พอร์ตภายนอกเป็น **`5433`** *(เพื่อไม่ให้ชนกับ PostgreSQL ของเครื่องเดิมที่รันอยู่บนพอร์ต 5432)*

| รายการ | ค่าการเชื่อมต่อ |
| :--- | :--- |
| **Host** | `localhost` |
| **Port** | `5433` |
| **Database** | `jongwen` |
| **Username** | `jongwen` |
| **Password** | `jongwen_dev` |
| **DATABASE_URL** | `postgresql://jongwen:jongwen_dev@localhost:5433/jongwen?schema=public` |

---

## คำสั่งจัดการฐานข้อมูล (Database Commands)

| คำสั่ง | คำอธิบาย |
| :--- | :--- |
| `pnpm db:up` | เริ่มรัน PostgreSQL container ในแบ็กกราวด์ (`docker compose up -d`) |
| `pnpm db:down` | หยุดและปิด container (`docker compose down`) |
| `pnpm db:logs` | ดู Logs แบบ Real-time ของ PostgreSQL |
| `pnpm db:seed` | นำเข้าข้อมูลเริ่มต้น (Mock Data 6 บัญชี, 6 สถานที่, 5 อุปกรณ์, 14 คำขอ) |
| `pnpm db:clear` | ล้างเฉพาะข้อมูลคำขอและประวัติทั้งหมด (เหลือเฉพาะบัญชีผู้ใช้และทรัพยากร) |
| `pnpm db:studio` | เปิด **Prisma Studio** (Web GUI บริหารจัดการข้อมูลผ่าน Browser ที่ `http://localhost:5555`) |
| `pnpm db:psql` | เข้าสู่ Terminal Interactive PSQL ใน container |

---

## วิธีเริ่มต้นใช้งาน (Quick Start)

### 1. ติดตั้งแพ็กเกจ
```powershell
pnpm install
```

### 2. สตาร์ท PostgreSQL บน Docker
เปิดโปรแกรม **Docker Desktop** ให้พร้อมใช้งาน จากนั้นรัน:
```powershell
pnpm db:up
```

### 3. รัน Migration และ Seed ข้อมูล (ถ้าต้องการรีเซ็ตข้อมูลใหม่)
```powershell
pnpm db:seed
```

### 4. รันระบบทั้งหมด
```powershell
pnpm dev
```
- **Web App (Next.js)**: http://localhost:3000
- **API Server (NestJS)**: http://localhost:4000/api
- **Prisma Studio (Optional)**: รัน `pnpm db:studio` เปิดที่ http://localhost:5555

---

## บัญชีทดสอบในระบบ

สามารถคลิกสลับบทบาทได้ทันทีจากแผง **`ข้อมูลบัญชีในระบบ`** ที่หน้า `/login`:

| ชื่อผู้ใช้ (`username`) | ชื่อ-นามสกุล | บทบาท (`role`) | รหัสผ่าน | PIN ลงนาม | หน้าเริ่มต้น |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `somchai` | สมชาย ใจดี | ผู้ใช้งานทั่วไป (`USER`) | `1234` | `123456` | `/` |
| `manee` | มานี มีนา | ผู้ใช้งานทั่วไป (`USER`) | `1234` | `123456` | `/` |
| `suda` | สุดา มีสุข | เจ้าหน้าที่ (`STAFF`) | `1234` | `123456` | `/staff` |
| `wichai` | วิชัย รักถิ่น | ปลัด อบต. · ผู้อนุมัติระดับ 2 (`APPROVER_L2`) | `1234` | `123456` | `/approver` |
| `prasert` | ประเสริฐ ศรีสุข | นายก อบต. · ผู้อนุมัติระดับ 1 (`APPROVER_L1`) | `1234` | `123456` | `/approver` |
| `admin` | ผู้ดูแลระบบ | แอดมิน (`ADMIN`) | `1234` | `123456` | `/admin` |

---

## รายการหน้าจอในระบบ

1. **เข้าสู่ระบบและหน้าแรก**
   - `/login` — เข้าสู่ระบบ LINE Login + บัญชีผู้ใช้ + ยินยอม PDPA + คลิกการ์ดบทบาทเข้าได้ทันที
   - `/register` — ลงทะเบียนผู้ใช้ใหม่ + หน่วยงาน + ยืนยันรหัส OTP 6 หลัก + PDPA
   - `/` — หน้าแรกประชาชน (3 บริการหลัก: สถานที่, แจ้งซ่อม, อุปกรณ์ / คำขอของฉัน / รายการอุปกรณ์ของฉัน / แจ้งเตือนล่าสุด)
2. **สถานที่ (4 ขั้นตอน)**
   - `/booking` — `1/4` เลือกสถานที่ (พร้อมตัวกรอง) → `2/4` เลือกวัน-เวลา (ปฏิทิน C4 + ตรวจจับช่วงเวลาซ้อนทับ) → `3/4` กรอกแบบขอใช้สถานที่ราชการ (อบต.น้ำชำ) → `4/4` แสดงหน้ากระดาษแบบฟอร์มจริงพร้อมลงลายมือชื่อ
3. **อุปกรณ์ (3 ขั้นตอน + รายการอุปกรณ์ของฉัน)**
   - `/borrow` — `1/3` เลือกอุปกรณ์ → `2/3` กรอกแบบคำขอใช้อุปกรณ์ → `3/3` ลงนามและส่ง
   - `/borrow/my` — รายการอุปกรณ์ของฉัน (กำลังใช้งาน, รอตรวจสภาพ, ประวัติ) + ปุ่มแจ้งคืน
4. **แจ้งซ่อม และติดตามคำขอ**
   - `/repair` — แจ้งปัญหา/ซ่อมบำรุง (แนบรูป) + ติดตามแจ้งซ่อม & ตรวจรับงาน
   - `/requests/[id]` — รายละเอียดคำขอและไทม์ไลน์ความคืบหน้า + แสดงแบบฟอร์มราชการเต็มใบ
   - `/requests/[id]/reschedule` — ขอเลื่อนวัน / ยกเลิกคำขอ
5. **ประวัติคำขอและการดำเนินการ**
   - `/history` — หน้ารวมประวัติคำขอ แยกตามประเภทคำขอ (สถานที่, อุปกรณ์, แจ้งซ่อม) และสถานะ (เข้าถึงได้จากเมนูบัญชีมุมขวาบน หรือกด "ดูทั้งหมด" จากแดชบอร์ด)
6. **เจ้าหน้าที่ (`STAFF`)**
   - `/staff` — หน้าหลักเจ้าหน้าที่ (ตัวนับงานรอตรวจ และทางลัดการทำงาน)
   - `/staff/review` — ตรวจและลงนามคำขอ (ระดับ 1) ยืนยันด้วยลายเซ็นและรหัส PIN 6 หลัก เหมือนผู้อนุมัติ L2/L1
   - `/staff/handover` — รับมอบ-คืน (เช็คลิสต์ ก่อนใช้ / หลังใช้ พร้อมระบุหมายเหตุเมื่อตรวจพบรายการผิดปกติ)
   - `/staff/walk-in` — กรอกคำขอแทนผู้มาติดต่อที่เคาน์เตอร์ (รองรับทั้งสถานที่, อุปกรณ์, แจ้งซ่อม และบันทึกร่างได้)
7. **ลงนามเอกสาร 3 ระดับ (`STAFF` → `APPROVER_L2` → `APPROVER_L1`)**
   - `/approver` — หน้าหลักผู้มีอำนาจ (ปลัด / นายก)
   - `/approver/settings` — ตั้งค่าลายเซ็นดิจิทัล + ตั้งรหัส PIN 6 หลัก
   - `/approver/sign/[id]` — แสดงแบบฟอร์มราชการเต็มใบ + ลงนามเอกสาร 3 ระดับ + ยืนยันด้วย PIN 6 หลัก
   - `/approver/permit/[id]` — ลงนามครบ 4 ฝ่าย + แสดงและพิมพ์ใบอนุญาตราชการขนาด 1 หน้า A4 (`window.print()`)
8. **ผู้ดูแลระบบ (`ADMIN`)**
   - `/admin` — หน้าแรกผู้ดูแลระบบ (สถิติรวมและรายการคำขอล่าสุด)
   - `/admin/permissions` — จัดการสิทธิ์และบทบาทผู้ใช้ (เปิด/ปิดสถานะบัญชี, กำหนดสิทธิ์ย่อย, ลำดับสายอนุมัติ)
   - `/admin/resources` — จัดการทรัพยากรและแบบฟอร์มราชการ (เปิด/ปิดให้จองทันที พร้อมพรีวิวแบบฟอร์มเปล่า/ตัวอย่าง)
   - `/admin/resources/new` — เพิ่มรายการสถานที่/อุปกรณ์ (จัดลำดับสายอนุมัติ 3 ระดับได้)

---

## ER Diagram (Mermaid)

```mermaid
erDiagram
    accounts ||--o{ requests : "requester_id"
    accounts ||--o{ requests : "created_by_staff_id"
    accounts ||--o{ signature_records : "signer_id"
    accounts ||--o{ handover_records : "staff_id"
    accounts ||--o{ notifications : "user_id"

    requests ||--o{ request_venues : "request_id"
    requests ||--o{ request_periods : "request_id"
    requests ||--o{ request_items : "request_id"
    requests ||--o{ signature_records : "request_id"
    requests ||--o{ handover_records : "request_id"

    venues ||--o{ request_venues : "venue_id"
    equipments ||--o{ request_items : "equipment_id"

    accounts {
        string id PK
        string username UK
        string password
        string name
        string nickname
        string initial
        string role "USER, STAFF, APPROVER_L2, APPROVER_L1, ADMIN"
        string position
        string department
        string phone
        string line_name
        string line_user_id
        text signature
        string pin
        jsonb permissions
        boolean active
        timestamptz created_at
    }

    venues {
        string id PK
        string name
        string type "meeting, pavilion, field, yard, training"
        string building
        string floor
        int capacity
        string status "available, maintenance"
        boolean enabled
        text_array facilities
        string open_time
        string close_time
        int_array open_days
        int advance_days
        string form_name
        int approval_levels
        timestamptz created_at
    }

    equipments {
        string id PK
        string name
        string category "audio, tent, it"
        int stock
        boolean enabled
        timestamptz created_at
    }

    requests {
        string id PK
        string code UK
        string type "booking, borrow, repair"
        string status "pending_staff, pending_l2, pending_l1, approved, rejected, etc"
        string requester_id FK
        string requester_name
        string organization
        text requester_signature
        string written_at
        string requester_position
        string address_house_no
        string address_moo
        string address_subdistrict
        string address_district
        string address_province
        jsonb purpose_items
        text purpose
        string activity
        int attendees
        text_array attachments
        date pickup_date
        date return_date
        timestamptz return_requested_at
        timestamptz returned_at
        string repair_building
        string repair_floor
        string repair_location
        string repair_category
        text repair_detail
        int repair_photos
        text repair_resolution
        text repair_staff_signature
        string repair_staff_signer_name
        text repair_accept_signature
        timestamptz repair_accepted_at
        timestamptz repair_started_at
        timestamptz repair_finished_at
        timestamptz repair_accepted_by_requester_at
        string created_by_staff_id FK
        text created_by_staff_signature
        text reject_reason
        timestamptz created_at
        timestamptz updated_at
    }

    request_venues {
        string request_id PK,FK
        string venue_id PK,FK
    }

    request_periods {
        serial id PK
        string request_id FK
        string kind "current, reschedule"
        int sort_order
        timestamptz start_time
        timestamptz end_time
    }

    request_items {
        serial id PK
        string request_id FK
        string equipment_id FK
        int qty
    }

    signature_records {
        serial id PK
        string request_id FK
        string level "staff, l2, l1"
        string signer_id FK
        string signer_name
        string title
        string decision "approve, reject"
        text signature
        text note
        timestamptz signed_at
    }

    handover_records {
        serial id PK
        string request_id FK
        string phase "before, after"
        jsonb checklist
        text note
        string staff_id FK
        string staff_name
        text citizen_signature
        text staff_signature
        timestamptz created_at
    }

    notifications {
        string id PK
        string user_id FK
        string title
        string body
        boolean read
        string link
        timestamptz created_at
    }

    activity_logs {
        string id PK
        string kind "user, role, resource, request"
        string title
        string detail
        timestamptz created_at
    }
```
