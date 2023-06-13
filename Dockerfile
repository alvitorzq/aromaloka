# Use the official Node.js 14 image as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the server.js file to the container
COPY server.js ./

# Copy the service account file to the container
COPY first-inquiry-381608-firebase-adminsdk-tinai-bfc6566bcb.json ./

# Expose port 8080
EXPOSE 8080

# Start the server
CMD [ "node", "server.js" ]
