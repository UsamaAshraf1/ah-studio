/* ==========================================================
   AH Studio — scroll / text / image animations (animations.js)
   - Tags existing elements by selector, so no HTML needs editing
     beyond including animations.css + this file.
   - Respects prefers-reduced-motion (does nothing in that case).
   - If anything fails, `.anim-on` is removed and the page shows
     exactly as originally designed.
   ========================================================== */
(function () {
  "use strict";

  var root = document.documentElement;

  try {
    var reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;

    root.classList.add("anim-on");

    var q = function (sel, ctx) {
      return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    };

    var tagged = [];

    /* ---------- split text into words (keeps nested tags / <br>) ---------- */
    function splitWords(el) {
      var n = 0;
      var label = el.textContent.replace(/\s+/g, " ").trim();
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (c) {
          if (c.nodeType === 3) {
            if (!c.nodeValue.trim()) return;
            var frag = document.createDocumentFragment();
            c.nodeValue.split(/(\s+)/).forEach(function (t) {
              if (!t) return;
              if (/^\s+$/.test(t)) {
                frag.appendChild(document.createTextNode(t));
                return;
              }
              var outer = document.createElement("span");
              outer.className = "aw";
              outer.setAttribute("aria-hidden", "true");
              var inner = document.createElement("span");
              inner.className = "aw-i";
              inner.style.setProperty("--i", n++);
              inner.textContent = t;
              outer.appendChild(inner);
              frag.appendChild(outer);
            });
            node.replaceChild(frag, c);
          } else if (c.nodeType === 1 && c.tagName !== "BR") {
            walk(c);
          }
        });
      })(el);
      if (/^H[1-6]$/.test(el.tagName) || el.tagName === "P") {
        el.setAttribute("aria-label", label);
      }
    }

    /* ---------- number count-up (e.g. 100+, 4.9) ---------- */
    function makeCounter(node) {
      var m = node.textContent.trim().match(/^([^\d]*)([\d.]+)(.*)$/);
      if (!m) return null;
      var pre = m[1],
        num = parseFloat(m[2]),
        suf = m[3],
        dec = (m[2].split(".")[1] || "").length;
      node.textContent = pre + (0).toFixed(dec) + suf;
      return function () {
        var t0 = performance.now(),
          dur = 1600;
        (function frame(t) {
          var p = Math.min(1, (t - t0) / dur),
            e = 1 - Math.pow(1 - p, 3);
          node.textContent = pre + (num * e).toFixed(dec) + suf;
          if (p < 1) requestAnimationFrame(frame);
        })(t0);
      };
    }

    /* ---------- tagging ---------- */
    function tag(el, type, opt) {
      if (!el || el.hasAttribute("data-anim")) return false;
      opt = opt || {};
      el.setAttribute("data-anim", type);
      if (type === "words" || type === "words-fade") splitWords(el);
      if (opt.ws) el.style.setProperty("--ws", opt.ws + "ms");
      tagged.push(el);
      return true;
    }

    var EXCLUDE_P = ".process-step, article, .rounded-3xl, #quote, form";

    // [selector, effect, options]
    //   d: base delay (ms)   s: stagger between siblings (ms)
    //   c: restart stagger every c siblings (for grids)
    var RULES = [
      // nav
      ["nav > a, nav > button", "down", { d: 100, s: 120 }],

      // hero (first screen of every page)
      ["header h1", "words", { d: 200 }],
      ["header .z-10 p", "up", { d: 650 }],
      ["header .z-10 a", "up", { d: 800, s: 120 }],
      ["header div.bottom-16 > div", "up", { d: 950, s: 140 }],
      ["header .tile", "pop", { d: 300, s: 120 }],

      // headings & text blocks
      ["section > p.font-display", "words-fade", { ws: 22 }],
      ["section h2.font-display", "words"],
      ["section h2:not(.font-display)", "up"],
      ["section a.inline-block", "up", { d: 250 }],

      // lists / cards
      ["#thinkList li", "up", { d: 100, s: 110 }],
      ["section article", "up", { c: 1 }],
      ["section div.rounded-3xl.bg-neutral-100", "up", { c: 2, s: 120 }],
      ["#workList > li", "up", { s: 90 }],

      // floating tiles
      [".process-cards .tile", "pop", { d: 100, s: 150 }],
      ["section .tile", "pop", { s: 120 }],

      // testimonial + contact page
      ["#quote", "up", { d: 150 }],
      [
        "#contactForm > input, #contactForm > textarea, #contactForm > button, #contactForm > div",
        "up",
        { s: 80 },
      ],
      ["#contactForm + div", "right", { d: 200 }],
      [".cord", "left", { d: 300 }],
      ["#emailText, #phoneText", "up", { d: 100 }],

      // generic paragraphs (anything not already handled above)
      ["section p", "up", { filter: true }],

      // footer
      ["footer > div.font-display", "words", { ws: 110 }],
      [
        "footer .tile",
        "pop",
        {
          s: 110,
          ty: "30px",
          tx: function (el) {
            return el.parentElement.classList.contains("right-0")
              ? "-90px"
              : "90px";
          },
        },
      ],
      ["footer a.rounded-full", "up"],
    ];

    RULES.forEach(function (r) {
      var counts = new Map();
      q(r[0]).forEach(function (el) {
        var opt = r[2] || {};
        if (opt.filter && el.closest(EXCLUDE_P)) return;
        var parent = el.parentElement;
        var idx = counts.get(parent) || 0;
        counts.set(parent, idx + 1);
        var eff = opt.c ? idx % opt.c : idx;
        var delay = (opt.d || 0) + eff * (opt.s || 0);
        if (!tag(el, r[1], opt)) return;
        if (delay) el.style.setProperty("--d", delay + "ms");
        if (opt.tx)
          el.style.setProperty("--tx", typeof opt.tx === "function" ? opt.tx(el) : opt.tx);
        if (opt.ty) el.style.setProperty("--ty", opt.ty);
      });
    });

    // images: wipe-up + zoom-out when the parent already clips (overflow-hidden),
    // plain wipe otherwise, so the existing image shapes never change
    q("section img").forEach(function (img) {
      if (img.closest("[data-anim], .process-cards")) return;
      var clipped = img.parentElement.classList.contains("overflow-hidden");
      tag(img, clipped ? "img" : "img-wipe");
      if (clipped) img.parentElement.setAttribute("data-hz", "");
    });

    // hero stat numbers count up
    q("header div.bottom-16 > div").forEach(function (box) {
      var num = box.querySelector(".font-display");
      var fn = num && makeCounter(num);
      if (fn) {
        var d = parseFloat(box.style.getPropertyValue("--d")) || 0;
        box._in = function () {
          setTimeout(fn, d);
        };
      }
    });

    // testimonial: replay a soft rise whenever the quote text changes
    var quote = document.getElementById("quote");
    if (quote && "MutationObserver" in window) {
      new MutationObserver(function () {
        quote.classList.remove("q-swap");
        void quote.offsetWidth;
        quote.classList.add("q-swap");
      }).observe(quote, { childList: true, characterData: true, subtree: true });
    }

    /* ---------- reveal on scroll ---------- */
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          // also reveal things already scrolled past (e.g. reload mid-page)
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            var el = e.target._t || e.target; // clipped elements are watched via their parent
            el.classList.add("is-in");
            io.unobserve(e.target);
            if (el._in) el._in();
            // once a heading has finished sliding in, drop the word mask
            if (el.getAttribute("data-anim") === "words") {
              var n = el.querySelectorAll(".aw-i").length;
              var ws = parseFloat(el.style.getPropertyValue("--ws")) || 70;
              var d = parseFloat(el.style.getPropertyValue("--d")) || 0;
              setTimeout(function () {
                el.classList.add("aw-done");
              }, d + n * ws + 1300);
            }
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    var started = false;
    function start() {
      if (started) return;
      started = true;
      tagged.forEach(function (el) {
        // an element with its own clip-path reports zero visible area to
        // IntersectionObserver, so watch its parent instead
        var watch = /^(img|img-wipe|wipe)$/.test(el.getAttribute("data-anim"))
          ? el.parentElement
          : el;
        if (watch !== el) watch._t = el;
        io.observe(watch);
      });
    }
    // wait for web fonts so headings don't jump mid-animation
    var fonts = document.fonts && document.fonts.ready;
    if (fonts) {
      Promise.race([
        fonts,
        new Promise(function (r) {
          setTimeout(r, 1500);
        }),
      ]).then(start);
    } else {
      start();
    }
    setTimeout(start, 1700);

    /* ---------- gentle hero parallax on the floating cards ---------- */
    var layers = q('header > div.absolute[aria-hidden="true"]');
    if (layers.length) {
      var factors = [0.12, 0.22, 0.16];
      var ticking = false;
      var update = function () {
        ticking = false;
        var y = Math.min(window.scrollY, 1200);
        layers.forEach(function (l, i) {
          l.style.translate = "0 " + (y * factors[i % factors.length]).toFixed(1) + "px";
        });
      };
      window.addEventListener(
        "scroll",
        function () {
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
          }
        },
        { passive: true },
      );
    }
  } catch (err) {
    // never leave content hidden if something goes wrong
    root.classList.remove("anim-on");
    if (window.console) console.warn("animations.js disabled:", err);
  }
})();
