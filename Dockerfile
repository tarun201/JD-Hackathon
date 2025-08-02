FROM node:18-slim

# Install ffmpeg, python3, opencv early and cache the result
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-opencv \
    python3-pip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN npm install -g nodemon

COPY . .

# Install ffmpeg
#RUN apt-get update && apt-get install -y ffmpeg python3 python3-opencv && apt-get clean



EXPOSE 3030

CMD ["nodemon", "index.js"]