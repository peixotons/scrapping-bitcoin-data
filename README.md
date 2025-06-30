# 🚀 Bitcoin Market Intelligence API

API completa para análise de mercado do Bitcoin combinando **Mayer Multiple** (média móvel de 200 dias) e **Fear & Greed Index** para inteligência de trading.

## 🎯 Features

- 📊 **Scraping Yahoo Finance** - Dados históricos do Bitcoin via Puppeteer
- 📈 **Mayer Multiple** - Indicador de média móvel de 200 dias
- 😰 **Fear & Greed Index** - Sentimento do mercado (Alternative.me API)
- 🔥 **Análise Combinada** - Recomendações inteligentes de compra/venda
- 🐳 **Deploy Docker** - Container otimizado para produção
- 🌐 **Nginx Proxy** - Rate limiting e performance

## 🚀 Quick Start

### Desenvolvimento Local
```bash
# Clonar repositório
git clone <seu-repo>
cd scrapping-bitcoin-data

# Desenvolvimento com Docker
docker-compose -f docker-compose.dev.yml up --build

# Ou desenvolvimento tradicional
npm install
npm run start:dev
```

### Deploy Produção (EC2)
```bash
# No EC2 com Docker instalado
git clone <seu-repo>
cd scrapping-bitcoin-data
mkdir -p logs nginx/logs

# Build e start
docker-compose up -d --build

# Verificar
curl http://localhost/health
curl http://localhost/bitcoin/analysis
```

## 📚 API Endpoints

### Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Bitcoin Analysis
```http
GET /bitcoin/analysis
```
**Response:**
```json
{
  "data": [
    {
      "date": "Jan 15, 2024",
      "open": "42000.00",
      "close": "43500.00", 
      "movingAverage200": 38500.50,
      "mayerMultiple": 1.13,
      "fearGreedValue": 65,
      "fearGreedClassification": "Greed"
    }
  ],
  "summary": {
    "totalRecords": 1500,
    "averageMayer": 1.05,
    "currentSentiment": "Neutral",
    "recommendation": "HOLD - Mayer próximo da média, sentimento neutro"
  }
}
```

## 🐳 Estrutura Docker

```
📦 Bitcoin API
├── 🔧 Dockerfile (Multi-stage build)
├── 🐳 docker-compose.yml (Produção)  
├── ⚡ docker-compose.dev.yml (Desenvolvimento)
├── 🌐 nginx/ (Reverse proxy + Rate limiting)
└── 📊 logs/ (Logs persistentes)
```

## 📋 Deploy EC2

1. **Setup inicial**: `DOCKER-DEPLOY.md`
2. **3 comandos**: `git clone` → `docker-compose up -d` → `curl /health`
3. **Zero config**: Chrome, Node.js, Nginx já inclusos

## 🎯 Tecnologias

- **Backend**: NestJS + TypeScript
- **Scraping**: Puppeteer + Chrome Headless  
- **Data**: Yahoo Finance + Alternative.me API
- **Container**: Docker + Docker Compose
- **Proxy**: Nginx + Rate Limiting
- **Cloud**: AWS EC2 t2.micro ready

---

**Deploy completo**: Veja `DOCKER-DEPLOY.md` 🚀
