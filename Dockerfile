FROM node:18

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN npm run build

# Expose the port the app runs on
EXPOSE 4000

# Define environment variables
ENV DATABASE_URL="postgresql://chat_owner:1lxUKaVHEX7C@ep-fragrant-hill-a2xfx1tk.eu-central-1.aws.neon.tech/chat?sslmode=require"
ENV DB_HOST="ep-fragrant-hill-a2xfx1tk.eu-central-1.aws.neon.tech"
ENV DB_USER="chat_owner"
ENV DB_PASSWORD="1lxUKaVHEX7C"
ENV DB_NAME="chat"

# Run the application
CMD ["yarn", "run", "start"]