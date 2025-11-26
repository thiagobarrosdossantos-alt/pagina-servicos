# 🐝 A COLMEIA - GUIA COMPLETO PARTE 2
## AI ORCHESTRATOR + QA AGENT + GITHUB MANAGER

**Este arquivo contém TODO o código das Edge Functions principais!**

---

## ✅ AI ORCHESTRATOR (CÉREBRO CENTRAL) - CÓDIGO COMPLETO

### Criar pasta e arquivo

```bash
mkdir -p supabase/functions/ai-orchestrator
```

### Arquivo: `supabase/functions/ai-orchestrator/index.ts`

**COPIE TODO ESTE CÓDIGO** (é grande mas é completo!):

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_request, session_id, auto_execute } = await req.json();
    const sessionId = session_id || crypto.randomUUID();

    console.log(`🐝 Orchestrator starting: ${sessionId}`);

    // FASE 1: PLANEJAMENTO com Gemini
    const planPrompt = `Analise: "${user_request}"
Crie um plano JSON com tasks detalhadas, custos estimados e arquitetura.`;

    const planResponse = await callGemini(planPrompt);
    const plan = JSON.parse(planResponse);

    // Salvar plano
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        action: 'save_message',
        payload: {
          session_id: sessionId,
          agent_name: 'gemini-3-pro-preview',
          role: 'commander',
          message: JSON.stringify(plan),
        },
      }),
    });

    // Verificar aprovação
    if (plan.analysis.estimated_cost > 5 && !auto_execute) {
      return new Response(
        JSON.stringify({
          success: true,
          requires_approval: true,
          session_id: sessionId,
          plan: plan,
          message: `Custo: $${plan.analysis.estimated_cost}. Aprovar?`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FASE 2: CRIAR TASKS
    const taskIds = [];
    for (const task of plan.tasks) {
      const { data } = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          action: 'create_task',
          payload: {
            session_id: sessionId,
            title: task.title,
            description: task.description,
            assigned_agent: task.assigned_agent,
            priority: task.priority,
            cost_estimate: task.estimated_cost,
          },
        }),
      }).then(r => r.json());

      taskIds.push(data.data.id);
    }

    // FASE 3: EXECUTAR TASKS
    const results = [];
    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i];
      const taskId = taskIds[i];

      // Atualizar para in_progress
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          action: 'update_task',
          payload: { task_id: taskId, status: 'in_progress' },
        }),
      });

      // Buscar contexto
      const { data: contextData } = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          action: 'get_context',
          payload: { session_id: sessionId, limit: 20 },
        }),
      }).then(r => r.json());

      // Executar task com retry
      let result;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          result = await executeTask(task, contextData.data || [], sessionId, taskId);
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                action: 'log_error',
                payload: {
                  task_id: taskId,
                  agent_name: task.assigned_agent,
                  error_type: 'execution_error',
                  error_message: error.message,
                },
              }),
            });
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      results.push(result);

      // Atualizar task completed
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          action: 'update_task',
          payload: {
            task_id: taskId,
            status: 'completed',
            result: JSON.stringify(result),
          },
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        plan: plan,
        results: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper: Executar task
async function executeTask(task: any, context: any[], sessionId: string, taskId: string) {
  const prompt = `CONTEXT: ${context.map(c => `[${c.agent_name}] ${c.message}`).join('\n')}

TASK: ${task.title}
${task.description}

Execute seguindo todas as guidelines.`;

  let result;
  let inputTokens = 0;
  let outputTokens = 0;

  switch (task.assigned_agent) {
    case 'gemini-3-pro-preview':
      result = await callGemini(prompt);
      inputTokens = estimateTokens(prompt);
      outputTokens = estimateTokens(result);
      break;

    case 'claude-sonnet-4-5-20250929':
      result = await callClaude(prompt);
      inputTokens = estimateTokens(prompt);
      outputTokens = estimateTokens(result);
      break;

    case 'gpt-5.1-2025-11-13':
      result = await callGPT(prompt);
      inputTokens = estimateTokens(prompt);
      outputTokens = estimateTokens(result);
      break;

    default:
      throw new Error(`Unknown agent: ${task.assigned_agent}`);
  }

  // Track cost
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      action: 'track_cost',
      payload: {
        session_id: sessionId,
        task_id: taskId,
        agent_name: task.assigned_agent,
        model: task.assigned_agent,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    }),
  });

  // Save result
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      action: 'save_message',
      payload: {
        session_id: sessionId,
        agent_name: task.assigned_agent,
        role: getRoleFromAgent(task.assigned_agent),
        message: result,
      },
    }),
  });

  return result;
}

// API Calls
async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callClaude(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  return data.content[0].text;
}

async function callGPT(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.1-2025-11-13',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getRoleFromAgent(agent: string): string {
  const map: Record<string, string> = {
    'gemini-3-pro-preview': 'commander',
    'claude-sonnet-4-5-20250929': 'architect',
    'gpt-5.1-2025-11-13': 'strategist',
  };
  return map[agent] || 'unknown';
}
```

### Configurar secrets:

```bash
supabase secrets set GEMINI_API_KEY=sua-key
supabase secrets set ANTHROPIC_API_KEY=sua-key
supabase secrets set OPENAI_API_KEY=sua-key
```

### Deploy:

```bash
supabase functions deploy ai-orchestrator
```

**✅ CHECKPOINT:** Teste criando um app simples:
```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/ai-orchestrator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA-KEY" \
  -d '{"user_request":"Crie uma página HTML simples","auto_execute":true}'
```

---

## ✅ QA AGENT (QUALITY ASSURANCE) - CÓDIGO COMPLETO

### Criar pasta

```bash
mkdir -p supabase/functions/qa-agent
```

### Arquivo: `supabase/functions/qa-agent/index.ts`

**COPIE TODO ESTE CÓDIGO:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { task_id, session_id, code_files } = await req.json();

    const qaResults = {
      passed: true,
      issues: [] as any[],
      warnings: [] as any[],
    };

    // SECURITY SCAN
    for (const file of code_files) {
      // Check hardcoded secrets
      if (/api[_-]?key[s]?\s*[:=]\s*['"][^'"]+['"]/gi.test(file.content)) {
        qaResults.passed = false;
        qaResults.issues.push({
          severity: 'critical',
          file: file.path,
          issue: 'Hardcoded secret detected',
        });
      }

      // Check SQL injection
      if (/\.query\([^)]*\$\{[^}]+\}/g.test(file.content)) {
        qaResults.passed = false;
        qaResults.issues.push({
          severity: 'critical',
          file: file.path,
          issue: 'SQL injection vulnerability',
        });
      }

      // Check TypeScript any
      if (/:\s*any\b/g.test(file.content)) {
        qaResults.warnings.push({
          severity: 'medium',
          file: file.path,
          issue: 'Using TypeScript "any" type',
        });
      }

      // Check missing error handling
      if (/await\s+[^;]+;/.test(file.content) && !/try\s*\{/.test(file.content)) {
        qaResults.warnings.push({
          severity: 'medium',
          file: file.path,
          issue: 'Async without try/catch',
        });
      }
    }

    // FINAL VERDICT
    if (qaResults.issues.length > 0) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          action: 'log_error',
          payload: {
            task_id,
            agent_name: 'qa-agent',
            error_type: 'qa_failed',
            error_message: `${qaResults.issues.length} critical issues`,
          },
        }),
      });

      return new Response(
        JSON.stringify({
          success: false,
          qa_passed: false,
          results: qaResults,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Save QA success
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        action: 'save_message',
        payload: {
          session_id,
          agent_name: 'qa-agent',
          role: 'qa',
          message: JSON.stringify(qaResults),
        },
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        qa_passed: true,
        results: qaResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```

### Deploy:

```bash
supabase functions deploy qa-agent
```

---

## ✅ GITHUB MANAGER - CÓDIGO COMPLETO

### Criar pasta

```bash
mkdir -p supabase/functions/github-manager
```

### Arquivo: `supabase/functions/github-manager/index.ts`

**COPIE TODO ESTE CÓDIGO:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
const GITHUB_USERNAME = Deno.env.get("GITHUB_USERNAME");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, repo_name, files, commit_message, task_id } = await req.json();

    if (action === 'create_repo') {
      // Criar repositório
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          name: repo_name,
          description: 'Created by A Colmeia',
          auto_init: true,
        }),
      });

      const repo = await response.json();

      // Salvar deployment
      await supabaseClient.from('deployments').insert({
        task_id,
        repository_url: repo.html_url,
        status: 'pending',
      });

      return new Response(
        JSON.stringify({ success: true, repo_url: repo.html_url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'commit') {
      const repoFullName = `${GITHUB_USERNAME}/${repo_name}`;

      // Get latest commit
      const refResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/refs/heads/main`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      const ref = await refResponse.json();

      // Create blobs para cada arquivo
      const tree = [];
      for (const file of files) {
        const blobResponse = await fetch(
          `https://api.github.com/repos/${repoFullName}/git/blobs`,
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
          }
        );

        const blob = await blobResponse.json();
        tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
      }

      // Create tree
      const treeResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/trees`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({ tree }),
        }
      );

      const newTree = await treeResponse.json();

      // Create commit
      const commitResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/commits`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            message: commit_message || 'Update from A Colmeia',
            tree: newTree.sha,
            parents: [ref.object.sha],
          }),
        }
      );

      const newCommit = await commitResponse.json();

      // Update ref
      await fetch(
        `https://api.github.com/repos/${repoFullName}/git/refs/heads/main`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({ sha: newCommit.sha }),
        }
      );

      return new Response(
        JSON.stringify({ success: true, commit_sha: newCommit.sha }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```

### Configurar secrets:

```bash
supabase secrets set GITHUB_TOKEN=seu-token
supabase secrets set GITHUB_USERNAME=seu-usuario
```

### Deploy:

```bash
supabase functions deploy github-manager
```

---

## 📄 PRÓXIMO ARQUIVO

Continue em: **GUIA_PARTE_3_DASHBOARD_E_DEPLOY.md**

---

## ✅ CHECKPOINTS DESTA PARTE

- [ ] AI Orchestrator deployado
- [ ] QA Agent deployado
- [ ] GitHub Manager deployado
- [ ] Todos os secrets configurados
- [ ] Testou orchestrator com comando simples
