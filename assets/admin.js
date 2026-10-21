// Private inbox. All message text is shown with textContent, never as HTML.
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var loginView = $('#login-view');
  var inboxView = $('#inbox-view');
  var list = $('#list');
  var statusEl = $('#admin-status');
  var messages = [];
  var tab = 'new';
  var kindFilter = 'all';

  var KIND = {
    product: 'Product to break down',
    discovery: 'Discovery chat',
    question: 'Interview question',
    other: 'Something else'
  };
  var STATUS = { new: 'New', read: 'Read', replied: 'Replied', archived: 'Archived' };

  function api(path, options) {
    options = options || {};
    var init = {
      method: options.method || 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    };
    if (options.body) init.body = JSON.stringify(options.body);
    return fetch(path, init).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function say(text, isError) {
    statusEl.textContent = text || '';
    statusEl.className = 'admin-status' + (isError ? ' is-error' : '');
  }

  function show(view) {
    loginView.hidden = view !== 'login';
    inboxView.hidden = view !== 'inbox';
    if (view === 'login') $('#password').focus();
  }

  function load() {
    return api('/api/admin/messages').then(function (r) {
      if (r.status === 401) { show('login'); return; }
      if (!r.ok) { show('inbox'); say((r.data && r.data.error) || 'Could not load messages.', true); return; }
      messages = r.data.messages;
      show('inbox');
      say('');
      render();
    }).catch(function () {
      show('inbox');
      say('Could not reach the server. Check your connection and refresh.', true);
    });
  }

  function inTab(m) {
    if (tab === 'new') return m.status === 'new';
    if (tab === 'archived') return m.status === 'archived';
    return m.status !== 'archived';
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, className, onClick) {
    var b = el('button', className, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function update(id, patch) {
    patch.id = id;
    return api('/api/admin/messages', { method: 'PATCH', body: patch }).then(function (r) {
      if (r.status === 401) { show('login'); return; }
      if (!r.ok) { say((r.data && r.data.error) || 'That did not save. Try again.', true); return; }
      messages = messages.map(function (m) { return m.id === id ? r.data.message : m; });
      say('');
      render();
    });
  }

  function remove(id) {
    if (!window.confirm('Delete this message for good? This cannot be undone.')) return;
    api('/api/admin/messages', { method: 'DELETE', body: { id: id } }).then(function (r) {
      if (!r.ok) { say((r.data && r.data.error) || 'Could not delete that message.', true); return; }
      messages = messages.filter(function (m) { return m.id !== id; });
      render();
    });
  }

  function gmailLink(m) {
    var subject = 'Re: Why That Product (' + KIND[m.kind] + ')';
    return 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(m.email) +
      '&su=' + encodeURIComponent(subject);
  }

  function card(m) {
    var box = el('article', 'msg sketch' + (m.status === 'new' ? ' is-new' : ''));

    var head = el('div', 'msg-head');
    head.appendChild(el('h3', '', m.name));
    head.appendChild(el('span', 'badge badge-' + m.kind, KIND[m.kind] || m.kind));
    head.appendChild(el('span', 'badge badge-status', STATUS[m.status] || m.status));
    head.appendChild(el('span', 'when', new Date(m.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })));
    box.appendChild(head);

    box.appendChild(el('p', 'msg-body', m.body));

    var actions = el('div', 'msg-actions');
    var reply = el('a', '', 'Reply in Gmail');
    reply.href = gmailLink(m);
    reply.target = '_blank';
    reply.rel = 'noopener noreferrer';
    actions.appendChild(reply);
    var copy = button('Copy ' + m.email, '', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(m.email).then(function () { say('Copied ' + m.email); });
    });
    actions.appendChild(copy);
    if (m.status === 'new') actions.appendChild(button('Mark read', '', function () { update(m.id, { status: 'read' }); }));
    if (m.status === 'read' || m.status === 'replied') actions.appendChild(button('Mark unread', '', function () { update(m.id, { status: 'new' }); }));
    if (m.status !== 'replied' && m.status !== 'archived') actions.appendChild(button('Mark replied', '', function () { update(m.id, { status: 'replied' }); }));
    if (m.status === 'archived') {
      actions.appendChild(button('Move to inbox', '', function () { update(m.id, { status: 'read' }); }));
    } else {
      actions.appendChild(button('Archive', '', function () { update(m.id, { status: 'archived' }); }));
    }
    actions.appendChild(button('Delete', 'danger', function () { remove(m.id); }));
    box.appendChild(actions);

    var note = el('div', 'msg-note');
    var label = el('label', '', 'Private note');
    var field = el('textarea');
    field.id = 'note-' + m.id;
    field.value = m.note || '';
    field.maxLength = 2000;
    label.setAttribute('for', field.id);
    note.appendChild(label);
    note.appendChild(field);
    note.appendChild(button('Save note', '', function () { update(m.id, { note: field.value }).then(function () { say('Note saved.'); }); }));
    box.appendChild(note);
    return box;
  }

  function render() {
    var counts = { new: 0, open: 0, archived: 0 };
    messages.forEach(function (m) {
      if (m.status === 'new') counts.new++;
      if (m.status === 'archived') counts.archived++; else counts.open++;
    });
    $('#count-new').textContent = counts.new;
    $('#count-open').textContent = counts.open;
    $('#count-archived').textContent = counts.archived;
    document.title = (counts.new ? '(' + counts.new + ') ' : '') + 'Inbox: Why That Product';

    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-tab') === tab ? 'true' : 'false');
    });

    list.textContent = '';
    var shown = messages.filter(function (m) { return inTab(m) && (kindFilter === 'all' || m.kind === kindFilter); });
    if (!shown.length) {
      var empty = el('div', 'empty sketch');
      empty.appendChild(el('h3', '', tab === 'new' ? 'Nothing new.' : 'Nothing here.'));
      empty.appendChild(el('p', '', 'When someone writes from the Connect page, their message shows up here.'));
      list.appendChild(empty);
      return;
    }
    shown.forEach(function (m) { list.appendChild(card(m)); });
  }

  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); render(); });
  });
  $('#kind-filter').addEventListener('change', function (e) { kindFilter = e.target.value; render(); });
  $('#refresh').addEventListener('click', function () { say('Refreshing...'); load().then(function () { say(''); }); });
  $('#signout').addEventListener('click', function () {
    api('/api/admin/logout', { method: 'POST', body: {} }).then(function () { messages = []; show('login'); });
  });

  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var status = $('#login-status');
    var submit = e.target.querySelector('button[type="submit"]');
    submit.disabled = true;
    status.textContent = '';
    status.className = 'form-status';
    api('/api/admin/login', { method: 'POST', body: { password: $('#password').value } }).then(function (r) {
      submit.disabled = false;
      if (!r.ok) {
        status.textContent = (r.data && r.data.error) || 'Could not sign in.';
        status.className = 'form-status is-error';
        return;
      }
      $('#password').value = '';
      load();
    }).catch(function () {
      submit.disabled = false;
      status.textContent = 'Could not reach the server.';
      status.className = 'form-status is-error';
    });
  });

  load();
})();
