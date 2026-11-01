---
title: Retrieval-Augmented Generation Basics
date: 2026-10-21
tags: rag, embeddings, retrieval
---

Retrieval-augmented generation (RAG) answers questions by first **finding relevant text** from your own data, then giving that text to the model along with the question. The model can then answer from sources it was never trained on, and you can show where the answer came from.

## The pipeline

1. **Ingest**: split documents into chunks.
2. **Embed**: turn each chunk into a vector with an embedding model.
3. **Store**: save the vectors and the original text in a vector index.
4. **Retrieve**: embed the question and find the nearest chunks.
5. **Generate**: put those chunks in the prompt and ask the model to answer from them.

```python
def answer(question: str) -> str:
    q_vec = embed(question)
    chunks = index.search(q_vec, top_k=5)
    context = "\n\n".join(c.text for c in chunks)
    prompt = (
        "Answer using only the context below. "
        "If the answer isn't there, say you don't know.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}"
    )
    return llm(prompt)
```

## Where RAG usually goes wrong

- **Bad chunking.** Chunks that cut a thought in half, or are too large to be specific, hurt retrieval.
- **Retrieval misses.** If the right chunk isn't retrieved, the model can't use it. Evaluate retrieval separately from generation.
- **Stale data.** Plan how the index is refreshed when sources change.
- **No grounding instruction.** Tell the model to answer from the context and to admit when it can't.

## Improving it

Combine keyword and vector search, rerank the top results, keep chunk metadata such as title and section, and build a small set of real questions with known answers so you can measure each change.
