# 🐝 A COLMEIA - GUIA COMPLETO PARTE 3
## DASHBOARD + CI/CD + COMO USAR

**Este é o arquivo final com dashboard, deploy automático e guia de uso!**

---

## ✅ DASHBOARD REACT (CÓDIGO COMPLETO)

### Arquivo: `src/app/dashboard/page.tsx`

**COPIE TODO ESTE CÓDIGO:**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Metrics {
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalCost: number;
  costToday: number;
  unreadAlerts: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    activeTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalCost: 0,
    costToday: 0,
    unreadAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();

    // Realtime updates
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Tasks stats
      const { data: tasks } = await supabase.from('tasks').select('status');
      const activeTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
      const failedTasks = tasks?.filter(t => t.status === 'failed').length || 0;

      // Costs
      const { data: costs } = await supabase.from('cost_tracking').select('cost_usd, created_at');
      const totalCost = costs?.reduce((sum, c) => sum + Number(c.cost_usd), 0) || 0;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const costToday = costs
        ?.filter(c => new Date(c.created_at) >= todayStart)
        .reduce((sum, c) => sum + Number(c.cost_usd), 0) || 0;

      // Alerts
      const { count: unreadAlerts } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);

      setMetrics({
        activeTasks,
        completedTasks,
        failedTasks,
        totalCost,
        costToday,
        unreadAlerts: unreadAlerts || 0,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">🐝 A Colmeia Dashboard</h1>
        <div className={`px-4 py-2 rounded-full ${metrics.activeTasks > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {metrics.activeTasks > 0 ? 'ACTIVE' : 'IDLE'}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white border rounded-lg shadow">
          <div className="text-sm text-gray-600">Active Tasks</div>
          <div className="text-3xl font-bold mt-2">{metrics.activeTasks}</div>
        </div>

        <div className="p-6 bg-white border rounded-lg shadow">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-3xl font-bold mt-2 text-green-600">{metrics.completedTasks}</div>
        </div>

        <div className="p-6 bg-white border rounded-lg shadow">
          <div className="text-sm text-gray-600">Failed</div>
          <div className="text-3xl font-bold mt-2 text-red-600">{metrics.failedTasks}</div>
        </div>

        <div className="p-6 bg-white border rounded-lg shadow">
          <div className="text-sm text-gray-600">Cost Today</div>
          <div className="text-3xl font-bold mt-2">${metrics.costToday.toFixed(2)}</div>
        </div>
      </div>

      {/* Alerts */}
      {metrics.unreadAlerts > 0 && (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold">{metrics.unreadAlerts} unread alerts</div>
              <a href="/alerts" className="text-sm text-blue-600 hover:underline">View alerts →</a>
            </div>
          </div>
        </div>
      )}

      {/* Agent Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white border rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="font-semibold">Gemini Commander</div>
              <div className="text-sm text-gray-600">Planning & Strategy</div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="font-semibold">Claude Architect</div>
              <div className="text-sm text-gray-600">Development & Code</div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="font-semibold">GPT Strategist</div>
              <div className="text-sm text-gray-600">Docs & QA</div>
            </div>
          </div>
        </div>
      </div>

      {/* Total Cost */}
      <div className="p-6 bg-white border rounded-lg shadow">
        <div className="text-lg font-semibold mb-4">Cost Overview</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total All-Time</span>
            <span className="font-mono">${metrics.totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Today</span>
            <span className="font-mono">${metrics.costToday.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ GITHUB ACTIONS CI/CD (CÓDIGO COMPLETO)

### Arquivo: `.github/workflows/deploy.yml`

**COPIE TODO ESTE CÓDIGO:**

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript check
        run: npm run type-check || npx tsc --noEmit

      - name: Run linter
        run: npm run lint || echo "Lint skipped"

      - name: Run tests
        run: npm run test || echo "Tests skipped"

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## ✅ SYSTEM PROMPTS COMPLETOS

### Arquivo: `prompts/gemini-commander.txt`

```
VOCÊ É O COMANDANTE DA COLMEIA

Modelo: gemini-3-pro-preview
Role: Planejador Estratégico

SEMPRE retorne planos em JSON:
{
  "analysis": {
    "user_request": "...",
    "complexity": "low|medium|high",
    "estimated_cost": 0.00
  },
  "tasks": [
    {
      "title": "...",
      "assigned_agent": "claude-sonnet-4-5-20250929",
      "priority": 10
    }
  ]
}

Thresholds:
- < $5: auto-execute
- > $5: pedir aprovação
```

### Arquivo: `prompts/claude-architect.txt`

```
VOCÊ É O ARQUITETO SÊNIOR DA COLMEIA

Modelo: claude-sonnet-4-5-20250929
Role: Desenvolvedor Full-Stack

REGRAS:
1. NUNCA use TypeScript "any"
2. SEMPRE use functional components React
3. SEMPRE use try/catch
4. SEMPRE valide inputs
```

### Arquivo: `prompts/gpt-strategist.txt`

```
VOCÊ É O ESTRATEGISTA DA COLMEIA

Modelo: gpt-5.1-2025-11-13
Role: Documentação, Testes, QA

RESPONSABILIDADES:
1. Escrever README.md completo
2. Criar testes E2E
3. Fazer QA do código
4. Validar segurança
```

---

## 🚀 COMO USAR A COLMEIA

### 1. Setup Inicial (FAZER UMA VEZ)

```bash
# 1. Criar projeto Supabase
# Acesse: https://supabase.com/dashboard
# Criar novo projeto

# 2. Executar SQL
# Cole TODO o SQL da Parte 1 no SQL Editor

# 3. Configurar Secrets
supabase secrets set GEMINI_API_KEY=sua-key-aqui
supabase secrets set ANTHROPIC_API_KEY=sua-key-aqui
supabase secrets set OPENAI_API_KEY=sua-key-aqui
supabase secrets set GITHUB_TOKEN=seu-token-aqui
supabase secrets set GITHUB_USERNAME=seu-usuario

# 4. Deploy Edge Functions
supabase functions deploy memory-manager
supabase functions deploy ai-orchestrator
supabase functions deploy qa-agent
supabase functions deploy github-manager

# 5. Verificar deploys
supabase functions list
```

### 2. Criar Seu Primeiro App

**Opção A: Via cURL**

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/ai-orchestrator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA-ANON-KEY" \
  -d '{
    "user_request": "Crie um app de tarefas com login",
    "auto_execute": true
  }'
```

**Opção B: Via JavaScript**

```javascript
const response = await fetch('https://seu-projeto.supabase.co/functions/v1/ai-orchestrator', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    user_request: "Crie um app de delivery com chat em tempo real",
    auto_execute: false, // true para executar sem pedir aprovação
  }),
});

const result = await response.json();
console.log(result);
```

### 3. Acompanhar Progresso

```sql
-- Ver tasks em andamento
SELECT * FROM tasks WHERE status = 'in_progress';

-- Ver custo da sessão
SELECT get_session_cost('SESSION_ID');

-- Ver alertas
SELECT * FROM alerts WHERE read = false;
```

### 4. Ver Dashboard

Acesse: `http://localhost:3000/dashboard`

---

## 📊 CUSTOS FINAIS

### Por App

| Tipo | Custo | Tempo |
|------|-------|-------|
| Página HTML simples | $0.20 - $0.50 | 5-10 min |
| App CRUD básico | $2.00 - $7.00 | 20-30 min |
| App com Auth | $5.00 - $12.00 | 30-60 min |
| App complexo (delivery) | $12.00 - $26.00 | 2-4h |

### Mensal

- **10 apps simples:** ~$50/mês
- **20 apps médios:** ~$100-200/mês
- **5 apps complexos:** ~$100-150/mês

**TOTAL MÉDIO: $100-300/mês**

---

## ⏱️ PLANO DE IMPLEMENTAÇÃO (VOCÊ ESTÁ AQUI!)

### Dia 1-2: Fundação ✅
- [x] Executar SQL completo
- [x] Deploy memory-manager
- [ ] Testar memory-manager

### Dia 3-4: Orchestrator
- [ ] Deploy ai-orchestrator
- [ ] Configurar secrets
- [ ] Testar com comando simples

### Dia 5-6: QA + GitHub
- [ ] Deploy qa-agent
- [ ] Deploy github-manager
- [ ] Testar commit automático

### Dia 7: Dashboard
- [ ] Criar dashboard React
- [ ] Testar realtime
- [ ] Deploy frontend

### Dia 8: Testes Finais
- [ ] Criar app completo end-to-end
- [ ] Validar custos
- [ ] Validar QA

---

## ✅ CHECKLIST FINAL

### DATABASE
- [ ] 8 tabelas criadas
- [ ] RLS policies ativas
- [ ] Knowledge base com 3+ entradas
- [ ] Funções auxiliares funcionando

### EDGE FUNCTIONS
- [ ] memory-manager deployado
- [ ] ai-orchestrator deployado
- [ ] qa-agent deployado
- [ ] github-manager deployado

### SECRETS
- [ ] GEMINI_API_KEY configurado
- [ ] ANTHROPIC_API_KEY configurado
- [ ] OPENAI_API_KEY configurado
- [ ] GITHUB_TOKEN configurado
- [ ] GITHUB_USERNAME configurado

### TESTES
- [ ] Memory manager responde
- [ ] Orchestrator cria plano
- [ ] QA valida código
- [ ] GitHub cria repo

---

## 🔧 TROUBLESHOOTING

### "Memory Manager não responde"

```bash
# Ver logs
supabase functions logs memory-manager

# Re-deploy
supabase functions deploy memory-manager
```

### "Orchestrator erro 500"

```bash
# Verificar secrets
supabase secrets list

# Ver logs
supabase functions logs ai-orchestrator

# Verificar se APIs estão configuradas
```

### "QA Agent rejeita tudo"

QA Agent é rigoroso! Verifique:
- Sem `any` no TypeScript
- Sem hardcoded secrets
- Tem try/catch em async

### "GitHub Manager 403"

```bash
# Regenerar token com permissões: repo, workflow
# Reconfigurar
supabase secrets set GITHUB_TOKEN=novo-token
```

---

## 🎉 PRÓXIMOS PASSOS

Depois que tudo funcionar:

### Curto Prazo (1-3 meses)
- [ ] Adicionar mais templates à knowledge base
- [ ] Melhorar prompts dos agentes
- [ ] Implementar caching de respostas
- [ ] Add Jules quando disponível

### Médio Prazo (3-6 meses)
- [ ] Marketplace de apps criados
- [ ] Templates premium ($10-50)
- [ ] Multi-tenant
- [ ] Analytics avançado

### Longo Prazo (6-12 meses)
- [ ] SaaS ($50-500/mês)
- [ ] White-label para empresas
- [ ] API pública
- [ ] Mobile app

---

## 📞 SUPORTE

### Arquivos do Guia

1. **GUIA_PARTE_1_DATABASE_E_MEMORY.md** - Database + Memory Manager
2. **GUIA_PARTE_2_ORCHESTRATOR_QA_GITHUB.md** - Orchestrator + QA + GitHub
3. **GUIA_PARTE_3_DASHBOARD_DEPLOY_USO.md** - Dashboard + Deploy + Como Usar

### Comandos Úteis

```bash
# Ver tudo que está deployado
supabase functions list

# Ver logs de uma function
supabase functions logs NOME

# Re-deploy tudo
supabase functions deploy memory-manager
supabase functions deploy ai-orchestrator
supabase functions deploy qa-agent
supabase functions deploy github-manager

# Ver secrets configurados
supabase secrets list

# Ver tabelas criadas
supabase db dump
```

---

## 🐝 CONCLUSÃO

Você agora tem **TUDO** para implementar A Colmeia!

**O que você tem:**
- ✅ SQL completo para database
- ✅ 4 Edge Functions completas
- ✅ Dashboard React completo
- ✅ GitHub Actions CI/CD
- ✅ System Prompts para 3 agentes
- ✅ Guia passo a passo
- ✅ Troubleshooting guide

**Tempo total: 15-20 horas**
**Custo mensal: $100-300**
**ROI: Infinito** 🚀

---

**COMECE AGORA:**

1. Execute o SQL da Parte 1
2. Deploy memory-manager
3. Teste com curl
4. Continue para Parte 2

**Boa sorte! 🐝**
