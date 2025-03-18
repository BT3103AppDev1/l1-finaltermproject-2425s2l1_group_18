# Finbonacci

# Installation Steps
# Clone the repository
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_PROJECT_REPO.git

cd YOUR_PROJECT_REPO

# Install frontend dependencies
npm install

# Donwnload of Google Cloud SDK
Download the installer from the Google Cloud SDK download page. (https://cloud.google.com/sdk/docs/install)

Run the installer and follow the instructions.

Ensure that Google Cloud SDK is correctly added to your Path. Reopen your Terminal

# Check Google Cloud SDK Version
gcloud --version

# Run this to authenticate
gcloud auth application-default login

# Install backend depencies
cd backend

npm install

# Start the backend for Mac
node server.js &

# Start the backend for Windows
Start-Job -ScriptBlock { cd "C:\Users\User\..\YOUR_PROJECT_REPO"; node server.js }

# Check if server.js running in background (Windows)
Get-Job

# Start the frontend
cd .. (to get back to main project directory)

npm run dev

 

