FROM node:24-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    ffmpeg \
    fonts-noto-cjk \
    python3 \
    python3-pip \
    python3-venv \
    tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock ./
RUN corepack enable \
  && yarn install --frozen-lockfile --ignore-scripts

COPY . .

RUN yarn run postinstall \
  && python3 -m venv /opt/course-venv \
  && /opt/course-venv/bin/pip install --no-cache-dir \
    boto3 \
    python-docx \
    python-pptx \
    pypdf

RUN chmod +x \
  /app/deploy/course-worker/entrypoint.sh

ENV NODE_ENV=production \
    COURSE_CHROME_PATH=/usr/bin/chromium \
    COURSE_PYTHON=/opt/course-venv/bin/python \
    COURSE_WORKER_SCRATCH_DIR=/data/scratch \
    COURSE_BROWSER_PROFILE_DIR=/data/browser-profile \
    COURSE_HEADLESS=1 \
    COURSE_PROXY_MODE=off \
    COURSE_MEDIA_ROUTE=inherit

VOLUME ["/data"]

ENTRYPOINT ["/usr/bin/tini", "--", "/app/deploy/course-worker/entrypoint.sh"]

CMD ["cycle"]
