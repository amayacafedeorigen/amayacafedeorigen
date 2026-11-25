/* Amaya Café de Origen - carrito, libro de recetas y botones */
(function () {
'use strict';

var TOTAL = 16;
var WA_NUMBER = '573126227503';
var PRODS = [
  { id: 'p500', name: 'Café Amaya 500 g', price: 30000, label: '500 gramos', priceText: '$30.000' },
  { id: 'p250', name: 'Café Amaya 250 g', price: 15000, label: '250 gramos', priceText: '$15.000' }
];

var state = {
  cartOpen: false, cart: {}, form: {}, draft: {}, buy: {},
  privOk: false, privOpen: false, payNotice: false, spread: 0
};

/* ---------- plantillas ---------- */
var TPL = {
  lines: function (line) { return `<div style="display: flex; flex-direction: column; gap: 12px; padding: 16px 0; border-bottom: 1px solid #3A5446">
<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px">
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
<div style="font-weight: 600; font-size: 18px">${line.name}</div>
<div style="font-size: 15px; color: #B9C7BE">${line.unit}</div>
</div>
<div style="flex: none; font-weight: 600; font-size: 18px; text-align: right; font-variant-numeric: tabular-nums">${line.total}</div>
</div>
<div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px">
<div style="display: flex; align-items: center; gap: 6px">
<button class="qty-btn" data-act="line-minus" data-id="${line.id}" aria-label="Quitar una unidad de ${line.name}">−</button>
<input id="q-${line.id}" class="qty-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" value="${line.qtyValue}" data-qty-line="${line.id}" aria-label="Cantidad de ${line.name}">
<button class="qty-btn" data-act="line-plus" data-id="${line.id}" aria-label="Agregar una unidad de ${line.name}">+</button>
</div>
<button class="cart-ghost" data-act="line-remove" data-id="${line.id}" aria-label="Quitar ${line.name} del carrito">Quitar</button>
</div>
</div>`; },
  buyCards: function (card) { return `<div class="price-card">
<div style="font-size: 15px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #B9C7BE">${card.label}</div>
<div style="font-family: 'Bricolage Grotesque', Inter, sans-serif; font-weight: 600; font-size: 40px">${card.price} <span style="font-family: Inter, sans-serif; font-size: 16px; font-weight: 500; color: #B9C7BE">COP</span></div>
<div class="buy-lab">¿Cuántas bolsas?</div>
<div class="buy-row">
<button class="qty-btn" data-act="buy-minus" data-id="${card.id}" aria-label="Una bolsa menos de ${card.label}">−</button>
<input id="buy-${card.id}" class="qty-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" value="${card.qtyValue}" data-qty-buy="${card.id}" aria-label="Cantidad de bolsas de ${card.label}">
<button class="qty-btn" data-act="buy-plus" data-id="${card.id}" aria-label="Una bolsa más de ${card.label}">+</button>
<div class="buy-quick"><button class="chip" data-act="buy-q2" data-id="${card.id}">2</button><button class="chip" data-act="buy-q5" data-id="${card.id}">5</button><button class="chip" data-act="buy-q10" data-id="${card.id}">10</button></div>
</div>
<div class="buy-total">${card.preview}</div>
<button class="add-btn btn btn-primary btn-sm" data-act="buy-add" data-id="${card.id}" style="margin-top: 6px; background-color: var(--accent)">Agregar ${card.addLabel} al carrito</button>
<div style="min-height: 20px; font-size: 14px; font-weight: 600; color: #E8C25A">${card.inCart}</div>
</div>`; },
  dots: function (item) { return `<button class="bk-btn" data-act="go" data-n="${item.i}" aria-label="Ir a la página ${item.n}" style="width: 24px; height: 44px; padding: 0; border: 0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer"><span class="bk-dot${item.on}"></span></button>`; }
};

/* ---------- utilidades ---------- */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function fmt(n) { return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function digits(s) { return String(s || '').replace(/\D/g, ''); }
function prod(id) { return PRODS.filter(function (p) { return p.id === id; })[0]; }
function qtyOf(id) { return state.cart[id] || 0; }
function setQty(id, n) { state.cart[id] = Math.max(0, Math.min(99, n)); }
function buyRaw(id) { return state.buy[id] !== undefined ? state.buy[id] : '1'; }
function buyN(id) { var n = parseInt(buyRaw(id), 10); return n >= 1 ? Math.min(99, n) : 1; }
function val(k) { return String(state.form[k] || '').trim(); }

/* ---------- cálculo del carrito ---------- */
function compute() {
  var lines = PRODS.filter(function (p) { return qtyOf(p.id) > 0; }).map(function (p) {
    var q = qtyOf(p.id);
    return {
      id: p.id, name: p.name, qty: q,
      unit: fmt(p.price) + ' c/u', total: fmt(p.price * q),
      qtyValue: state.draft[p.id] !== undefined ? state.draft[p.id] : String(q)
    };
  });
  var count = lines.reduce(function (s, l) { return s + l.qty; }, 0);
  var subtotalN = PRODS.reduce(function (s, p) { return s + p.price * qtyOf(p.id); }, 0);
  var missing = [];
  if (!val('name')) missing.push('nombre');
  if (!val('phone')) missing.push('teléfono');
  else if (!val('phone2')) missing.push('confirmación de número');
  var phoneMismatch = !!val('phone') && !!val('phone2') && digits(val('phone')) !== digits(val('phone2'));
  if (!val('city')) missing.push('ciudad');
  if (!val('address')) missing.push('dirección');
  if (!state.privOk) missing.push('aceptar las políticas de privacidad');
  var hasItems = count > 0;
  var canSend = hasItems && missing.length === 0 && !phoneMismatch;
  var orderLines = lines.map(function (l) { return '- ' + l.qty + ' x ' + l.name + ' (' + l.total + ')'; }).join('\n');
  var msg = 'Hola Amaya Cafe, quiero hacer un pedido:\n' + orderLines +
    '\nSubtotal: ' + fmt(subtotalN) + ' (el envío no está incluido, lo pago al recibir)\n\n' +
    'Nombre: ' + val('name') + '\nTeléfono: ' + val('phone') + '\nCiudad: ' + val('city') +
    '\nDirección: ' + val('address') + (val('email') ? '\nCorreo: ' + val('email') : '') +
    (val('coupon') ? '\nCupón: ' + val('coupon') : '') + '\nPolíticas de privacidad: aceptadas';
  return {
    lines: lines, count: count, subtotal: fmt(subtotalN), hasItems: hasItems,
    canSend: canSend, phoneMismatch: phoneMismatch,
    missingMsg: !hasItems ? 'Agrega al menos una bolsa al carrito.' :
      (missing.length ? 'Completa: ' + missing.join(', ') + '.' : 'Los dos teléfonos no coinciden.'),
    waLink: 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg)
  };
}

/* ---------- dibujar ---------- */
function keepFocus(fn) {
  var a = document.activeElement, id = a && a.id, pos = null;
  try { pos = a && a.selectionStart; } catch (e) {}
  fn();
  if (id) {
    var el = document.getElementById(id);
    if (el && el !== document.activeElement) {
      el.focus();
      try { if (pos !== null && pos !== undefined) el.setSelectionRange(pos, pos); } catch (e) {}
    }
  }
}

function renderBuy() {
  var cards = PRODS.map(function (p) {
    var n = buyN(p.id);
    return {
      id: p.id, label: p.label, price: p.priceText, qtyValue: buyRaw(p.id),
      preview: 'Total: ' + fmt(p.price * n) + ' COP',
      addLabel: n === 1 ? '1 bolsa' : n + ' bolsas',
      inCart: qtyOf(p.id) ? 'En tu carrito: ' + qtyOf(p.id) : ''
    };
  });
  $('[data-list="buyCards"]').innerHTML = cards.map(TPL.buyCards).join('');
}

function renderCart() {
  var c = compute();
  document.body.classList.toggle('cart-open', state.cartOpen);
  var flags = {
    noItems: !c.hasItems, hasItems: c.hasItems, canSend: c.canSend, cannotSend: !c.canSend,
    phoneMismatch: c.phoneMismatch, privOpen: state.privOpen, payNotice: state.payNotice && c.canSend
  };
  $$('[data-show]').forEach(function (el) { el.hidden = !flags[el.getAttribute('data-show')]; });
  var texts = { cartCount: c.count, subtotal: c.subtotal, missingMsg: c.missingMsg, pageLabel: 'Página ' + (state.spread + 1) + ' de ' + TOTAL };
  $$('[data-bind]').forEach(function (el) { var k = el.getAttribute('data-bind'); if (k in texts) el.textContent = texts[k]; });
  $$('[data-bind-href="waLink"]').forEach(function (a) { a.setAttribute('href', c.waLink); });
  var priv = $('#c-priv'); if (priv) priv.checked = state.privOk;
  var pr = $('.priv-read'); if (pr) pr.setAttribute('aria-expanded', state.privOpen ? 'true' : 'false');
  $('[data-list="lines"]').innerHTML = c.lines.map(TPL.lines).join('');
  renderBuy();
}

function renderBook() {
  $$('.bk-spread').forEach(function (el, i) {
    el.classList.toggle('is-active', i === state.spread);
    el.classList.toggle('is-before', i < state.spread);
  });
  var items = [];
  for (var i = 0; i < TOTAL; i++) items.push({ i: i, n: i + 1, on: i === state.spread ? ' on' : '' });
  $('[data-list="dots"]').innerHTML = items.map(TPL.dots).join('');
  $$('[data-act="prev"]').forEach(function (b) { b.disabled = state.spread === 0; });
  $$('[data-act="next"]').forEach(function (b) { b.disabled = state.spread === TOTAL - 1; });
  var pl = $('[data-bind="pageLabel"]'); if (pl) pl.textContent = 'Página ' + (state.spread + 1) + ' de ' + TOTAL;
}

function goTo(n) { state.spread = Math.max(0, Math.min(TOTAL - 1, n)); renderBook(); }

/* ---------- acciones ---------- */
var ACTIONS = {
  openCart: function () { state.cartOpen = true; renderCart(); },
  closeCart: function () { state.cartOpen = false; state.payNotice = false; renderCart(); },
  showCoffee: function () {
    state.cartOpen = false; renderCart();
    setTimeout(function () {
      var img = $('.shot');
      if (img && img.scrollIntoView) img.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  },
  playStory: function (el) {
    var box = el.closest('.story-box');
    var v = box ? $('.story-main-video', box) : null;
    if (!v) return;
    v.loop = false; v.muted = false; v.controls = true; v.currentTime = 0;
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  },
  prev: function () { goTo(state.spread - 1); },
  next: function () { goTo(state.spread + 1); },
  go: function (el) { goTo(parseInt(el.getAttribute('data-n'), 10)); },
  togglePriv: function (el) { state.privOk = !!el.checked; renderCart(); },
  togglePrivText: function () { state.privOpen = !state.privOpen; renderCart(); },
  pay: function () { state.payNotice = true; renderCart(); },
  clearCart: function () { state.cart = {}; renderCart(); },
  'line-minus': function (el) { var id = el.getAttribute('data-id'); setQty(id, qtyOf(id) - 1); delete state.draft[id]; renderCart(); },
  'line-plus': function (el) { var id = el.getAttribute('data-id'); setQty(id, qtyOf(id) + 1); delete state.draft[id]; renderCart(); },
  'line-remove': function (el) { var id = el.getAttribute('data-id'); setQty(id, 0); delete state.draft[id]; renderCart(); },
  'buy-minus': function (el) { var id = el.getAttribute('data-id'); state.buy[id] = String(Math.max(1, buyN(id) - 1)); renderBuy(); },
  'buy-plus': function (el) { var id = el.getAttribute('data-id'); state.buy[id] = String(Math.min(99, buyN(id) + 1)); renderBuy(); },
  'buy-q2': function (el) { state.buy[el.getAttribute('data-id')] = '2'; renderBuy(); },
  'buy-q5': function (el) { state.buy[el.getAttribute('data-id')] = '5'; renderBuy(); },
  'buy-q10': function (el) { state.buy[el.getAttribute('data-id')] = '10'; renderBuy(); },
  'buy-add': function (el) { var id = el.getAttribute('data-id'); setQty(id, qtyOf(id) + buyN(id)); renderCart(); }
};

document.addEventListener('click', function (e) {
  var el = e.target.closest ? e.target.closest('[data-act]') : null;
  if (!el) return;
  var fn = ACTIONS[el.getAttribute('data-act')];
  if (!fn) return;
  if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
  fn(el);
});

document.addEventListener('input', function (e) {
  var t = e.target;
  if (t.hasAttribute('data-field')) {
    state.form[t.getAttribute('data-field')] = t.value;
    keepFocus(renderCart);
    return;
  }
  var raw;
  if (t.hasAttribute('data-qty-line')) {
    var id = t.getAttribute('data-qty-line');
    raw = String(t.value).replace(/\D/g, '').slice(0, 2);
    var n = parseInt(raw, 10);
    if (raw !== '' && n >= 1) { setQty(id, n); delete state.draft[id]; }
    else state.draft[id] = raw;
    keepFocus(renderCart);
  } else if (t.hasAttribute('data-qty-buy')) {
    state.buy[t.getAttribute('data-qty-buy')] = String(t.value).replace(/\D/g, '').slice(0, 2);
    keepFocus(renderBuy);
  }
});

document.addEventListener('focusout', function (e) {
  var t = e.target;
  if (!t.hasAttribute) return;
  var id;
  if (t.hasAttribute('data-qty-line')) {
    id = t.getAttribute('data-qty-line');
    delete state.draft[id];
    t.value = String(qtyOf(id));
  } else if (t.hasAttribute('data-qty-buy')) {
    id = t.getAttribute('data-qty-buy');
    state.buy[id] = String(buyN(id));
    t.value = state.buy[id];
  }
});

renderCart();
renderBook();
})();
