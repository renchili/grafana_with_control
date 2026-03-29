# syntax=docker/dockerfile:1

FROM golang:1.24-bookworm AS builder
WORKDIR /src

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/platform-api ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
ENV PORT=8081
EXPOSE 8081
COPY --from=builder /out/platform-api /platform-api
USER nonroot:nonroot
ENTRYPOINT ["/platform-api"]
