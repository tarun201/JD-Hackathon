FROM node:18-slim

# Install ffmpeg, python3, opencv early and cache the result

WORKDIR /app

COPY package*.json ./
RUN npm install


COPY . .

# Install ffmpeg
#RUN apt-get update && apt-get install -y ffmpeg python3 python3-opencv && apt-get clean



EXPOSE 3032

CMD ["node", "consumers.js"]