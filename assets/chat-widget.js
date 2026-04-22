(function () {
  var ENDPOINT = '/.netlify/functions/chat';
  var GREETING = "Hey! I'm Danny's assistant at Peak Edge Roofing. Are you dealing with storm damage, need a replacement, or want a repair quote?";

  var messages = [];
  var isOpen = false;
  var isTyping = false;

  // --- Styles ---
  var style = document.createElement('style');
  style.textContent = [
    '#pec-bubble{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:#B5601E;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:9999;transition:transform .2s,box-shadow .2s}',
    '#pec-bubble:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(0,0,0,.4)}',
    '#pec-bubble svg{width:24px;height:24px;color:#fff;pointer-events:none}',
    '#pec-notif{position:absolute;top:-3px;right:-3px;width:14px;height:14px;background:#ef4444;border-radius:50%;border:2px solid #fff;display:none}',
    '#pec-window{position:fixed;bottom:92px;right:24px;width:340px;max-height:500px;background:#fff;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.18);display:flex;flex-direction:column;z-index:9998;overflow:hidden;opacity:0;transform:translateY(12px) scale(.97);transition:opacity .2s,transform .2s;pointer-events:none}',
    '#pec-window.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}',
    '#pec-header{background:#0F1C2E;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}',
    '#pec-avatar{width:36px;height:36px;background:#B5601E;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;font-family:sans-serif}',
    '#pec-info .pec-name{font-weight:600;font-size:14px;font-family:sans-serif}',
    '#pec-info .pec-status{font-size:11px;opacity:.7;margin-top:2px;font-family:sans-serif}',
    '#pec-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f8f7f5}',
    '.pec-msg{max-width:82%;padding:10px 13px;font-size:14px;line-height:1.5;word-break:break-word;font-family:sans-serif}',
    '.pec-msg.bot{background:#fff;color:#0F1C2E;align-self:flex-start;border:1px solid #e5e2db;border-radius:2px 12px 12px 12px}',
    '.pec-msg.user{background:#B5601E;color:#fff;align-self:flex-end;border-radius:12px 12px 2px 12px}',
    '#pec-typing{display:flex;gap:4px;align-items:center;padding:10px 13px;background:#fff;border:1px solid #e5e2db;border-radius:2px 12px 12px 12px;align-self:flex-start}',
    '#pec-typing span{width:7px;height:7px;background:#B5601E;border-radius:50%;animation:pec-bounce 1.2s infinite}',
    '#pec-typing span:nth-child(2){animation-delay:.2s}',
    '#pec-typing span:nth-child(3){animation-delay:.4s}',
    '@keyframes pec-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}',
    '#pec-input-wrap{padding:12px;background:#fff;border-top:1px solid #e5e2db;display:flex;gap:8px;flex-shrink:0}',
    '#pec-input{flex:1;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:14px;outline:none;font-family:sans-serif;transition:border-color .15s}',
    '#pec-input:focus{border-color:#B5601E}',
    '#pec-send{background:#B5601E;color:#fff;border:none;border-radius:8px;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0}',
    '#pec-send:hover{background:#9e5219}',
    '#pec-send:disabled{opacity:.5;cursor:not-allowed}',
    '@media(max-width:400px){#pec-window{right:12px;left:12px;width:auto;bottom:84px}#pec-bubble{right:16px;bottom:16px}}'
  ].join('');
  document.head.appendChild(style);

  // --- HTML ---
  var bubble = document.createElement('div');
  bubble.id = 'pec-bubble';
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    '<div id="pec-notif"></div>';

  var win = document.createElement('div');
  win.id = 'pec-window';
  win.innerHTML =
    '<div id="pec-header">' +
      '<div id="pec-avatar">PE</div>' +
      '<div id="pec-info"><div class="pec-name">Peak Edge Roofing</div><div class="pec-status">Usually replies in under a minute</div></div>' +
    '</div>' +
    '<div id="pec-msgs"></div>' +
    '<div id="pec-input-wrap">' +
      '<input id="pec-input" type="text" placeholder="Type a message..." autocomplete="off" />' +
      '<button id="pec-send">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
      '</button>' +
    '</div>';

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  var msgsEl = document.getElementById('pec-msgs');
  var input = document.getElementById('pec-input');
  var sendBtn = document.getElementById('pec-send');
  var notif = document.getElementById('pec-notif');

  function addMessage(text, role) {
    var el = document.createElement('div');
    el.className = 'pec-msg ' + role;
    el.textContent = text;
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.id = 'pec-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('pec-typing');
    if (el) el.remove();
  }

  function setInputEnabled(enabled) {
    input.disabled = !enabled;
    sendBtn.disabled = !enabled;
    if (enabled) input.focus();
  }

  async function sendMessage(text) {
    text = text.trim();
    if (!text || isTyping) return;

    addMessage(text, 'user');
    messages.push({ role: 'user', content: text });
    input.value = '';
    setInputEnabled(false);
    isTyping = true;
    showTyping();

    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages })
      });

      var data = await res.json();
      hideTyping();

      if (data.text) {
        addMessage(data.text, 'bot');
        messages.push({ role: 'assistant', content: data.text });
      }

      // Keep input disabled if lead captured — conversation is done
      if (!data.leadCaptured) {
        setInputEnabled(true);
      }

    } catch (err) {
      hideTyping();
      addMessage('Sorry, something went wrong. Please call us at (720) 441-8833.', 'bot');
      setInputEnabled(true);
    }

    isTyping = false;
  }

  function openChat() {
    isOpen = true;
    win.classList.add('open');
    notif.style.display = 'none';

    if (messages.length === 0) {
      setTimeout(function () {
        showTyping();
        setTimeout(function () {
          hideTyping();
          addMessage(GREETING, 'bot');
          messages.push({ role: 'assistant', content: GREETING });
          input.focus();
        }, 900);
      }, 150);
    } else {
      input.focus();
    }
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
  }

  bubble.addEventListener('click', function () {
    if (isOpen) closeChat(); else openChat();
  });

  sendBtn.addEventListener('click', function () { sendMessage(input.value); });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  // Show notification dot after 10s if chat hasn't been opened
  setTimeout(function () {
    if (!isOpen) notif.style.display = 'block';
  }, 10000);

})();
