// FastCRM Chat Widget Embed Script
(function() {
  'use strict';

  // Configuration passed by init
  var config = null;

  // Widget container
  var container = null;

  // Prevent multiple initializations
  if (window.FastCRMWidget && window.FastCRMWidget.initialized) {
    console.warn('[FastCRM Widget] Already initialized');
    return;
  }

  window.FastCRMWidget = {
    initialized: false,
    
    init: function(options) {
      if (this.initialized) {
        console.warn('[FastCRM Widget] Already initialized');
        return;
      }

      if (!options.widgetId || !options.supabaseUrl) {
        console.error('[FastCRM Widget] widgetId and supabaseUrl are required');
        return;
      }

      config = options;
      this.initialized = true;

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
      } else {
        createWidget();
      }
    },

    open: function() {
      if (container) {
        container.querySelector('.fastcrm-widget-window').style.display = 'flex';
        container.querySelector('.fastcrm-widget-bubble').style.display = 'none';
      }
    },

    close: function() {
      if (container) {
        container.querySelector('.fastcrm-widget-window').style.display = 'none';
        container.querySelector('.fastcrm-widget-bubble').style.display = 'flex';
      }
    },

    destroy: function() {
      if (container) {
        container.remove();
        container = null;
        this.initialized = false;
      }
    }
  };

  // State
  var state = {
    isOpen: false,
    isLoading: true,
    isSending: false,
    messages: [],
    conversationId: null,
    widgetConfig: null,
    visitorId: getVisitorId()
  };

  function getVisitorId() {
    var key = 'fastcrm_visitor_id';
    var visitorId = localStorage.getItem(key);
    if (!visitorId) {
      visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(key, visitorId);
    }
    return visitorId;
  }

  async function apiCall(action, data) {
    var response = await fetch(config.supabaseUrl + '/functions/v1/chat-widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action,
        widgetId: config.widgetId,
        visitorId: state.visitorId,
        ...data
      })
    });
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    return response.json();
  }

  async function fetchConfig() {
    try {
      var data = await apiCall('get_config');
      state.widgetConfig = data.config;
      applyStyles();
      
      // Auto-open after delay if configured
      if (state.widgetConfig.auto_open_delay_ms > 0) {
        setTimeout(function() {
          openWidget();
        }, state.widgetConfig.auto_open_delay_ms);
      }
    } catch (err) {
      console.error('[FastCRM Widget] Failed to load config:', err);
    } finally {
      state.isLoading = false;
      render();
    }
  }

  async function initConversation() {
    if (state.conversationId) return;
    
    state.isLoading = true;
    render();
    
    try {
      var data = await apiCall('init');
      state.conversationId = data.conversationId;
      state.messages = data.messages || [];
    } catch (err) {
      console.error('[FastCRM Widget] Failed to init conversation:', err);
    } finally {
      state.isLoading = false;
      render();
      scrollToBottom();
    }
  }

  async function sendMessage(message) {
    if (!message.trim() || !state.conversationId || state.isSending) return;
    
    // Add user message immediately
    state.messages.push({
      id: 'temp_' + Date.now(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    });
    state.isSending = true;
    render();
    scrollToBottom();
    
    try {
      var data = await apiCall('send_message', {
        conversationId: state.conversationId,
        message: message
      });
      
      if (data.message) {
        state.messages.push(data.message);
      }
    } catch (err) {
      console.error('[FastCRM Widget] Failed to send message:', err);
      state.messages.push({
        id: 'error_' + Date.now(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        created_at: new Date().toISOString()
      });
    } finally {
      state.isSending = false;
      render();
      scrollToBottom();
    }
  }

  function openWidget() {
    state.isOpen = true;
    render();
    if (!state.conversationId) {
      initConversation();
    }
  }

  function closeWidget() {
    state.isOpen = false;
    render();
  }

  function scrollToBottom() {
    setTimeout(function() {
      var messagesContainer = container.querySelector('.fastcrm-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 50);
  }

  function applyStyles() {
    var wc = state.widgetConfig;
    if (!wc) return;

    var style = document.createElement('style');
    style.id = 'fastcrm-widget-styles';
    style.textContent = `
      .fastcrm-widget-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        position: fixed;
        bottom: 16px;
        ${wc.position === 'bottom-left' ? 'left: 16px;' : 'right: 16px;'}
        z-index: 999999;
      }
      
      .fastcrm-widget-bubble {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background-color: ${wc.primary_color};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .fastcrm-widget-bubble:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }
      
      .fastcrm-widget-bubble svg {
        width: 24px;
        height: 24px;
        color: white;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
      }
      
      .fastcrm-widget-window {
        display: none;
        flex-direction: column;
        width: 360px;
        height: 500px;
        background-color: ${wc.secondary_color};
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        overflow: hidden;
      }
      
      .fastcrm-widget-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background-color: ${wc.primary_color};
        color: white;
      }
      
      .fastcrm-widget-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .fastcrm-widget-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      
      .fastcrm-widget-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .fastcrm-widget-avatar svg {
        width: 20px;
        height: 20px;
        color: white;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
      }
      
      .fastcrm-widget-title {
        font-weight: 600;
        font-size: 15px;
      }
      
      .fastcrm-widget-status {
        font-size: 12px;
        opacity: 0.8;
      }
      
      .fastcrm-widget-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .fastcrm-widget-close:hover {
        background-color: rgba(255,255,255,0.2);
      }
      
      .fastcrm-widget-close svg {
        width: 20px;
        height: 20px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
      }
      
      .fastcrm-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .fastcrm-message {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 16px;
        word-break: break-word;
      }
      
      .fastcrm-message-user {
        align-self: flex-end;
        background-color: ${wc.primary_color};
        color: white;
        border-bottom-right-radius: 4px;
      }
      
      .fastcrm-message-assistant {
        align-self: flex-start;
        background-color: white;
        color: ${wc.text_color};
        border-bottom-left-radius: 4px;
      }
      
      .fastcrm-typing {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background-color: white;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        color: #888;
        font-size: 13px;
      }
      
      .fastcrm-typing-dots {
        display: flex;
        gap: 3px;
      }
      
      .fastcrm-typing-dots span {
        width: 6px;
        height: 6px;
        background-color: #888;
        border-radius: 50%;
        animation: fastcrm-bounce 1.4s infinite ease-in-out both;
      }
      
      .fastcrm-typing-dots span:nth-child(1) { animation-delay: -0.32s; }
      .fastcrm-typing-dots span:nth-child(2) { animation-delay: -0.16s; }
      
      @keyframes fastcrm-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      .fastcrm-input-container {
        padding: 12px;
        background-color: white;
        border-top: 1px solid #e5e7eb;
      }
      
      .fastcrm-input-wrapper {
        display: flex;
        gap: 8px;
      }
      
      .fastcrm-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #e5e7eb;
        border-radius: 24px;
        outline: none;
        font-size: 14px;
        color: ${wc.text_color};
      }
      
      .fastcrm-input:focus {
        border-color: ${wc.primary_color};
      }
      
      .fastcrm-send-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: ${wc.primary_color};
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s;
      }
      
      .fastcrm-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .fastcrm-send-btn svg {
        width: 18px;
        height: 18px;
        color: white;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
      }
      
      .fastcrm-branding {
        text-align: center;
        padding: 8px;
        font-size: 11px;
        color: #888;
      }
      
      .fastcrm-branding a {
        color: inherit;
        text-decoration: none;
        font-weight: 500;
      }
      
      .fastcrm-loader {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
      
      .fastcrm-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid #e5e7eb;
        border-top-color: ${wc.primary_color};
        border-radius: 50%;
        animation: fastcrm-spin 0.8s linear infinite;
      }
      
      @keyframes fastcrm-spin {
        to { transform: rotate(360deg); }
      }
      
      ${wc.custom_css || ''}
    `;
    
    // Remove existing styles
    var existing = document.getElementById('fastcrm-widget-styles');
    if (existing) existing.remove();
    
    document.head.appendChild(style);
  }

  function createWidget() {
    container = document.createElement('div');
    container.className = 'fastcrm-widget-container';
    document.body.appendChild(container);
    
    fetchConfig();
  }

  function render() {
    if (!container || !state.widgetConfig) return;
    
    var wc = state.widgetConfig;
    
    container.innerHTML = `
      <div class="fastcrm-widget-bubble" style="display: ${state.isOpen ? 'none' : 'flex'}">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </div>
      
      <div class="fastcrm-widget-window" style="display: ${state.isOpen ? 'flex' : 'none'}">
        <div class="fastcrm-widget-header">
          <div class="fastcrm-widget-header-info">
            <div class="fastcrm-widget-avatar">
              ${wc.avatar_url 
                ? '<img src="' + wc.avatar_url + '" alt="Avatar">' 
                : '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
              }
            </div>
            <div>
              <div class="fastcrm-widget-title">${wc.company_name || 'Assistente'}</div>
              <div class="fastcrm-widget-status">Online agora</div>
            </div>
          </div>
          <button class="fastcrm-widget-close" aria-label="Fechar">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div class="fastcrm-messages">
          ${state.isLoading && state.messages.length === 0 
            ? '<div class="fastcrm-loader"><div class="fastcrm-spinner"></div></div>'
            : state.messages.map(function(msg) {
                return '<div class="fastcrm-message fastcrm-message-' + msg.role + '">' + escapeHtml(msg.content) + '</div>';
              }).join('')
          }
          ${state.isSending 
            ? '<div class="fastcrm-typing"><div class="fastcrm-typing-dots"><span></span><span></span><span></span></div>A escrever...</div>'
            : ''
          }
        </div>
        
        <div class="fastcrm-input-container">
          <div class="fastcrm-input-wrapper">
            <input 
              type="text" 
              class="fastcrm-input" 
              placeholder="${wc.placeholder_text || 'Escreva a sua mensagem...'}"
              ${state.isSending ? 'disabled' : ''}
            >
            <button class="fastcrm-send-btn" ${state.isSending ? 'disabled' : ''} aria-label="Enviar">
              <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
          ${wc.show_branding ? '<div class="fastcrm-branding">Powered by <a href="https://fastcrm.lovable.app" target="_blank">FastCRM</a></div>' : ''}
        </div>
      </div>
    `;
    
    // Event listeners
    container.querySelector('.fastcrm-widget-bubble').addEventListener('click', openWidget);
    container.querySelector('.fastcrm-widget-close').addEventListener('click', closeWidget);
    
    var input = container.querySelector('.fastcrm-input');
    var sendBtn = container.querySelector('.fastcrm-send-btn');
    
    sendBtn.addEventListener('click', function() {
      sendMessage(input.value);
      input.value = '';
    });
    
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
        input.value = '';
      }
    });
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

})();
