# ---------- Build Stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---------- Run Stage ----------
FROM node:20-alpine
WORKDIR /app

# Install a lightweight static server
RUN npm install -g serve

# Copy build artifacts
COPY --from=build /app/dist ./dist

# Expose the port (choose any, here 3000)
EXPOSE 3000

# Run "serve" to host the build output
CMD ["serve", "-s", "dist", "-l", "3000"]
