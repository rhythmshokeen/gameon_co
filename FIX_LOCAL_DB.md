# Fix Local Database Connection

## The Problem

Your local development is trying to connect to PostgreSQL at `localhost:5432`, but the database isn't running.

---

## ✅ Solution: Start Your Local Database

You have a `docker-compose.yml` file configured with PostgreSQL. Here's how to start it:

### Step 1: Start Docker Desktop

1. Open **Docker Desktop** application on your Mac
2. Wait for it to fully start (whale icon in menu bar should be steady)

### Step 2: Start PostgreSQL

```bash
# In your project directory
docker-compose up -d
```

This will:

- Download PostgreSQL image (if needed)
- Start PostgreSQL on port 5432
- Create the `gameon` database

### Step 3: Run Migrations

```bash
npx prisma migrate dev
```

### Step 4: Restart Your Dev Server

The dev server should now connect successfully.

---

## Alternative: Use Cloud Database for Local Development

If you don't want to run Docker locally, you can use a cloud database:

### Update `.env.local`:

```bash
# Replace with your cloud database URL
DATABASE_URL="postgresql://user:password@your-cloud-db-host/dbname?sslmode=require"
```

**Free cloud database options:**

- **Supabase**: [supabase.com](https://supabase.com) - Great free tier
- **Neon**: [neon.tech](https://neon.tech) - Generous free tier
- **Vercel Postgres**: If you already set it up for production

---

## Quick Start Commands

```bash
# Check if Docker is running
docker ps

# Start PostgreSQL
docker-compose up -d

# Check database is running
docker ps

# View database logs
docker logs gameon_postgres

# Stop database (when done)
docker-compose down

# Stop and remove data (fresh start)
docker-compose down -v
```

---

## Which Option Should You Use?

**Use Docker (Recommended for local dev):**

- ✅ Complete local control
- ✅ Fast database access
- ✅ No internet required
- ✅ Free
- ❌ Requires Docker Desktop running

**Use Cloud Database:**

- ✅ No Docker needed
- ✅ Same database for all devices
- ✅ Always accessible
- ❌ Requires internet
- ❌ Free tier limits

---

## Your Docker Compose Configuration

Your `docker-compose.yml` is already configured with:

- **User**: postgres
- **Password**: password
- **Database**: gameon
- **Port**: 5432

This matches your `.env.local` file perfectly!
