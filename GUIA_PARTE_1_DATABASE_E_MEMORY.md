# 🐝 A COLMEIA - GUIA COMPLETO PARTE 1
## DATABASE + MEMORY MANAGER + SYSTEM PROMPTS

**📌 SIGA ESTE GUIA - É O MAIS COMPLETO!**

Este é o primeiro de 3 arquivos com TODO o código executável.

---

## ✅ FASE 1: DATABASE COMPLETO

### SQL COMPLETO - Execute TUDO no Supabase SQL Editor

```sql
-- ============================================
-- MEMÓRIA COMPARTILHADA ENTRE AGENTES
-- ============================================
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('gemini-3-pro-preview', 'claude-sonnet-4-5-20250929', 'gpt-5.1-2025-11-13', 'qa-agent')),
  role TEXT NOT NULL CHECK (role IN ('commander', 'architect', 'strategist', 'qa')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_id ON agent_conversations(session_id);
CREATE INDEX idx_agent_name ON agent_conversations(agent_name);
CREATE INDEX idx_created_at ON agent_conversations(created_at DESC);

-- ============================================
-- SISTEMA DE TASKS E SUBTASKS
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'blocked')),
  assigned_agent TEXT CHECK (assigned_agent IN ('gemini-3-pro-preview', 'claude-sonnet-4-5-20250929', 'gpt-5.1-2025-11-13')),
  result TEXT,
  error_message TEXT,
  cost_estimate DECIMAL(10,4),
  actual_cost DECIMAL(10,4),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  requires_approval BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_task_status ON tasks(status);
CREATE INDEX idx_task_session ON tasks(session_id);
CREATE INDEX idx_task_agent ON tasks(assigned_agent);

-- ============================================
-- TRACKING DE CUSTOS
-- ============================================
CREATE TABLE cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_session ON cost_tracking(session_id);
CREATE INDEX idx_cost_created ON cost_tracking(created_at DESC);

-- ============================================
-- KNOWLEDGE BASE
-- ============================================
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('architecture', 'best-practices', 'errors', 'snippets', 'anti-patterns')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  language TEXT,
  framework TEXT,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_category ON knowledge_base(category);
CREATE INDEX idx_kb_tags ON knowledge_base USING GIN(tags);
CREATE INDEX idx_kb_success ON knowledge_base(success_count DESC);

-- ============================================
-- CODE TEMPLATES
-- ============================================
CREATE TABLE code_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  template_type TEXT NOT NULL CHECK (template_type IN ('crud', 'auth', 'api', 'component', 'test', 'config')),
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  framework TEXT,
  dependencies JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_type ON code_templates(template_type);
CREATE INDEX idx_template_usage ON code_templates(usage_count DESC);

-- ============================================
-- HISTÓRICO DE DEPLOYMENTS
-- ============================================
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  repository_url TEXT,
  commit_sha TEXT,
  branch_name TEXT,
  environment TEXT CHECK (environment IN ('development', 'staging', 'production')),
  status TEXT CHECK (status IN ('pending', 'deploying', 'success', 'failed', 'rolled_back')),
  deployment_url TEXT,
  deployed_by TEXT,
  error_message TEXT,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_deployment_task ON deployments(task_id);
CREATE INDEX idx_deployment_status ON deployments(status);

-- ============================================
-- LOGS DE ERROS
-- ============================================
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_name TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_error_task ON error_logs(task_id);
CREATE INDEX idx_error_resolved ON error_logs(resolved);

-- ============================================
-- ALERTAS E NOTIFICAÇÕES
-- ============================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('cost', 'error', 'deploy', 'approval', 'system')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_alert_read ON alerts(read);
CREATE INDEX idx_alert_severity ON alerts(severity);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Service role tem acesso total
CREATE POLICY "Service role full access conversations" ON agent_conversations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access tasks" ON tasks FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access costs" ON cost_tracking FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access kb" ON knowledge_base FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access templates" ON code_templates FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access deployments" ON deployments FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access errors" ON error_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access alerts" ON alerts FOR ALL TO service_role USING (true);

-- Authenticated users podem ler
CREATE POLICY "Authenticated read conversations" ON agent_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read tasks" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read costs" ON cost_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read kb" ON knowledge_base FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read templates" ON code_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read deployments" ON deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read errors" ON error_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read alerts" ON alerts FOR SELECT TO authenticated USING (true);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================
CREATE OR REPLACE FUNCTION get_session_cost(p_session_id TEXT)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(cost_usd), 0)
  FROM cost_tracking
  WHERE session_id = p_session_id;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_session_context(p_session_id TEXT, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  agent_name TEXT,
  role TEXT,
  message TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT agent_name, role, message, created_at
  FROM agent_conversations
  WHERE session_id = p_session_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kb_updated_at BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POPULAR KNOWLEDGE BASE
-- ============================================
INSERT INTO knowledge_base (category, title, content, tags, language) VALUES
('best-practices', 'React Functional Components', 'SEMPRE use componentes funcionais com hooks. Exemplo:

const MyComponent = ({ name }: { name: string }) => {
  const [count, setCount] = useState(0);
  return <div>{name}: {count}</div>;
};', ARRAY['react', 'typescript', 'hooks'], 'typescript'),

('best-practices', 'TypeScript Strict Typing', 'NUNCA use "any". Exemplo correto:

interface User {
  id: string;
  name: string;
}', ARRAY['typescript'], 'typescript'),

('best-practices', 'Error Handling', 'SEMPRE use try/catch:

try {
  const data = await fetchData();
  return { success: true, data };
} catch (error) {
  return { success: false, error: error.message };
}', ARRAY['error-handling'], 'typescript');
```

**✅ CHECKPOINT:** Execute `SELECT COUNT(*) FROM knowledge_base;` deve retornar 3.

---

## ✅ FASE 2: MEMORY MANAGER (EDGE FUNCTION COMPLETA)

### Criar pasta e arquivo

```bash
mkdir -p supabase/functions/memory-manager
```

### Arquivo: `supabase/functions/memory-manager/index.ts`

COPIE TODO ESTE CÓDIGO:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Preços por 1M tokens
const MODEL_COSTS = {
  'gemini-3-pro-preview': { input: 1.25, output: 5.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'gpt-5.1-2025-11-13': { input: 2.50, output: 10.00 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, payload } = await req.json();

    switch (action) {
      case "save_message": {
        const { error } = await supabaseClient
          .from("agent_conversations")
          .insert({
            session_id: payload.session_id,
            agent_name: payload.agent_name,
            role: payload.role,
            message: payload.message,
            metadata: payload.metadata || {},
          });

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, message: "Message saved" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_context": {
        const { data: messages, error } = await supabaseClient
          .from("agent_conversations")
          .select("*")
          .eq("session_id", payload.session_id)
          .order("created_at", { ascending: true })
          .limit(payload.limit || 50);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, data: messages }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_task": {
        const { data: task, error } = await supabaseClient
          .from("tasks")
          .insert({
            session_id: payload.session_id,
            title: payload.title,
            description: payload.description,
            assigned_agent: payload.assigned_agent,
            priority: payload.priority || 5,
            requires_approval: payload.requires_approval || false,
            cost_estimate: payload.cost_estimate,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        // Alerta se requer aprovação
        if (payload.requires_approval) {
          await supabaseClient.from("alerts").insert({
            alert_type: 'approval',
            severity: 'warning',
            title: 'Aprovação Necessária',
            message: `Task "${payload.title}" requer aprovação`,
            metadata: { task_id: task.id },
          });
        }

        return new Response(
          JSON.stringify({ success: true, data: task }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_task": {
        const updateData: any = { status: payload.status };

        if (payload.result) updateData.result = payload.result;
        if (payload.error_message) updateData.error_message = payload.error_message;
        if (payload.actual_cost) updateData.actual_cost = payload.actual_cost;

        if (payload.status === 'in_progress') {
          updateData.started_at = new Date().toISOString();
        }
        if (payload.status === 'completed' || payload.status === 'failed') {
          updateData.completed_at = new Date().toISOString();
        }

        const { error } = await supabaseClient
          .from("tasks")
          .update(updateData)
          .eq("id", payload.task_id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "track_cost": {
        const modelCost = MODEL_COSTS[payload.model];
        if (!modelCost) throw new Error(`Unknown model: ${payload.model}`);

        const cost_usd = (
          (payload.input_tokens / 1_000_000) * modelCost.input +
          (payload.output_tokens / 1_000_000) * modelCost.output
        );

        await supabaseClient.from("cost_tracking").insert({
          session_id: payload.session_id,
          task_id: payload.task_id,
          agent_name: payload.agent_name,
          model: payload.model,
          input_tokens: payload.input_tokens,
          output_tokens: payload.output_tokens,
          cost_usd: cost_usd,
        });

        // Verificar custo total
        const { data: totalCost } = await supabaseClient
          .rpc('get_session_cost', { p_session_id: payload.session_id });

        if (totalCost > 10) {
          await supabaseClient.from("alerts").insert({
            alert_type: 'cost',
            severity: 'warning',
            title: 'Custo Elevado',
            message: `Sessão custou $${totalCost.toFixed(2)}`,
          });
        }

        return new Response(
          JSON.stringify({ success: true, cost_usd }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "log_error": {
        await supabaseClient.from("error_logs").insert({
          task_id: payload.task_id,
          agent_name: payload.agent_name,
          error_type: payload.error_type,
          error_message: payload.error_message,
          stack_trace: payload.stack_trace,
        });

        await supabaseClient.from("alerts").insert({
          alert_type: 'error',
          severity: 'critical',
          title: `Erro: ${payload.error_type}`,
          message: payload.error_message,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
```

### Deploy:

```bash
supabase functions deploy memory-manager
```

**✅ CHECKPOINT:** Teste com curl:
```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/memory-manager \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA-ANON-KEY" \
  -d '{"action":"get_context","payload":{"session_id":"test"}}'
```

---

## 📄 PRÓXIMO ARQUIVO

Continue em: **GUIA_PARTE_2_ORCHESTRATOR_E_QA.md**
