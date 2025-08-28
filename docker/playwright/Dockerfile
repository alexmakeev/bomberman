# Playwright Test Runner with Browsers in Docker
# This keeps browsers containerized and avoids polluting the host OS

FROM mcr.microsoft.com/playwright:v1.55.0-jammy

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY playwright.config.ts ./

# Install npm dependencies
RUN npm ci --legacy-peer-deps

# Copy only the specific test files we need
COPY tests/front-end/ ./tests/front-end/
COPY src/ ./src/

# Set environment variables for Playwright to use system browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Create a script to run tests
RUN echo '#!/bin/bash\n\
echo "🎭 Starting Playwright tests in Docker..."\n\
echo "Available browsers:"\n\
ls -la /ms-playwright/*/\n\
echo ""\n\
echo "Running tests..."\n\
npx playwright test "$@"\n\
echo ""\n\
echo "✅ Tests completed!"\n\
' > /app/run-tests.sh && chmod +x /app/run-tests.sh

# Expose port for web server if needed
EXPOSE 3000

# Default command
CMD ["/app/run-tests.sh"]