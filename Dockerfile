FROM python:3.9-slim

# Prevent interactive prompts (Fixes Exit Code 100)
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install all system-level dependencies for OpenCV, MediaPipe, and PyAutoGUI
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libxtst6 \
    libx11-6 \
    python3-tk \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade build tools to prevent MediaPipe installation failures
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Required for PyAutoGUI/OpenCV to find your host screen
ENV DISPLAY=:0

CMD ["python", "Gesture_Controller.py"]
