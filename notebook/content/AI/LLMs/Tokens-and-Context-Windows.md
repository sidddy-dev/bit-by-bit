---
title: Tokens and Context Windows
date: 2026-10-20
tags: llm, tokens, context
---

Language models don't read characters or words. They read **tokens**, which are chunks of text produced by a tokenizer. A token might be a whole common word, part of a rarer word, a punctuation mark, or a few characters of code.

## A rough sense of scale

For ordinary English, a token is roughly four characters, or about three quarters of a word. Code, numbers and non-English text often use more tokens for the same visible length. Always count with the tokenizer of the model you use instead of guessing.

## The context window

The **context window** is the maximum number of tokens a model can consider in one request. It covers everything together:

- the system prompt and instructions
- the conversation so far
- any documents or tool results you paste in
- the response the model is writing

If the input uses most of the window, there is little room left for the answer.

## Why this affects design

- **Cost and latency** usually scale with token counts, for both input and output.
- **Long inputs** aren't free: relevant details buried in a large context can be easier to miss than the same details in a short, focused one.
- **Conversation history** grows every turn, so long sessions need trimming or summarizing.
- Retrieval (see the RAG note) exists largely to put only the relevant text into the window.

## Practical habits

- Put the most important instructions where they are easy to find, and keep the context focused.
- Measure real token counts on real data before choosing a model or a budget.
- Set a maximum output length so a runaway response can't spend your whole budget.
