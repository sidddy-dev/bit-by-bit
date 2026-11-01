# Engineering Notebook

A personal teaching site. Every note is a Markdown file in `content/`, and the folder tree becomes the sidebar.

```
content/
  Kubernetes/
    Fundamentals/
      01-Pods-and-the-Pod-Lifecycle.md
      02-Deployments-and-Rolling-Updates.md
    Networking/
      Services-Explained.md
  AI/
    RAG/
      Retrieval-Augmented-Generation-Basics.md
```

## Publish it (one time)

1. Create a GitHub repository and push this folder to the `main` branch.
2. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Open the **Actions** tab, wait for "Deploy site" to finish, and your site is live at `https://<your-username>.github.io/<repo-name>/`.

## Add a note

Create `content/<Folder>/<Subfolder>/<Name>.md`, commit and push. The workflow rebuilds the site in about a minute. Folders can be nested as deep as you like.

Optional front matter at the top of a note:

```
---
title: Pods and the Pod Lifecycle
date: 2026-10-28
tags: kubernetes, pods, basics
draft: false
---
```

- **title** defaults to the file name (`Pods-and-Lifecycle.md` becomes "Pods and Lifecycle").
- **date** defaults to the date the file was first committed.
- **draft: true**, or a file or folder name starting with `_`, keeps it off the site.

## Rules worth knowing

- **Order:** items sort alphabetically. Start a name with a number to control order (`01-Intro.md`). The number is hidden on the site.
- **Names:** underscores in folder names show as spaces. Folder names with spaces also work.
- **Images:** put them anywhere under `content/` and use a relative path, for example `![diagram](images/flow.png)`.
- **Links between notes:** `[Pods](../Fundamentals/01-Pods-and-the-Pod-Lifecycle.md)` links to the other note.
- **Supported Markdown:** headings, paragraphs, bold, italic, inline code, code blocks, bullet and numbered lists (nested too), quotes, tables, images, links and horizontal rules.

## Preview on your computer

```
node build.mjs
npx serve dist
```

Opening `index.html` directly from disk will not work, because the browser blocks loading the notes.

## Customize

- Site name: change "Engineering Notebook" in `index.html` (the `<title>`, the sidebar and the top bar).
- Colors and sizes: the tokens at the top of `style.css`.
- Custom domain: add a file named `CNAME` containing your domain, then set it under Settings → Pages.
