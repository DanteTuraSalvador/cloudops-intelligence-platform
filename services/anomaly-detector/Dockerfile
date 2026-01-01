# ============================================================================
# CloudOps Anomaly Detector - .NET 8 Service
# Multi-stage Docker build for production
# ============================================================================

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder

WORKDIR /src

# Copy csproj and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy source code
COPY . .

# Build and publish
RUN dotnet publish -c Release -o /app --no-restore

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runner

WORKDIR /app

# Add non-root user for security
RUN addgroup --system --gid 1001 dotnet && \
    adduser --system --uid 1001 appuser

# Copy published files
COPY --from=builder /app .

# Change ownership
RUN chown -R appuser:dotnet /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

# Start the application
ENTRYPOINT ["dotnet", "AnomalyDetector.dll"]
