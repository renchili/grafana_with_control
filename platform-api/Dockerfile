# syntax=docker/dockerfile:1

FROM golang:1.24-bookworm AS builder
WORKDIR /src

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/platform-api ./cmd/server

FROM debian:bookworm-slim
WORKDIR /app

ENV PORT=8081
EXPOSE 8081

COPY --from=builder /out/platform-api /app/platform-api

RUN useradd -r -u 10001 appuser
USER appuser

ENTRYPOINT ["/app/platform-api"]
