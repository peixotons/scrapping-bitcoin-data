# 🚀 Bitcoin Market Intelligence API - Endpoints

## 📚 **API Endpoints Consolidados**

Seguindo princípios **KISS**, **YAGNI** e **DRY**, todos os endpoints estão consolidados em um único controller.

### **Base URL**
```
http://localhost/api/v1/bitcoin
```

---

## 🔍 **Endpoints Disponíveis**

### **1. Health Check**
```http
GET /api/v1/bitcoin/health
```

**Descrição:** Verifica status da API e lista endpoints disponíveis  
**Tempo:** ~5ms  
**Uso:** Monitoramento e descoberta de endpoints

**Resposta:**
```json
{
  "status": "OK",
  "timestamp": "2025-06-30T22:00:00.000Z",
  "service": "Bitcoin Market Intelligence API",
  "version": "2.0.0",
  "features": ["Real-time analysis", "DynamoDB persistence", "Historical data"],
  "endpoints": {
    "analysis": "/api/v1/bitcoin/analysis",
    "latest": "/api/v1/bitcoin/latest",
    "history": "/api/v1/bitcoin/history?limit=10",
    "stats": "/api/v1/bitcoin/stats",
    "byId": "/api/v1/bitcoin/data/:id"
  }
}
```

---

### **2. Real-time Analysis** ⚡ **Processamento**
```http
GET /api/v1/bitcoin/analysis
```

**Descrição:** Executa análise completa em tempo real (Puppeteer + DynamoDB)  
**Tempo:** ~60-120s  
**Uso:** Obter dados frescos e análise completa

**Funcionalidades:**
- 🔄 Scraping do Yahoo Finance via Puppeteer
- 📊 Cálculo Mayer Multiple (200-day MA)
- 😨 Integração Fear & Greed Index
- 💾 Salvamento automático no DynamoDB
- 📈 Análise e recomendações

**Resposta:**
```json
{
  "success": true,
  "meta": {
    "totalRecords": 1500,
    "dataRange": "Jan 1, 2020 to Jun 30, 2025",
    "lastUpdate": "2025-06-30T22:00:00.000Z"
  },
  "data": [
    {
      "date": "Jun 30, 2025",
      "open": "65000.00",
      "close": "67500.00",
      "movingAverage200": 45000.50,
      "mayerMultiple": 1.5,
      "fearGreedValue": 75,
      "fearGreedClassification": "Greed"
    }
  ],
  "currentAnalysis": {
    "price": 67500,
    "mayerMultiple": 1.5,
    "mayerStatus": "Neutral",
    "fearGreedValue": 75,
    "fearGreedStatus": "🤑 Greed",
    "recommendation": "Caution: Unfavorable indicator",
    "confidenceLevel": "Medium"
  }
}
```

---

### **3. Latest Data** ⚡ **Ultra-rápido**
```http
GET /api/v1/bitcoin/latest
```

**Descrição:** Busca dados mais recentes do DynamoDB  
**Tempo:** ~50ms  
**Uso:** Consultas rápidas sem processamento

**Resposta:**
```json
{
  "success": true,
  "source": "database",
  "retrievedAt": "2025-06-30T22:00:00.000Z",
  "responseTimeMs": 45,
  "data": [/* array com dados Bitcoin */],
  "metadata": {
    "recordsCount": 1500,
    "generatedAt": "2025-06-30T21:45:00.000Z",
    "dataRange": "Jan 1, 2020 to Jun 30, 2025",
    "processingTimeMs": 65000
  },
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "savedAt": "2025-06-30T21:45:00.000Z"
}
```

---

### **4. Historical Data**
```http
GET /api/v1/bitcoin/history?limit=10
```

**Descrição:** Lista histórico de processamentos salvos  
**Tempo:** ~100ms  
**Parâmetros:**
- `limit` (opcional): Número de registros (1-100, padrão: 10)

**Resposta:**
```json
{
  "success": true,
  "source": "database",
  "retrievedAt": "2025-06-30T22:00:00.000Z",
  "responseTimeMs": 95,
  "totalRecords": 5,
  "records": [
    {
      "id": "abc123-def456",
      "savedAt": "2025-06-30T21:45:00.000Z",
      "recordsCount": 1500,
      "dataRange": "Jan 1, 2020 to Jun 30, 2025",
      "processingTimeMs": 65000
    }
  ]
}
```

---

### **5. Database Statistics**
```http
GET /api/v1/bitcoin/stats
```

**Descrição:** Estatísticas dos dados armazenados  
**Tempo:** ~200ms  
**Uso:** Monitoramento e insights do banco

**Resposta:**
```json
{
  "success": true,
  "source": "database",
  "retrievedAt": "2025-06-30T22:00:00.000Z",
  "responseTimeMs": 180,
  "statistics": {
    "totalRecords": 10,
    "oldestRecord": {
      "id": "oldest-id",
      "generatedAt": "2025-06-25T10:00:00.000Z",
      "recordsCount": 1450
    },
    "newestRecord": {
      "id": "newest-id", 
      "generatedAt": "2025-06-30T21:45:00.000Z",
      "recordsCount": 1500
    },
    "averageRecordsCount": 1475
  }
}
```

---

### **6. Data by ID**
```http
GET /api/v1/bitcoin/data/{id}
```

**Descrição:** Busca dados específicos por ID  
**Tempo:** ~30ms  
**Uso:** Recuperar processamento específico

**Exemplo:**
```http
GET /api/v1/bitcoin/data/123e4567-e89b-12d3-a456-426614174000
```

**Resposta:**
```json
{
  "success": true,
  "source": "database",
  "retrievedAt": "2025-06-30T22:00:00.000Z",
  "responseTimeMs": 25,
  "data": [/* dados específicos */],
  "metadata": {/* metadados */},
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "savedAt": "2025-06-30T21:45:00.000Z"
}
```

---

## 🎯 **Fluxo de Uso Recomendado**

### **Para Novos Dados:**
1. `GET /health` - Verificar status
2. `GET /analysis` - Processar dados frescos (~60s)
3. `GET /latest` - Consultas rápidas subsequentes (~50ms)

### **Para Consultas Rápidas:**
1. `GET /latest` - Dados mais recentes
2. `GET /history` - Ver histórico de processamentos
3. `GET /stats` - Estatísticas do banco

### **Para Debugging:**
1. `GET /history` - Listar processamentos
2. `GET /data/{id}` - Investigar processamento específico

---

## ⚡ **Performance Guidelines**

| Endpoint | Tempo Típico | Uso Recomendado |
|----------|--------------|-----------------|
| `/health` | ~5ms | Sempre |
| `/latest` | ~50ms | Consultas frequentes |
| `/history` | ~100ms | Análise histórica |
| `/stats` | ~200ms | Monitoramento |
| `/data/{id}` | ~30ms | Debugging |
| `/analysis` | ~60-120s | Dados frescos apenas |

---

## 🚫 **Endpoints Removidos (YAGNI)**

Seguindo boas práticas, **removemos** o controller redundante `bitcoin-data` e consolidamos tudo em `/api/v1/bitcoin/*`.

**Antes (Redundante):**
- ~~`/api/v1/bitcoin-data/latest`~~ 
- ~~`/api/v1/bitcoin-data/history`~~
- ~~`/api/v1/bitcoin-data/stats`~~

**Agora (Consolidado):**
- ✅ `/api/v1/bitcoin/latest`
- ✅ `/api/v1/bitcoin/history` 
- ✅ `/api/v1/bitcoin/stats`

---

## 🧪 **Comandos de Teste**

```bash
# Health check
curl http://localhost/api/v1/bitcoin/health

# Dados frescos (lento)
curl http://localhost/api/v1/bitcoin/analysis

# Consulta rápida
curl http://localhost/api/v1/bitcoin/latest

# Histórico
curl http://localhost/api/v1/bitcoin/history?limit=5

# Estatísticas  
curl http://localhost/api/v1/bitcoin/stats

# Por ID (substitua pelo ID real)
curl http://localhost/api/v1/bitcoin/data/123e4567-e89b-12d3-a456-426614174000
```

---

## 🎨 **Boas Práticas Aplicadas**

- ✅ **KISS:** Um controller apenas, simples e direto
- ✅ **YAGNI:** Removeu controller desnecessário  
- ✅ **DRY:** Reutilização de código e estruturas
- ✅ **Clean Code:** Logs padronizados e métodos auxiliares
- ✅ **RESTful:** URLs semânticas e status codes apropriados
- ✅ **Performance:** Rotas organizadas para evitar conflitos

**Resultado:** API mais limpa, fácil de usar e manter! 🚀 