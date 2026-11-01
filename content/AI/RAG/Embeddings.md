---
title: What is Embedding
date: 2026-11-01
---

An embedding is a way of representing something (a word, sentence, image, product, user, etc.) as a list of numbers, called a vector, so that a machine can work with its *meaning* rather than just its raw form.

### The core idea
Computers can’t directly understand that “king” and “queen” are related, or that a photo of a dog resembles another dog photo. An embedding model converts each item into a point in a high-dimensional space (often hundreds or thousands of dimensions) so that similar things end up close together and dissimilar things end up far apart.

For example, “cat” and “kitten” might get vectors that are very close, while “cat” and “carburetor” land far apart. Closeness is usually measured with cosine similarity or Euclidean distance.