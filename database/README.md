# SOR SENTINEL — Oracle Database Architecture & Setup

## Overview
SOR SENTINEL requires Oracle Database (19c, 21c, 23ai, Express Edition, or Oracle Autonomous Database). The backend interfaces via `python-oracledb` in Thin mode (no Oracle Client / Instant Client libraries required) and SQLAlchemy 2.0 ORM.

## Schema Architecture

```
USERS
  ├── id (PK, IDENTITY)
  ├── email (UNIQUE, INDEX)
  ├── password_hash (bcrypt)
  ├── role ('user' | 'admin')
  └── is_active (1 | 0)

ANALYSES
  ├── id (PK, IDENTITY)
  ├── user_id (FK -> USERS.id)
  ├── analysis_type ('text' | 'url')
  ├── status ('pending' | 'processing' | 'completed' | 'failed')
  ├── credibility_score (0-100)
  ├── sensitivity_level ('low' | 'medium' | 'high' | 'critical')
  └── overall_assessment

ANALYSIS_FINDINGS
  ├── id (PK, IDENTITY)
  ├── analysis_id (FK -> ANALYSES.id ON DELETE CASCADE)
  ├── finding_type ('credibility_concern' | 'misleading_indicator' | 'sensitive_content' | 'recommendation')
  ├── severity ('low' | 'medium' | 'high')
  └── confidence ('low' | 'medium' | 'high')

SOURCE_REFERENCES
  ├── id (PK, IDENTITY)
  ├── analysis_id (FK -> ANALYSES.id ON DELETE CASCADE)
  ├── title, url, description, relevance

CONTACT_MESSAGES
  ├── id (PK, IDENTITY)
  ├── name, email, subject, message
  └── status ('unread' | 'read' | 'replied')

AUDIT_LOGS
  ├── id (PK, IDENTITY)
  ├── user_id (FK -> USERS.id ON DELETE SET NULL)
  ├── action, resource_type, resource_id, details, ip_address
```

## Quick Local Setup via Docker (Oracle XE)

```bash
# Pull and start Oracle Database Free / XE
docker run -d --name oracle-sor -p 1521:1521 -e ORACLE_PASSWORD=MySecurePassword123 gvenzl/oracle-free

# Connect as SYSTEM to create the application user
sqlplus SYSTEM/MySecurePassword123@localhost:1521/FREEPDB1

-- In SQL*Plus:
CREATE USER sor_sentinel IDENTIFIED BY SorSecurePass123;
GRANT CONNECT, RESOURCE, UNLIMITED TABLESPACE TO sor_sentinel;
GRANT CREATE TABLE, CREATE VIEW, CREATE SEQUENCE TO sor_sentinel;
EXIT;
```

## Initializing Schema & Admin User

```bash
# 1. Update .env with your credentials:
# ORACLE_USER=sor_sentinel
# ORACLE_PASSWORD=SorSecurePass123
# ORACLE_DSN=localhost:1521/FREEPDB1

# 2. Verify connectivity:
python database/verify_connection.py

# 3. Create tables and provision initial admin:
python database/init_db.py --admin-email admin@sorsentinel.local --admin-password "AdminPass123"
```
