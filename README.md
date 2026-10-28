# Jongwen · ระบบขอใช้สถานที่ ขอใช้อุปกรณ์ และแจ้งซ่อม (Monorepo)

ระบบบริหารจัดการคำขอใช้สถานที่ราชการ ขอยืม–คืนครุภัณฑ์ และแจ้งซ่อมบำรุง ผ่านเว็บแอปพลิเคชันระดับ Production-ready พัฒนาด้วยสถาปัตยกรรม Monorepo โดยใช้ **Next.js 15 + NestJS 11 + Tailwind CSS + PostgreSQL (Prisma ORM) + Docker Compose** ตามมาตรฐาน **GovCenter Design Tokens**

---

## สถาปัตยกรรมระบบ (Architecture)

* **Frontend**: Next.js 15 (App Router) + Tailwind CSS + GovCenter Tokens (Responsive Desktop / Tablet / Mobile)
* **Backend API**: NestJS 11 + Express + RESTful API + ValidationPipe (`class-validator`)
* **Database**: PostgreSQL 16 (Alpine) ผ่าน Docker Compose
* **ORM & Migrations**: Prisma ORM v6
* **Shared Package**: `@jongwen/shared` (TypeScript Types, Labels, RBAC Logic, Date Helpers, Period Conflict Checks)
* **Testing & CI/CD**: Vitest (Unit Tests 100% Pass) + GitHub Actions CI Pipeline + Multi-stage Dockerfile

---

## โครงสร้าง Monorepo

```text
BookingV1/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI Pipeline: Lint, Typecheck, Test (Vitest) & Build All
├── docker-compose.yml          # PostgreSQL 16 Service (Port 5433:5432, Healthcheck, Volume)
├── Dockerfile                  # Multi-stage Dockerfile สำหรับ Production Deployment
├── .dockerignore               # กำหนดไฟล์ที่ไม่ต้องส่งเข้า Docker build context
├── LICENSE                     # MIT License
├── vitest.config.mts           # กำหนดค่า Unit Testing สำหรับ Monorepo
├── packages/
│   └── shared/                 # @jongwen/shared — Types, Labels, RBAC Logic, Business Logic
│       └── src/
│           ├── types.ts          # Shared Models, PublicAccount, Enums, Request Types
│           ├── labels.ts         # ข้อความ/ป้ายกำกับภาษาไทยสำหรับบทบาท สถานะ และประเภทคำขอ
│           ├── logic.ts          # RBAC (canAccessRoute), ตรวจจองซ้อน (Conflict Checks), SoD
│           ├── logic.test.ts     # Unit Tests ทดสอบเงื่อนไขทางธุรกิจ
│           └── index.ts
├── apps/
│   ├── api/                    # @jongwen/api — NestJS REST API (:4000/api)
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Prisma Data Model (13 ตาราง รวม sessions, sequences, otp_codes)
│   │   │   ├── migrations/       # SQL Migration Files (Prisma Migrate)
│   │   │   └── seed.ts           # Standalone Seed Script (รองรับ argon2 hash)
│   │   └── src/
│   │       ├── auth/             # Login, Register, Request-OTP, Signature, PIN, Session, argon2
│   │       ├── resources/        # Venues, Equipment, Monthly Availability, Conflict & Stock Check
│   │       ├── requests/         # Booking, Borrow, Repair, 3-Level Sign, Handover, Reschedule
│   │       ├── admin/            # Users & Permissions, Overview, Notifications, Activity Logs
│   │       └── db/               # Prisma Database Service (Persistent DB Sessions & Sequences)
│   └── web/                    # @jongwen/web — Next.js 15 (App Router) + Tailwind CSS (:3000)
│       ├── public/               # Static Assets (โลโก้, ไอคอน, รูปภาพ Avatar)
│       └── src/
│           ├── app/              # หน้าจอทั้งหมดตามบทบาท (Responsive Phone/Tablet/Desktop)
│           │   ├── (auth)/       # /login, /register
│           │   ├── booking/      # สถานที่ (5 ขั้นตอน: เลือกสถานที่, วัน-เวลา, อุปกรณ์เสริม, ฟอร์ม, ลงนาม)
│           │   ├── borrow/       # อุปกรณ์ และ /borrow/my (รายการอุปกรณ์ของฉัน)
│           │   ├── repair/       # แจ้งซ่อมบำรุงและติดตามสถานะ (ไม่ต้องลงนาม)
│           │   ├── requests/     # รายละเอียดคำขอและขอเลื่อนวัน/ยกเลิก
│           │   ├── history/      # ประวัติคำขอและการดำเนินการ (แยกตามบทบาทและฟิลเตอร์ครบชุด)
│           │   ├── staff/        # เจ้าหน้าที่ (ตรวจคำขอ, รับมอบ-คืน, Walk-in)
│           │   ├── approver/     # ผู้อนุมัติ L2/L1 (ลงนาม PIN 6 หลัก, ใบอนุญาต PDF)
│           │   └── admin/        # แอดมิน (จัดการทรัพยากร/แบบฟอร์ม, จัดการสิทธิ์)
│           ├── components/       # AppShell (GovCenter Navbar & Left Sidebar), UI Components
│           └── lib/api.ts        # Client API SDK (มี Timeout และ Error handling)
├── package.json
└── pnpm-workspace.yaml
```

---

## การเชื่อมต่อฐานข้อมูล (PostgreSQL & Docker)

ระบบใช้งาน PostgreSQL 16 บน Docker โดย Map พอร์ตภายนอกเป็น **`5433`** *(เพื่อไม่ให้ชนกับ PostgreSQL เดิมของเครื่องที่รันบนพอร์ต 5432)*

| รายการ | ค่าการเชื่อมต่อ |
| :--- | :--- |
| **Host** | `localhost` |
| **Port** | `5433` |
| **Database** | `jongwen` |
| **Username** | `jongwen` |
| **Password** | `jongwen_dev` |
| **DATABASE_URL** | `postgresql://jongwen:jongwen_dev@localhost:5433/jongwen?schema=public` |

---

## คำสั่งสำหรับพัฒนาและจัดการระบบ (NPM Scripts)

| คำสั่ง | คำอธิบาย |
| :--- | :--- |
| `pnpm dev` | สตาร์ททั้ง Shared, Web (:3000) และ API (:4000) พร้อมกัน |
| `pnpm test` | รัน Unit Tests ด้วย **Vitest** ทั้งหมดใน Monorepo |
| `pnpm typecheck` | ตรวจสอบความถูกต้องของ Type ด้วย TypeScript (`tsc --noEmit`) ทุกแพ็กเกจ |
| `pnpm build` | คอมไพล์และสร้าง Production Bundle ของทั้ง Shared, API และ Web |
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

### 3. รัน Migration และ Seed ข้อมูลเริ่มต้น
```powershell
pnpm db:seed
```

### 4. รันระบบทั้งหมด
```powershell
pnpm dev
```
- **Web App (Next.js)**: http://localhost:3000
- **API Server (NestJS)**: http://localhost:4000/api
- **Prisma Studio**: รัน `pnpm db:studio` เปิดที่ http://localhost:5555

---

## บัญชีทดสอบในระบบ

สามารถคลิกสลับบทบาทได้ทันทีจากแผงเลือกบทบาทที่หน้า `/login`:

| ชื่อผู้ใช้ (`username`) | ชื่อ-นามสกุล | บทบาท (`role`) | รหัสผ่าน | PIN ลงนาม | หน้าเริ่มต้น |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `somchai` | สมชาย ใจดี | ผู้ใช้งานทั่วไป (`USER`) | `1234` | `123456` | `/` |
| `manee` | มานี มีนา | ผู้ใช้งานทั่วไป (`USER`) | `1234` | `123456` | `/` |
| `suda` | สุดา มีสุข | เจ้าหน้าที่ผู้ตรวจสอบ (`STAFF`) | `1234` | `123456` | `/staff` |
| `wichai` | วิชัย รักถิ่น | ผู้พิจารณา (`APPROVER_L2`) | `1234` | `123456` | `/approver` |
| `prasert` | ประเสริฐ ศรีสุข | ผู้มีอำนาจอนุมัติ (`APPROVER_L1`) | `1234` | `123456` | `/approver` |
| `admin` | ผู้ดูแลระบบ | แอดมิน (`ADMIN`) | `1234` | `123456` | `/admin` |

---

## เลย์เอาต์และดีไซน์ (GovCenter Layout & Sidebar)

แอปพลิเคชันได้รับการออกแบบตาม **GovCenter Design Tokens** (`library.govcenter.co`):

1. **แถบส่วนหัวด้านบน (UserNavbar):**
   - แถบสีเขียวเข้มแบบ Gradient (`#175C4C` ถึง `#2B7D66`)
   - ด้านซ้าย: รูป Avatar วงกลม + ข้อความทักทาย `สวัสดี, {ชื่อผู้ใช้}` + บทบาทผู้ใช้
   - ด้านขวา: กระดิ่งแจ้งเตือนพร้อมตัวเลขนับ (Badge สีแดง) + ปุ่มแฮมเบอร์เกอร์ `≡`
2. **แถบเมนูด้านข้าง (UserSidebar Drawer):**
   - สไลด์เปิดออกมาจาก **ฝั่งซ้ายของหน้าจอ** เมื่อกดปุ่ม `≡` หรือกดที่ส่วนหัว
   - **เมนูการใช้งานจริง:**
     - หน้าแรก
     - ขอใช้สถานที่
     - ขอยืมอุปกรณ์
     - แจ้งซ่อม (แจ้งปัญหาได้ทันที ไม่บังคับลงลายมือชื่อ)
     - ประวัติคำขอ
     - *(เมนูเฉพาะตามบทบาท: งานเจ้าหน้าที่ / งานพิจารณาอนุมัติ / การจัดการระบบ)*
   - **ส่วนล่าง:** ข้อมูลส่วนตัว (ป๊อปอัปดูโปรไฟล์และสิทธิ์), ตั้งค่าระบบ (ลายเซ็น/PIN), และปุ่ม `ออกจากระบบ` สีแดง

---

## คุณสมบัติความมั่นคงปลอดภัยและสถาปัตยกรรมองค์กร (Enterprise Features)

1. **Persistent Sessions ในฐานข้อมูล:**
   - ย้ายการเก็บ Session Token จากหน่วยความจำ In-memory มาบันทึกลงตาราง `sessions` ใน PostgreSQL
   - รองรับการรีสตาร์ทเซิร์ฟเวอร์หรือรันแบบ Multi-instance ได้โดยเซสชันไม่หลุด
2. **Atomic Sequence Generator:**
   - ใช้ตาราง `sequences` ในฐานข้อมูลเพื่อออกเลขที่คำขอ (เช่น `REQ-2569-0001`) และไอดีแบบ Atomic ป้องกันเลขซ้ำในการใช้งานพร้อมกัน (Concurrency Safe)
3. **หลักฐานการลงนามแบบไม่สูญหาย (Immutable Signature Audit):**
   - ลายมือชื่อดิจิทัลและบันทึกการลงนาม (`signature_records`) จะถูกบันทึกอย่างถาวร ไม่มีการสั่งลบทิ้ง
   - บันทึกประวัติกิจกรรม (`activity_logs`) เก็บข้อมูลผู้กระทำ (`actorId`, `actorName`, `actorRole`) และหมายเลข `ip` อย่างครบถ้วน
4. **การแบ่งแยกหน้าที่อย่างโปร่งใส (Separation of Duties - SoD):**
   - ผู้ขอใช้บริการไม่สามารถลงนามอนุมัติคำขอของตนเองได้ (Prevent Self-Approval)
   - ผู้อนุมัติคนเดียวกันไม่สามารถลงนามซ้ำข้ามระดับได้ (L2 และ L1 ต้องเป็นคนละท่าน)
   - เจ้าหน้าที่ไม่สามารถรับมอบ-คืนสิ่งของให้ตนเองได้
5. **แจ้งซ่อมบำรุงโดยไม่ต้องลงนาม:**
   - ปรับลดขั้นตอนของคำขอแจ้งซ่อม (`repair`) ให้ผู้แจ้งสามารถส่งเรื่องได้ทันทีโดยไม่ต้องลงลายมือชื่อดิจิทัล เพื่อความสะดวกรวดเร็ว
6. **การเข้ารหัสระดับสูงด้วย Argon2id:**
   - ทั้งรหัสผ่านบัญชีและรหัส PIN 6 หลัก ได้รับการแฮชด้วยอัลกอริทึม **`argon2id`**
7. **Input Validation:**
   - ฝั่ง NestJS API ใช้งาน `ValidationPipe` พร้อม `class-validator` และ `class-transformer` ป้องกัน Injection และรับส่งเฉพาะฟิลด์ที่กำหนด (Whitelist)

---

## ER Diagram (Mermaid)

```mermaid
erDiagram
    accounts ||--o{ requests : "requester_id"
    accounts ||--o{ requests : "created_by_staff_id"
    accounts ||--o{ signature_records : "signer_id"
    accounts ||--o{ handover_records : "staff_id"
    accounts ||--o{ notifications : "user_id"
    accounts ||--o{ sessions : "account_id"
    accounts ||--o{ activity_logs : "actor_id"

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
        string password "argon2id"
        string name
        string nickname
        string initial
        string role "USER, STAFF, APPROVER_L2, APPROVER_L1, ADMIN"
        string position
        string department
        string phone
        string line_name
        text signature
        string pin "argon2id"
        jsonb permissions
        boolean active
        timestamptz created_at
    }

    sessions {
        string token PK
        string account_id FK
        timestamptz expires_at
        timestamptz created_at
    }

    sequences {
        string key PK
        int value
        timestamptz updated_at
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
        jsonb purpose_items
        text purpose
        string activity
        int attendees
        date pickup_date
        date return_date
        text repair_detail
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
        string actor_id FK
        string actor_name
        string actor_role
        string ip
        timestamptz created_at
    }

    otp_codes {
        string id PK
        string phone
        string code_hash "argon2id"
        int attempts
        timestamptz expires_at
        timestamptz consumed_at
        timestamptz created_at
    }
```
