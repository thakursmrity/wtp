// Private inbox. All message text is shown with textContent, never as HTML.
(function () {
  var $ = function (id) { return document.getElementById(id); };

  var TYPES = {
    product: 'Suggest a product',
    call: 'Offer a chat',
    question: 'Interview question',
    hi: 'Just saying hi'
  };

  var state = { messages: [], filter: 'unread', type: 'all', open: {} };

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        return { status: r.status, body: body };
      });
    });
  }

  function show(which) {
    ['loading', 'login', 'setup', 'inbox'].forEach(function (id) { $(id).hidden = id !== which; });
    $('logout').hidden = which !== 'inbox';
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function isUnread(m) { return !m.read && !m.archived; }

  function counts() {
    var c = { unread: 0, all: 0, archived: 0 };
    state.messages.forEach(function (m) {
      if (m.archived) c.archived++;
      else { c.all++; if (!m.read) c.unread++; }
    });
    return c;
  }

  function visible() {
    return state.messages.filter(function (m) {
      if (state.type !== 'all' && m.type !== state.type) return false;
      if (state.filter === 'archived') return m.archived;
      if (m.archived) return false;
      if (state.filter === 'unread') return !m.read || state.open[m.id];
      return true;
    });
  }

  function replace(m) {
    for (var i = 0; i < state.messages.length; i++) {
      if (state.messages[i].id === m.id) { state.messages[i] = m; return; }
    }
  }

  function patch(id, change) {
    change.id = id;
    return api('/api/messages', { method: 'PATCH', body: JSON.stringify(change) }).then(function (r) {
      if (r.status === 401) { show('login'); return null; }
      if (r.status !== 200) { $('status').textContent = r.body.error || 'That did not save. Please try again.'; return null; }
      replace(r.body.message);
      return r.body.message;
    });
  }

  function renderFilters() {
    var c = counts();
    var box = $('filters');
    box.textContent = '';
    [['unread', 'Unread'], ['all', 'All'], ['archived', 'Archived']].forEach(function (f) {
      var b = el('button', '', f[1] + ' (' + c[f[0]] + ')');
      b.type = 'button';
      b.setAttribute('aria-pressed', state.filter === f[0] ? 'true' : 'false');
      b.addEventListener('click', function () { state.filter = f[0]; state.open = {}; render(); });
      box.appendChild(b);
    });
    document.title = (c.unread ? '(' + c.unread + ') ' : '') + 'Inbox: Why That Product';
  }

  function card(m) {
    var d = el('details', 'msg' + (isUnread(m) ? ' is-unread' : ''));
    d.dataset.id = m.id;
    if (state.open[m.id]) d.open = true;

    var s = el('summary');
    var top = el('div', 'msg-top');
    top.appendChild(el('span', 'tag tag-' + m.type, TYPES[m.type] || 'Message'));
    top.appendChild(el('span', 'who', m.name || m.email));
    top.appendChild(el('span', 'when', new Date(m.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })));
    s.appendChild(top);
    s.appendChild(el('p', 'preview', m.message));
    d.appendChild(s);

    var body = el('div', 'msg-body');
    body.appendChild(el('p', 'msg-text', m.message));
    var from = el('p', 'msg-email');
    from.appendChild(document.createTextNode(m.name ? m.name + ', ' : ''));
    from.appendChild(document.createTextNode(m.email));
    body.appendChild(from);

    var actions = el('div', 'msg-actions');
    var reply = el('a', 'btn btn-gold sm', 'Reply by email');
    reply.href = 'mailto:' + encodeURIComponent(m.email).replace(/%40/g, '@') + '?subject=' + encodeURIComponent('Re: ' + (TYPES[m.type] || 'Your message') + ' on Why That Product');
    actions.appendChild(reply);

    var readBtn = el('button', 'btn btn-line sm', m.read ? 'Mark unread' : 'Mark read');
    readBtn.type = 'button';
    readBtn.addEventListener('click', function () { patch(m.id, { read: !m.read }).then(function () { render(); }); });
    actions.appendChild(readBtn);

    var archBtn = el('button', 'btn btn-line sm', m.archived ? 'Move to inbox' : 'Archive');
    archBtn.type = 'button';
    archBtn.addEventListener('click', function () {
      delete state.open[m.id];
      patch(m.id, { archived: !m.archived, read: true }).then(function () { render(); });
    });
    actions.appendChild(archBtn);

    var delBtn = el('button', 'btn btn-line sm', 'Delete');
    delBtn.type = 'button';
    delBtn.addEventListener('click', function () {
      if (!window.confirm('Delete this message for good? This cannot be undone.')) return;
      api('/api/messages?id=' + encodeURIComponent(m.id), { method: 'DELETE' }).then(function (r) {
        if (r.status === 401) { show('login'); return; }
        if (r.status !== 200) { $('status').textContent = r.body.error || 'That did not delete. Please try again.'; return; }
        state.messages = state.messages.filter(function (x) { return x.id !== m.id; });
        delete state.open[m.id];
        render();
      });
    });
    actions.appendChild(delBtn);
    body.appendChild(actions);

    var noteWrap = el('div', 'msg-note');
    var lbl = el('label', '', 'Private note');
    var noteId = 'note-' + m.id;
    lbl.setAttribute('for', noteId);
    var ta = document.createElement('textarea');
    ta.id = noteId;
    ta.maxLength = 2000;
    ta.value = m.note || '';
    var saved = el('p', 'saved');
    ta.addEventListener('change', function () {
      patch(m.id, { note: ta.value }).then(function (r) { saved.textContent = r ? 'Saved' : ''; });
    });
    noteWrap.appendChild(lbl);
    noteWrap.appendChild(ta);
    noteWrap.appendChild(saved);
    body.appendChild(noteWrap);
    d.appendChild(body);

    d.addEventListener('toggle', function () {
      if (d.open) {
        state.open[m.id] = true;
        if (!m.read) {
          patch(m.id, { read: true }).then(function () { render(); });
        }
      } else {
        delete state.open[m.id];
      }
    });
    return d;
  }

  function render() {
    renderFilters();
    var list = $('list');
    list.textContent = '';
    var items = visible();
    items.forEach(function (m) { list.appendChild(card(m)); });
    var empty = $('empty');
    if (items.length) { empty.hidden = true; return; }
    empty.hidden = false;
    if (state.messages.length === 0) empty.textContent = 'Nothing here yet. Messages from the Connect page will show up here.';
    else if (state.filter === 'unread') empty.textContent = 'All caught up.';
    else if (state.filter === 'archived') empty.textContent = 'Nothing archived.';
    else empty.textContent = 'No messages match this filter.';
  }

  function load(quiet) {
    if (!quiet) $('status').textContent = '';
    return api('/api/messages').then(function (r) {
      if (r.status === 401) { show('login'); return; }
      if (r.status === 503) { $('setup-msg').textContent = r.body.error; show('setup'); return; }
      if (r.status !== 200) { $('setup-msg').textContent = r.body.error || 'Something went wrong. Please refresh the page.'; show('setup'); return; }
      state.messages = r.body.messages || [];
      show('inbox');
      render();
      $('status').textContent = quiet ? '' : '';
    }).catch(function () {
      $('setup-msg').textContent = 'Could not reach the server. The inbox only works on the deployed site, not from a file on your computer.';
      show('setup');
    });
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('login-error');
    var btn = $('login-btn');
    err.hidden = true;
    btn.disabled = true;
    api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('pw').value }) }).then(function (r) {
      btn.disabled = false;
      if (r.status === 200) { $('pw').value = ''; load(); return; }
      err.textContent = r.body.error || 'That did not work. Please try again.';
      err.hidden = false;
    }).catch(function () {
      btn.disabled = false;
      err.textContent = 'Could not reach the server. Please try again.';
      err.hidden = false;
    });
  });

  $('logout').addEventListener('click', function () {
    api('/api/logout', { method: 'POST', body: '{}' }).then(function () {
      state.messages = [];
      show('login');
    });
  });

  $('refresh').addEventListener('click', function () { load(); });
  $('type-filter').addEventListener('change', function (e) { state.type = e.target.value; render(); });

  // Pick up new messages without a reload, but never while you are typing a note.
  setInterval(function () {
    if (document.hidden || $('inbox').hidden) return;
    var a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) return;
    load(true);
  }, 60000);

  load();
})();
