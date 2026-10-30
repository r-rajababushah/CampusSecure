# SecureCampus — FastAPI Backend with Security Toggle

FastAPI backend with central `SECURITY_MODE` (ON / OFF) toggle for cybersecurity hackathon demonstrations.

## Running Locally

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate      # Windows
pip install -r requirements.txt
python main.py              # Binds strictly to 127.0.0.1:8000
```

## Running Tests
```bash
python -m pytest tests/test_security_toggle.py -v
```

## Seeding / Resetting Database
```bash
python seed.py --reset
```
