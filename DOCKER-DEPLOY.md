# 🐳 Deploy Docker no EC2 - Bitcoin Market Intelligence API

## 📋 Pré-requisitos

- **EC2 t2.micro** com Ubuntu 24.04
- Acesso SSH configurado
- Security Group com portas **22** e **80** abertas

## 🔧 **PASSO 1: Setup Inicial do EC2**

### 1.1 Conectar na instância
```bash
ssh -i sua-chave.pem ubuntu@seu-ip-ec2
```

### 1.2 Instalar Docker e Docker Compose
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker ubuntu

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Configurar firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw --force enable

# Reiniciar para aplicar permissões
sudo reboot
```

### 1.3 Reconectar e verificar instalações
```bash
ssh -i sua-chave.pem ubuntu@seu-ip-ec2

docker --version          # deve mostrar Docker 20+
docker-compose --version  # deve mostrar Docker Compose 2+
```

## 🚀 **PASSO 2: Deploy da Aplicação**

### 2.1 Clonar repositório
```bash
git clone https://github.com/seu-usuario/scrapping-bitcoin-data.git
cd scrapping-bitcoin-data
```

### 2.2 Criar diretórios necessários
```bash
mkdir -p logs nginx/logs
```

### 2.3 Build e start dos containers
```bash
# Build da imagem
docker-compose build

# Iniciar em background
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f
```

## 🌐 **PASSO 3: Verificar Deploy**

### 3.1 Verificar status dos containers
```bash
docker-compose ps
docker-compose logs bitcoin-api
docker-compose logs nginx
```

### 3.2 Testar API
```bash
# Health check
curl http://localhost/health

# Teste do IP público
curl http://seu-ip-ec2/health

# Endpoint principal (pode demorar 30-60s na primeira execução)
curl http://seu-ip-ec2/bitcoin/analysis
```

## 📊 **Comandos Úteis**

### Docker Compose Management
```bash
docker-compose ps              # Status dos containers
docker-compose logs -f         # Ver logs em tempo real
docker-compose logs bitcoin-api # Logs específicos da API
docker-compose restart         # Reiniciar todos os serviços
docker-compose stop            # Parar todos os serviços
docker-compose down            # Parar e remover containers
docker-compose up -d           # Iniciar em background
```

### Deploy Updates
```bash
# Pull latest changes
git pull origin master

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d

# Or one-liner
git pull && docker-compose build --no-cache && docker-compose up -d
```

### Monitoramento
```bash
# Ver uso de recursos
docker stats

# Inspecionar container
docker inspect bitcoin-api

# Entrar no container (debug)
docker exec -it bitcoin-api sh
```

## 🔍 **Troubleshooting**

### Problema: Container não inicia
```bash
# Ver logs detalhados
docker-compose logs bitcoin-api

# Verificar build
docker-compose build --no-cache bitcoin-api

# Testar container isoladamente
docker run --rm -it bitcoin-api sh
```

### Problema: Chrome/Puppeteer com erro
```bash
# Verificar se Chrome está no container
docker exec -it bitcoin-api google-chrome --version

# Ver logs específicos do Puppeteer
docker-compose logs bitcoin-api | grep -i puppeteer
```

### Problema: Nginx não funciona
```bash
# Testar configuração do Nginx
docker exec -it bitcoin-nginx nginx -t

# Ver logs do Nginx
docker-compose logs nginx

# Restart apenas do Nginx
docker-compose restart nginx
```

### Problema: Memória insuficiente (t2.micro)
```bash
# Verificar uso de memória
free -h
docker stats

# Configurar swap se necessário
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Problema: Porta ocupada
```bash
# Ver processos nas portas
sudo lsof -i :80
sudo lsof -i :3000

# Parar containers e remover
docker-compose down
docker system prune -f
```

## 🎯 **Configurações de Produção**

### Resource Limits
O `docker-compose.yml` já está configurado com:
- **Limite de memória**: 400MB (perfeito para t2.micro)
- **CPU limit**: 0.5 CPU cores
- **Health checks** configurados
- **Restart policy**: unless-stopped

### Logs
```bash
# Ver todos os logs
docker-compose logs

# Logs com timestamp
docker-compose logs -t

# Seguir logs específicos
docker-compose logs -f bitcoin-api

# Limpar logs antigos
docker system prune -f --volumes
```

### Backup e Restore
```bash
# Backup da aplicação
tar -czf bitcoin-api-backup.tar.gz scrapping-bitcoin-data/

# Backup dos dados do Docker
docker-compose down
sudo tar -czf docker-volumes-backup.tar.gz /var/lib/docker/volumes/
docker-compose up -d
```

## 🔒 **Segurança**

### Firewall
```bash
# Verificar status
sudo ufw status

# Configuração recomendada
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw deny 3000     # Bloquear acesso direto ao Node.js
```

### SSL (Opcional com Certbot)
```bash
# Instalar certbot
sudo apt install certbot

# Parar nginx temporariamente
docker-compose stop nginx

# Obter certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Configurar SSL no nginx (editar nginx/sites-available/bitcoin-api.conf)
# Restart nginx
docker-compose restart nginx
```

## 📈 **Monitoramento**

### Performance
```bash
# CPU e Memória em tempo real
docker stats

# Logs de performance
docker-compose logs bitcoin-api | grep -E "(🚀|📊|⚡)"

# Sistema geral
htop
```

### Health Checks
```bash
# Status de saúde dos containers
docker-compose ps

# Testar endpoints
curl -i http://localhost/health
curl -i http://localhost/nginx-status  # (só localhost)
```

## 🔄 **Deploy Automático com GitHub Actions**

Adicione no `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [ master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to EC2
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.EC2_HOST }}
        username: ubuntu
        key: ${{ secrets.EC2_SSH_KEY }}
        script: |
          cd ~/scrapping-bitcoin-data
          git pull origin master
          docker-compose build --no-cache
          docker-compose up -d
```

## ✅ **Checklist Final**

- [ ] Docker e Docker Compose instalados
- [ ] Repositório clonado no EC2
- [ ] Containers buildados com sucesso
- [ ] API respondendo em `/health`
- [ ] Nginx funcionando como proxy
- [ ] Endpoint `/bitcoin/analysis` funcionando
- [ ] Logs sendo gerados corretamente
- [ ] Health checks passando
- [ ] Firewall configurado
- [ ] Resource limits aplicados

---

## 🆘 **Suporte Rápido**

### Status Check Rápido:
```bash
docker-compose ps && curl -s http://localhost/health
```

### Restart Completo:
```bash
docker-compose down && docker-compose up -d && docker-compose logs -f
```

### Debug Mode:
```bash
docker-compose logs bitcoin-api | tail -50
docker exec -it bitcoin-api sh
```

**🌐 API Endpoints:**
- Health Check: `http://seu-ip-ec2/health`
- Bitcoin Analysis: `http://seu-ip-ec2/bitcoin/analysis`
- Nginx Status: `http://localhost/nginx-status` (apenas local)

---

## 🎉 **Vantagens do Docker vs Setup Manual:**

✅ **Zero problemas de dependências** (Chrome já vem no container)  
✅ **Deploy em 3 comandos** (`git clone`, `docker-compose up`)  
✅ **Ambiente 100% consistente** (dev = prod)  
✅ **Fácil rollback** (`git checkout` + `docker-compose up`)  
✅ **Resource limits automáticos** (não vai crashar o EC2)  
✅ **Health checks built-in**  
✅ **Logs centralizados**  
✅ **Nginx + Rate limiting** já configurados 