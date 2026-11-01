/* Engineering Notebook: loads posts.json (made by build.mjs), builds the sidebar tree,
   and fetches each .md file only when you open it. Use relative URLs only so it works under /repo-name/. */
(function () {
  'use strict';

  var BASE_TITLE = document.title;
  var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var fmtDate = function (d) {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return d; }
  };
  var encPath = function (p) { return p.split('/').map(encodeURIComponent).join('/'); };

  var mainEl = document.getElementById('main');
  var navEl = document.getElementById('nav');
  var root = null, ordered = [], byId = new Map(), byFile = {};
  var open = new Set(), query = '', current = null, cache = {};

  /* ---------- markdown ---------- */
  function norm(dir, rel) {
    var parts = (dir ? dir.split('/') : []).concat(decodeURI(rel).split('/')), out = [];
    parts.forEach(function (p) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); });
    return out.join('/');
  }
  function fmt(s, ctx) {
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:/i.test(url)) return '';
      var src = /^https?:/i.test(url) ? url : new URL(url, new URL(ctx.base, document.baseURI)).href;
      return '<img src="' + src + '" alt="' + alt + '" loading="lazy">';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, text, url) {
      if (/^https?:\/\//i.test(url)) return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
      var plain = url.replace(/#.*$/, '');
      if (/\.md$/i.test(plain)) {
        var t = byFile[norm(ctx.dir, plain)];
        if (t) return '<a href="#' + t.id + '">' + text + '</a>';
      }
      return text;
    });
    return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }
  function inline(s, ctx) {
    return s.split('`').map(function (p, i) { return i % 2 ? '<code>' + esc(p) + '</code>' : fmt(esc(p), ctx); }).join('');
  }
  var LI = /^(\s*)([-*]|\d+\.)\s+(.*)/;
  function list(lines, i, ctx) {
    var first = lines[i].match(LI), base = first[1].length, tag = /\d/.test(first[2]) ? 'ol' : 'ul', items = '';
    while (i < lines.length) {
      var m = lines[i].match(LI);
      if (!m || m[1].length !== base) break;
      i++;
      var sub = '';
      var n = i < lines.length ? lines[i].match(LI) : null;
      if (n && n[1].length > base) { var r = list(lines, i, ctx); sub = r[0]; i = r[1]; }
      items += '<li>' + inline(m[3], ctx) + sub + '</li>';
    }
    return ['<' + tag + '>' + items + '</' + tag + '>', i];
  }
  function cells(row) { return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); }
  var SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

  function md(src, ctx) {
    var lines = src.replace(/\r/g, '').split('\n'), out = [], i = 0, para = [];
    function flush() { if (para.length) { out.push('<p>' + inline(para.join(' '), ctx) + '</p>'); para = []; } }
    while (i < lines.length) {
      var l = lines[i], m;
      if (/^\s*```/.test(l)) {
        flush();
        var indent = l.match(/^\s*/)[0].length, lang = l.trim().slice(3).trim(), buf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i].slice(Math.min(indent, lines[i].match(/^\s*/)[0].length))); i++; }
        i++;
        out.push('<div class="code"><div class="code-head"><span>' + esc(lang || 'text') + '</span><button class="ghost" data-copy>Copy</button></div><pre><code>' + esc(buf.join('\n')) + '</code></pre></div>');
        continue;
      }
      if ((m = l.match(/^(#{1,4})\s+(.*)/))) {
        flush();
        var lvl = m[1].length;
        if (lvl === 1) { if (m[2].trim().toLowerCase() === ctx.title.toLowerCase()) { i++; continue; } lvl = 2; }
        out.push('<h' + lvl + '>' + inline(m[2], ctx) + '</h' + lvl + '>'); i++; continue;
      }
      if (/^(-{3,}|\*{3,})\s*$/.test(l)) { flush(); out.push('<hr>'); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && SEP.test(lines[i + 1])) {
        flush();
        var head = cells(l), rows = [];
        i += 2;
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
        out.push('<div class="tablewrap"><table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c, ctx) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c, ctx) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
        continue;
      }
      if (/^>\s?/.test(l)) {
        flush(); var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote>' + inline(q.join(' '), ctx) + '</blockquote>'); continue;
      }
      if (LI.test(l)) { flush(); var r = list(lines, i, ctx); out.push(r[0]); i = r[1]; continue; }
      if (!l.trim()) { flush(); i++; continue; }
      para.push(l.trim()); i++;
    }
    flush();
    return out.join('\n');
  }

  /* ---------- sidebar ---------- */
  var chev = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5"/></svg>';
  var count = function (n) { var c = n.posts.length; n.kids.forEach(function (k) { c += count(k); }); return c; };
  var firstPost = function (n) { var f = null; n.kids.forEach(function (k) { if (!f) f = firstPost(k); }); return f || n.posts[0] || null; };

  function treeHtml(node, depth) {
    var h = '';
    node.kids.forEach(function (k) {
      var isOpen = open.has(k.key);
      h += '<div class="folder"><button class="fbtn" data-key="' + esc(k.key) + '" aria-expanded="' + isOpen + '" style="--d:' + depth + '">' + chev +
        '<span class="fname">' + esc(k.name) + '</span><span class="fcount">' + count(k) + '</span></button>';
      if (isOpen) h += '<div class="fkids">' + treeHtml(k, depth + 1) + '</div>';
      h += '</div>';
    });
    node.posts.forEach(function (p) {
      h += '<a class="plink" href="#' + p.id + '" style="--d:' + depth + '"' + (current && current.id === p.id ? ' aria-current="page"' : '') + '>' + esc(p.title) + '</a>';
    });
    return h;
  }
  function renderNav() {
    if (!root) return;
    if (query) {
      var q = query.toLowerCase();
      var hits = ordered.filter(function (p) { return (p.title + ' ' + p.path + ' ' + p.tags.join(' ') + ' ' + p.excerpt).toLowerCase().indexOf(q) !== -1; });
      navEl.innerHTML = hits.length
        ? '<span class="hint">' + hits.length + ' result' + (hits.length === 1 ? '' : 's') + '</span>' +
          hits.map(function (p) { return '<a class="hit" href="#' + p.id + '">' + esc(p.title) + '<small>' + esc(p.path) + '</small></a>'; }).join('')
        : '<span class="hint">No notes match “' + esc(query) + '”.</span>';
      return;
    }
    navEl.innerHTML = treeHtml(root, 0);
  }

  /* ---------- views ---------- */
  function homeView() {
    if (!ordered.length) {
      mainEl.innerHTML = '<div class="page"><h1 class="title">' + esc(BASE_TITLE) + '</h1><p class="state">No notes yet. Add a .md file inside the content folder and push it.</p></div>';
      return;
    }
    var tiles = '';
    root.kids.forEach(function (k) {
      var fp = firstPost(k), subs = '';
      k.kids.forEach(function (s) { subs += '<li>' + esc(s.name) + ' · ' + count(s) + '</li>'; });
      if (k.posts.length) subs += '<li>Loose notes · ' + k.posts.length + '</li>';
      tiles += '<a class="tile" href="#' + (fp ? fp.id : 'home') + '"><h3>' + esc(k.name) + '</h3><span class="n">' + count(k) + ' notes</span><ul>' + subs + '</ul></a>';
    });
    var byDate = ordered.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var recent = byDate.slice(0, 6).map(function (p) {
      return '<li><a href="#' + p.id + '"><span class="rd">' + fmtDate(p.date) + '</span><span class="rt">' + esc(p.title) + '<span class="rp">' + esc(p.path) + '</span></span></a></li>';
    }).join('');
    function lines(node, prefix) {
      var kids = Array.from(node.kids.values()), out = [];
      kids.forEach(function (k, i) {
        var last = i === kids.length - 1;
        out.push(prefix + (last ? '└── ' : '├── ') + '<span class="tf">' + esc(k.name) + '/</span> <span class="tc">' + count(k) + '</span>');
        out = out.concat(lines(k, prefix + (last ? '    ' : '│   ')));
      });
      return out;
    }
    var start = ordered[0], newest = byDate[0];
    mainEl.innerHTML =
      '<div class="home"><section class="hero"><div>' +
      '<div class="eyebrow">AI · DevOps · Software Engineering</div>' +
      '<h1 class="hero-title">' + esc(BASE_TITLE) + '</h1>' +
      '<p class="home-lead">Clear, practical lessons on how things work, how to run them, and how to fix them when they break.</p>' +
      '<div class="hero-cta"><a class="btn" href="#' + start.id + '">Start reading</a><a class="btn alt" href="#' + newest.id + '">Newest note</a></div></div>' +
      '<div class="tree-card" aria-hidden="true"><div class="tree-head">notebook/</div><pre>' + lines(root, '').join('\n') + '</pre></div></section>' +
      '<h2 class="section-label">Browse by topic</h2><div class="map">' + tiles + '</div>' +
      '<h2 class="section-label">Recently added</h2><ul class="recent">' + recent + '</ul></div>';
  }

  function loadBody(p) {
    if (cache[p.id] !== undefined) return Promise.resolve(cache[p.id]);
    return fetch('content/' + encPath(p.file)).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (t) {
      cache[p.id] = t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
      return cache[p.id];
    });
  }

  function postView(p) {
    var idx = ordered.indexOf(p), prev = ordered[idx - 1], next = ordered[idx + 1];
    var crumbs = p.folders.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('<i>/</i>');
    mainEl.innerHTML =
      '<article class="page"><div class="crumbs">' + crumbs + '</div>' +
      '<h1 class="title">' + esc(p.title) + '</h1>' +
      '<div class="meta"><span>' + fmtDate(p.date) + '</span><span>' + p.mins + ' min read</span>' +
      p.tags.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="prose" id="prose"><p class="state">Loading…</p></div>' +
      '<nav class="pager" aria-label="More notes">' +
      (prev ? '<a href="#' + prev.id + '"><small>Previous</small><span>' + esc(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a class="next" href="#' + next.id + '"><small>Next</small><span>' + esc(next.title) + '</span></a>' : '') +
      '</nav></article>';
    loadBody(p).then(function (text) {
      if (current !== p) return;
      document.getElementById('prose').innerHTML = md(text, { title: p.title, dir: p.dir, base: 'content/' + (p.dir ? encPath(p.dir) + '/' : '') });
    }, function () {
      if (current !== p) return;
      document.getElementById('prose').innerHTML = '<p class="state">Couldn’t load this note. Check that ' + esc(p.file) + ' exists in the content folder.</p>';
    });
  }

  function route() {
    var p = byId.get(location.hash.slice(1)) || null;
    current = p;
    if (p) {
      var key = '';
      p.folders.forEach(function (f) { key += '/' + f; open.add(key); });
      postView(p);
      document.title = p.title + ' · ' + BASE_TITLE;
    } else {
      homeView();
      document.title = BASE_TITLE;
    }
    renderNav();
    setNav(false);
    window.scrollTo(0, 0);
  }

  /* ---------- drawer + theme (no data needed) ---------- */
  var menuBtn = document.getElementById('menuBtn');
  function setNav(on) {
    document.body.classList.toggle('nav-open', on);
    menuBtn.setAttribute('aria-expanded', String(on));
  }
  menuBtn.addEventListener('click', function () { setNav(!document.body.classList.contains('nav-open')); });
  document.getElementById('scrim').addEventListener('click', function () { setNav(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  var themeBtn = document.getElementById('themeBtn');
  var isDark = function () {
    var t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  var syncTheme = function () { themeBtn.textContent = isDark() ? 'Light mode' : 'Dark mode'; };
  try { var saved = localStorage.getItem('nb-theme'); if (saved) document.documentElement.setAttribute('data-theme', saved); } catch (e) {}
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('nb-theme', next); } catch (e) {}
    syncTheme();
  });
  syncTheme();

  /* ---------- start ---------- */
  function start(list) {
    list.forEach(function (p) { p.path = p.folders.join(' / '); byFile[p.file] = p; });
    root = { name: '', key: '', kids: new Map(), posts: [] };
    list.forEach(function (p) {
      var node = root, key = '';
      p.folders.forEach(function (f) {
        key += '/' + f;
        if (!node.kids.has(f)) node.kids.set(f, { name: f, key: key, kids: new Map(), posts: [] });
        node = node.kids.get(f);
      });
      node.posts.push(p);
    });
    (function walk(n) { n.kids.forEach(walk); n.posts.forEach(function (p) { ordered.push(p); }); })(root);
    byId = new Map(ordered.map(function (p) { return [p.id, p]; }));
    root.kids.forEach(function (k) { open.add(k.key); });

    navEl.addEventListener('click', function (e) {
      var b = e.target.closest('.fbtn');
      if (!b) return;
      var k = b.getAttribute('data-key');
      if (open.has(k)) open.delete(k); else open.add(k);
      renderNav();
    });
    document.getElementById('q').addEventListener('input', function (e) { query = e.target.value.trim(); renderNav(); });
    window.addEventListener('hashchange', route);
    mainEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]');
      if (!b) return;
      var code = b.closest('.code').querySelector('code');
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(code);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        b.textContent = 'Press Ctrl+C'; setTimeout(function () { b.textContent = 'Copy'; }, 2000);
      };
      try { navigator.clipboard.writeText(code.textContent).then(done, fallback); } catch (err) { fallback(); }
    });
    document.getElementById('count').textContent = ordered.length + (ordered.length === 1 ? ' note' : ' notes');
    route();
  }

  fetch('posts.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(start, function () {
      mainEl.innerHTML = '<div class="page"><h1 class="title">Can’t load the notes</h1>' +
        '<p class="state">posts.json was not found. On GitHub Pages this file is created by the deploy workflow. ' +
        'To preview on your computer, run "node build.mjs" and then serve the dist folder (for example "npx serve dist"). ' +
        'Opening index.html directly from disk will not work.</p></div>';
    });
})();
