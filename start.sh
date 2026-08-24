#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  python3 -m venv venv
  ./venv/bin/pip install -r backend/requirements.txt
fi

./venv/bin/python backend/app.py
