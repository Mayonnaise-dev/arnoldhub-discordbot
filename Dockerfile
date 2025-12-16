FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Run as non-root user for security
USER node

# Start the application
CMD [ "npm", "start" ]