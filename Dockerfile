# Use the official Node.js 14 image as the base image
FROM node

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./
RUN npm install
#Copy all
COPY . .

# Expose port 8080
EXPOSE 8080

# Start the server
CMD [ "node", "server.js" ]
