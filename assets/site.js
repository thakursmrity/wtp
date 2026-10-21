// Why That Product: small, dependency-free interactions.

(function () {
  // Mobile menu
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Teardown phone on the home page
  var phone = document.getElementById("phone");
  if (phone) {
    var pins = phone.querySelectorAll(".pin");
    var q = document.getElementById("why-q");
    var a = document.getElementById("why-a");
    var apart = document.getElementById("apart");

    pins.forEach(function (pin) {
      pin.addEventListener("click", function () {
        pins.forEach(function (p) { p.setAttribute("aria-pressed", "false"); });
        pin.setAttribute("aria-pressed", "true");
        q.textContent = pin.getAttribute("data-q");
        a.textContent = pin.getAttribute("data-a");
      });
    });

    if (apart) {
      apart.addEventListener("click", function () {
        var on = phone.classList.toggle("is-apart");
        apart.setAttribute("aria-pressed", on ? "true" : "false");
        apart.textContent = on ? "Put it back together" : "Take it apart";
      });
    }
  }

  // "Would they pay?" evidence ladder on the content page
  var tabs = document.querySelectorAll(".ladder-tabs button");
  var panel = document.getElementById("ladder-panel");
  if (tabs.length && panel) {
    var copy = {
      said: {
        read: "Weak evidence.",
        text: "Someone says it sounds nice. Saying yes costs nothing, so I treat it as politeness until something else backs it up."
      },
      asked: {
        read: "Getting warmer.",
        text: "Someone asks when it launches, or how to get it. They are spending attention and imagining themselves using it. Still not money, but it is a real signal."
      },
      paid: {
        read: "Strong evidence.",
        text: "Someone pre-orders, puts down a deposit, or already pays for something that does the same job. Money moved, which is the closest thing to a true answer."
      }
    };

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.setAttribute("aria-selected", "false"); });
        tab.setAttribute("aria-selected", "true");
        var c = copy[tab.getAttribute("data-key")];
        panel.querySelector(".hand").textContent = c.read;
        panel.querySelector("p").textContent = c.text;
      });
    });
  }

  // Contact form on the connect page
  var form = document.getElementById("contact-form");
  if (form) {
    var hints = {
      product: "Which app, checkout or feature are you curious about, and what makes you wonder?",
      call: "What problem do you solve in your day that you'd be happy to talk through?",
      question: "Which product interview question is giving you trouble, and what have you tried so far?",
      hi: "Say whatever's on your mind."
    };
    var area = form.querySelector("textarea");
    var errorBox = document.getElementById("form-error");
    var sendBtn = document.getElementById("form-send");
    var done = document.getElementById("contact-done");

    var setType = function (type) {
      var radio = form.querySelector('input[name="type"][value="' + type + '"]');
      if (!radio) return;
      radio.checked = true;
      area.placeholder = hints[type];
    };

    form.querySelectorAll('input[name="type"]').forEach(function (r) {
      r.addEventListener("change", function () { area.placeholder = hints[r.value]; });
    });

    var fromLink = new URLSearchParams(window.location.search).get("type");
    if (fromLink) setType(fromLink);

    document.querySelectorAll("[data-type]").forEach(function (link) {
      link.addEventListener("click", function () {
        setType(link.getAttribute("data-type"));
        window.setTimeout(function () { area.focus({ preventScroll: true }); }, 500);
      });
    });

    var showError = function (text) {
      errorBox.textContent = text;
      errorBox.hidden = false;
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      errorBox.hidden = true;

      var data = {
        type: form.querySelector('input[name="type"]:checked').value,
        name: form.elements.name.value,
        email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim(),
        website: form.elements.website.value
      };

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
        showError("Please enter an email address I can reply to.");
        form.elements.email.focus();
        return;
      }
      if (data.message.length < 5) {
        showError("Please write a few words so I know what you have in mind.");
        area.focus();
        return;
      }

      sendBtn.disabled = true;
      sendBtn.textContent = "Sending";

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (body) { return { ok: r.ok, body: body }; });
        })
        .then(function (r) {
          if (r.ok) {
            form.hidden = true;
            done.hidden = false;
            done.focus();
            return;
          }
          showError(r.body.error || "That didn't send. Please try again, or email whythatproduct@gmail.com.");
        })
        .catch(function () {
          showError("That didn't send. Please check your connection and try again, or email whythatproduct@gmail.com.");
        })
        .then(function () {
          sendBtn.disabled = false;
          sendBtn.textContent = "Send message";
        });
    });
  }
})();
