/**
 * Evoo AI OS — All-in-One
 * Główny silnik aplikacji (nawigacja, czat, integracja modułów)
 */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ---------- State ----------
  let currentModule = 'launcher';
  let chatBusy = false;
  const chatHistory = [];

  // ---------- UI helpers ----------
  function toast(msg, ms = 2400) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, ms);
  }

  function setStatus(text, type = '') {
    const el = $('#status');
    el.className = 'status ' + type;
    el.querySelector('span').textContent = text;
  }

  function setTitle(t) {
    $('#topbarTitle').textContent = t;
  }

  // ---------- Navigation ----------
  function go(module) {
    if (!module) return;
    currentModule = module;

    $$('.module').forEach(m => m.classList.remove('active'));
    const target = $('#' + module);
    if (target) target.classList.add('active');

    $$('.nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.module === module);
    });

    const titles = {
      launcher: 'Evoo AI OS',
      chat: 'Czat AI',
      vault: 'Vault',
      gemini: 'Gemini Deep',
      pipi: 'Pipi',
      aurora: 'Aurora'
    };
    setTitle(titles[module] || 'Evoo AI OS');

    // close mobile sidebar
    $('#sidebar').classList.remove('open');
    $('#overlay').classList.remove('show');

    // focus chat input
    if (module === 'chat') {
      setTimeout(() => $('#chatInput')?.focus(), 100);
    }
  }

  // ---------- Sidebar / mobile ----------
  function initNav() {
    $$('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => go(btn.dataset.module));
    });
    $$('[data-go]').forEach(el => {
      el.addEventListener('click', () => go(el.dataset.go));
    });
    $('#logoBtn')?.addEventListener('click', () => go('launcher'));
    $('#menuBtn')?.addEventListener('click', () => {
      $('#sidebar').classList.add('open');
      $('#overlay').classList.add('show');
    });
    $('#sidebarClose')?.addEventListener('click', () => {
      $('#sidebar').classList.remove('open');
      $('#overlay').classList.remove('show');
    });
    $('#overlay')?.addEventListener('click', () => {
      $('#sidebar').classList.remove('open');
      $('#overlay').classList.remove('show');
    });
  }

  // ---------- Chat ----------
  function appendMsg(role, text, streaming = false) {
    const box = $('#chatMessages');
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = `
      <div class="msg-avatar">${role === 'user' ? 'M' : '✦'}</div>
      <div class="msg-body">
        <div class="msg-name">${role === 'user' ? 'Ty' : 'Evoo'}</div>
        <div class="msg-text${streaming ? ' streaming' : ''}">${escapeHtml(text)}</div>
      </div>
    `;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div.querySelector('.msg-text');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function sendChat() {
    const input = $('#chatInput');
    const text = (input.value || '').trim();
    if (!text || chatBusy) return;

    chatBusy = true;
    $('#sendBtn').disabled = true;
    input.value = '';
    autoResize(input);

    appendMsg('user', text);
    chatHistory.push({ role: 'user', content: text });

    const model = $('#modelSelect').value || 'auto';
    setStatus('Myślę…', 'wait');

    const replyEl = appendMsg('assistant', '', true);

    try {
      // Próba połączenia z backendem Convex / proxy
      const apiBase = (window.EVOO_CONFIG && window.EVOO_CONFIG.api) || '';
      let reply = null;

      if (apiBase) {
        try {
          const res = await fetch(apiBase + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: chatHistory.slice(-12),
              model,
              stream: false
            })
          });
          if (res.ok) {
            const data = await res.json();
            reply = data.reply || data.content || data.text || data.message;
          }
        } catch (_) {
          // fallback poniżej
        }
      }

      // Fallback: inteligentna odpowiedź lokalna (demo)
      if (!reply) {
        reply = localReply(text, model);
      }

      // symulacja streamingu
      replyEl.classList.remove('streaming');
      let i = 0;
      const step = () => {
        if (i <= reply.length) {
          replyEl.textContent = reply.slice(0, i);
          i += 2 + Math.floor(Math.random() * 3);
          $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
          requestAnimationFrame(step);
        } else {
          replyEl.textContent = reply;
          chatHistory.push({ role: 'assistant', content: reply });
          setStatus('Gotowy');
          chatBusy = false;
          $('#sendBtn').disabled = false;
        }
      };
      step();
    } catch (err) {
      replyEl.classList.remove('streaming');
      replyEl.textContent = 'Wystąpił błąd: ' + (err.message || err);
      setStatus('Błąd', 'err');
      chatBusy = false;
      $('#sendBtn').disabled = false;
    }
  }

  function localReply(text, model) {
    const t = text.toLowerCase();
    if (t.includes('cześć') || t.includes('hej') || t.includes('siema')) {
      return 'Cześć! Jestem Evoo — Twój zintegrowany asystent AI OS. Mogę pomóc z czatem, hasłami (Vault), planami (Pipi) i więcej. Co robimy?';
    }
    if (t.includes('vault') || t.includes('hasło') || t.includes('hasla')) {
      return 'Vault to lokalny, szyfrowany menadżer haseł (AES-GCM). Przejdź do modułu 🔐 Vault z menu bocznego, odblokuj hasłem głównym i dodawaj wpisy. Nic nie wychodzi poza Twoje urządzenie.';
    }
    if (t.includes('pipi')) {
      return 'Pipi to asystent planów dnia. Wejdź w moduł 🚀 Pipi, zaznaczaj zadania i dodawaj nowe. W pełnej wersji integruje się ze skillami Evoo (nieruchomości, social, eBook).';
    }
    if (t.includes('aurora')) {
      return 'Aurora to zaawansowany agent z pamięcią, awareness, schedulerem i integracją głosową/Telegram. Moduł 🌌 Aurora pokazuje status i możliwości. Pełny backend jest w osobnym repozytorium Python.';
    }
    if (t.includes('model') || t.includes('provider')) {
      return `Aktualnie wybrany model: ${model}. Router obsługuje m.in. Gemini, Groq, Cerebras, Mistral, DeepSeek i xAI. W trybie Auto system wybiera najlepszy dostępny.`;
    }
    if (t.includes('pomoc') || t.includes('help') || t.includes('co potrafisz')) {
      return 'Potrafię:\n• Prowadzić rozmowę (Czat AI)\n• Bezpiecznie przechowywać hasła (Vault)\n• Pomagać w planowaniu (Pipi)\n• Łączyć się z Gemini i Aurora\n\nUżyj menu bocznego, żeby przełączać moduły.';
    }
    // domyślna
    return `Rozumiem: „${text.slice(0, 120)}${text.length > 120 ? '…' : ''}”.\n\nW tej wersji All-in-One działam lokalnie + z Twoim backendem Convex (jeśli dostępny). Wybierz model z listy powyżej lub przełącz moduł. Co chcesz zrobić dalej?`;
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  function initChat() {
    const input = $('#chatInput');
    const btn = $('#sendBtn');
    input?.addEventListener('input', () => autoResize(input));
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
    btn?.addEventListener('click', sendChat);
  }

  // ---------- Vault UI ----------
  function initVault() {
    const lockScreen = $('#vaultLock');
    const mainScreen = $('#vaultMain');
    const unlockForm = $('#vaultUnlockForm');
    const vaultForm = $('#vaultForm');
    const listEl = $('#vaultList');
    const countEl = $('#vaultCount');

    async function refreshList() {
      const items = await Vault.list();
      countEl.textContent = items.length;
      listEl.innerHTML = '';
      if (items.length === 0) {
        listEl.innerHTML = '<li style="color:var(--text2);font-size:.9rem;padding:12px 0">Brak zapisanych wpisów.</li>';
        return;
      }
      for (const item of items) {
        const li = document.createElement('li');
        li.className = 'vault-item';
        li.innerHTML = `
          <div class="vault-item-info">
            <div class="vault-item-name">${escapeHtml(item.name)}</div>
            <div class="vault-item-user">${escapeHtml(item.user)}</div>
          </div>
          <div class="vault-item-actions">
            <button type="button" data-copy="${item.id}">Kopiuj</button>
            <button type="button" class="del" data-del="${item.id}">Usuń</button>
          </div>
        `;
        listEl.appendChild(li);
      }

      listEl.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const pass = await Vault.getPassword(btn.dataset.copy);
          if (pass) {
            await navigator.clipboard.writeText(pass);
            toast('Hasło skopiowane do schowka');
          }
        });
      });
      listEl.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Na pewno usunąć ten wpis?')) return;
          await Vault.remove(btn.dataset.del);
          await refreshList();
          toast('Wpis usunięty');
        });
      });
    }

    unlockForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const pass = $('#masterPass').value;
      if (!pass) return;
      try {
        setStatus('Odblokowuję…', 'wait');
        await Vault.unlock(pass);
        lockScreen.hidden = true;
        mainScreen.hidden = false;
        await refreshList();
        setStatus('Vault odblokowany');
        toast('Vault odblokowany');
        $('#masterPass').value = '';
      } catch (err) {
        setStatus('Błąd', 'err');
        toast(err.message || 'Nie udało się odblokować');
      }
    });

    $('#vaultLockBtn')?.addEventListener('click', () => {
      Vault.lock();
      mainScreen.hidden = true;
      lockScreen.hidden = false;
      setStatus('Vault zablokowany');
      toast('Vault zablokowany');
    });

    vaultForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('#vaultName').value.trim();
      const user = $('#vaultUser').value.trim();
      const pass = $('#vaultPass').value;
      const notes = $('#vaultNotes').value.trim();
      if (!name || !user || !pass) return;
      try {
        await Vault.save({ name, user, pass, notes });
        vaultForm.reset();
        await refreshList();
        toast('Zapisano i zaszyfrowano');
      } catch (err) {
        toast(err.message || 'Błąd zapisu');
      }
    });
  }

  // ---------- Pipi ----------
  function initPipi() {
    const form = $('#pipiAddForm');
    const list = $('#pipiTasks');
    form?.addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#pipiNewTask');
      const text = (input.value || '').trim();
      if (!text) return;
      const id = 't' + Date.now();
      const div = document.createElement('div');
      div.className = 'task';
      div.innerHTML = `
        <input type="checkbox" id="${id}">
        <label for="${id}">${escapeHtml(text)}</label>
      `;
      list.appendChild(div);
      input.value = '';
      toast('Dodano zadanie');
    });
  }

  // ---------- Boot ----------
  function boot() {
    initNav();
    initChat();
    initVault();
    initPipi();
    setStatus('Gotowy');
    go('launcher');
    console.log('%c✦ Evoo AI OS All-in-One ready', 'color:#5b8cff;font-weight:bold');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
