# KYC Pipeline

A production-grade Know Your Customer (KYC) onboarding pipeline built with Django (DRF) and React (Vite). Designed with a strict state machine, role-based access control, secure file validations, and a modern, high-contrast SaaS aesthetic.

## Playto KYC Pipeline

This repository fulfills the strict requirements for the Playto KYC Assessment. It includes full role isolations, dynamic SLA calculation on the reviewer dashboard, and centralized state-machine transitions handling side-effects securely.

### Setup Steps:-

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python seed.py
python manage.py runserver 0.0.0.0:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Test Credentials

**Reviewer:**
- username: reviewer_1
- password: password

**Merchant:**
- username: merchant_1
- password: password


