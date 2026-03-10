# Database migrations

Semua koneksi database memakai **PostgreSQL** dan dibaca dari **.env** (PG_* atau DB_*). Nama database **tidak di-hardcode**; wajib set `DB_DATABASE` atau `PG_DATABASE` di Backend/.env.

## Folder sharing (shares_add_folder)

Agar **folder bisa di-share**, tabel `shares` harus punya kolom `folder_id`. Pilih salah satu:

**Opsi A – lewat Node (pakai DB dari .env):**
```bash
cd Backend
node src/scripts/runSharesFolderMigration.js
```

**Opsi B – lewat psql (nama database harus sama dengan DB_DATABASE di .env):**
```bash
cd Backend/database
# Ganti godrive dengan nilai DB_DATABASE/PG_DATABASE di .env Anda
psql -U postgres -d gdrive -f shares_add_folder.sql
```

Setelah migration dijalankan, fitur Share untuk folder akan berfungsi.

## Share collaborators (share_collaborators)

Agar daftar "siapa yang punya akses" (collaborator) bisa disimpan dan ditampilkan, jalankan migration `share_collaborators.sql` setelah `shares_add_folder`:

```bash
cd Backend
node src/scripts/runShareCollaboratorsMigration.js
```

Atau dengan psql (ganti nama DB sesuai .env):

```bash
cd Backend/database
psql -U postgres -d gdrive -f share_collaborators.sql
```

## Role (admin / user)

Run all migrations (`node src/scripts/runAllMigrations.js`) to add the `role` column. Then set an admin user:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin@example.com';
```

## Payments (QRIS / manual verification)

Untuk fitur pembayaran QRIS dan verifikasi manual, buat tabel `payments`.

**Opsi A – lewat Node (pakai koneksi dari .env, tidak perlu psql):**
```bash
cd Backend
npm run db:payments
```

**Opsi B – lewat psql (nama database harus sama dengan DB_DATABASE di .env):**
```bash
cd Backend/database
# Ganti gdrive dengan nilai DB_DATABASE di .env Anda
psql -U postgres -d gdrive -f add_payments_table.sql
```
