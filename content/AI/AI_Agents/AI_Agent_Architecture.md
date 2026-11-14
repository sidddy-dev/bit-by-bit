---
title: AI Agent Architecture
date: 2026-11-08
---

An AI agent’s architecture is the set of components that lets a language model do more than answer once: it perceives, decides, acts, and learns from the results in a loop.

```
                          ┌──────────────────────────┐
                          │   USER / GOAL / EVENT    │
                          └────────────┬─────────────┘
                                       │
                                       ▼
                          ┌──────────────────────────┐
                          │  PERCEPTION / INPUT      │
                          │  (text, files, APIs)     │
                          └────────────┬─────────────┘
                                       │
                                       ▼
┌───────────────────┐      ┌──────────────────────────┐      ┌───────────────────────┐
│  SYSTEM PROMPT    │─────▶│    CONTEXT BUILDER       │◀─────│        MEMORY         │
│  role, rules,     │      │  (assembles what the     │      │ ┌───────────────────┐ │
│  goals            │      │   model sees)            │      │ │ Short-term        │ │
└───────────────────┘      └────────────┬─────────────┘      │ │ (context window)  │ │
                                        │                    │ ├───────────────────┤ │
                                        ▼                    │ │ Long-term         │ │
                           ┌──────────────────────────┐      │ │ (vector DB/files) │ │
                           │      LLM (THE BRAIN)     │      │ ├───────────────────┤ │
                           │   Reasoning + Planning   │      │ │ Working state     │ │
                           │  (ReAct / Plan / Reflect)│      │ │ (tasks/scratchpad)│ │
                           └────────────┬─────────────┘      │ └───────────────────┘ │
                                        │                    └───────────▲───────────┘
                                        ▼                                │
                           ┌──────────────────────────┐                  │
                           │        DECISION          │                  │
                           └───────┬──────────┬───────┘                  │
                       needs tool  │          │  task complete           │
                                   ▼          ▼                          │
                  ┌─────────────────────┐  ┌──────────────────┐          │
                  │     GUARDRAILS      │  │ OUTPUT VALIDATION│          │
                  │ permissions, limits │  └────────┬─────────┘          │
                  │ human approval      │           │                    │
                  └──────────┬──────────┘           ▼                    │
                             │ approved    ┌──────────────────┐          │
                             ▼             │ FINAL RESPONSE   │          │
                  ┌─────────────────────┐  │ TO USER          │          │
                  │    TOOL EXECUTOR    │  └──────────────────┘          │
                  └──────────┬──────────┘                                │
                             │                                           │
        ┌──────────┬─────────┼─────────┬──────────┐                      │
        ▼          ▼         ▼         ▼          ▼                      │
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
   │  Web   │ │  Code  │ │  DBs / │ │ Files /│ │ Other  │                │
   │ Search │ │  Exec  │ │  APIs  │ │Browser │ │ Agents │                │
   └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘                │
       └──────────┴─────────┼──────────┴──────────┘                      │
                            ▼                                            │
                  ┌─────────────────────┐                                │
                  │ OBSERVATION / RESULT│────────────────────────────────┘
                  └──────────┬──────────┘     (saved to memory)
                             │
                             └──────────▶ back to LLM (loop repeats)


  ┌────────────────────────────────────────────────────────────────────┐
  │  OBSERVABILITY: logging, tracing, evaluation, feedback (all steps) │
  └────────────────────────────────────────────────────────────────────┘
```

### 1. User / Goal / Event
This is the trigger. It can be a chat message (“book me a flight”), a scheduled job, a webhook, or a change in some system (a new email, a failed build). The agent always starts from a goal, stated or implied.

### 2. Perception / Input Layer
Raw input is rarely ready for a model. This layer receives text, files, images, API payloads or sensor data, then cleans and converts it into something the model can read: extracting text from a PDF, transcribing audio, stripping HTML, validating a JSON payload.

### 3. System Prompt
A fixed set of instructions that defines the agent’s role, rules, tone, available tools, output format and what “done” looks like. Example: “You are a support agent. Never issue refunds over $100 without approval.” It stays mostly constant across tasks and is the main way you steer behavior.

### 4. Memory
Three kinds feed the agent:
1. **Short-term:** the current conversation and recent tool results, held in the context window.
2. **Long-term:** knowledge stored outside the model, such as a vector database, documents or user preferences, retrieved when relevant (RAG).
3. **Working state:** the agent’s own notes, like a task list or intermediate results, so it doesn’t lose track on multi-step jobs.

### 5. Context Builder
The model only knows what’s in its prompt, so this component decides what goes in: the system prompt, the user’s goal, relevant memories, recent history and tool results. It also trims or summarizes when the context gets too long. Good context building is often the biggest factor in agent quality.

### 6. LLM (Reasoning and Planning)
The brain. It reads the assembled context and decides what to do next. Typical techniques:
- ReAct: think, act, observe, repeat.
- Plan-and-execute: write a full plan first, then work through it.
- Reflection: review its own output and fix mistakes.
The output is either a tool request or a final answer.

### 7. Decision
A branch point, usually handled by the runtime reading the model’s output:
- If the model asked for a tool, go to guardrails and execution.
- If the model produced a final answer, go to output validation.

### 8. Guardrails
Checks that run before any real-world action. They cover permissions (is this tool allowed?), input validation (are the arguments sane?), limits on cost, steps and time, and human approval for risky actions like sending money, deleting data or emailing customers. If blocked, the refusal goes back to the model so it can choose another approach.

### 9. Tool Executor
The runtime that actually runs the requested function. The model only produces a structured request (e.g. `search(query="...")`); the executor performs it, handles errors and timeouts, and captures the output.

### 10. The Tools
The agent’s “hands”:
- Web search: current information.
- Code execution: calculations, data analysis, scripts.
- Databases / APIs: business data and external services.
- Files / browser: read, write, navigate.
- Other agents: delegate subtasks to specialists.

### 11. Observation / Result
Whatever the tool returned (data, an error message, a confirmation) is packaged as an observation. It’s saved into memory and sent back to the LLM so the next decision is based on what actually happened rather than assumptions.

### 12. The Loop
Steps 5 to 11 repeat. Each pass, the agent sees the new results, reassesses, and either takes another action or concludes. A stop condition (task complete, step limit, error threshold, or human interruption) prevents endless looping.

### 13. Output Validation
Before the user sees anything, the final answer is checked for format (valid JSON? required fields?), policy compliance, accuracy against the gathered evidence, and safety. If it fails, the agent can revise it.

### 14. Final Response to User
The validated result is delivered: a message, a file, an updated record, or a completed action. In some systems this also triggers memory updates so the agent learns from the outcome.

### 15. Observability
Running alongside everything: logs, traces of each model call and tool call, token and cost tracking, and evaluations. This is how you debug failures (“why did it call the wrong tool?”), measure quality, and improve the agent over time.