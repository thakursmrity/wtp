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
    var fieldsBox = document.getElementById("form-fields");
    var doneBox = document.getElementById("form-done");
    var statusEl = document.getElementById("form-status");
    var sendBtn = document.getElementById("send");
    var kindSelect = form.elements.kind;
    var messageBox = form.elements.message;
    var shownAt = Date.now();
    var holders = {
      product: "Which product, and what made you wonder about it?",
      discovery: "What problem do you deal with that I could ask you about?",
      question: "Which product interview question are you stuck on?",
      other: "What's on your mind?"
    };

    function setKind(kind) {
      if (!holders[kind]) kind = "product";
      kindSelect.value = kind;
      messageBox.placeholder = holders[kind];
    }

    function setStatus(text, isError) {
      statusEl.textContent = text || "";
      statusEl.className = "form-status" + (isError ? " is-error" : "");
    }

    function clearInvalid() {
      ["kind", "name", "email", "message"].forEach(function (n) {
        form.elements[n].removeAttribute("aria-invalid");
      });
    }

    function fail(text, field) {
      setStatus(text, true);
      if (field && form.elements[field]) {
        form.elements[field].setAttribute("aria-invalid", "true");
        form.elements[field].focus();
      }
    }

    setKind(new URLSearchParams(window.location.search).get("kind"));
    kindSelect.addEventListener("change", function () { setKind(kindSelect.value); });

    document.querySelectorAll("[data-kind]").forEach(function (link) {
      link.addEventListener("click", function () {
        setKind(link.getAttribute("data-kind"));
        setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, 450);
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearInvalid();
      setStatus("");

      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = messageBox.value.trim();
      if (!name) return fail("Add your name so I know who to reply to.", "name");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("That email address does not look right.", "email");
      if (message.length < 5) return fail("Write a little more so I can help.", "message");

      sendBtn.disabled = true;
      setStatus("Sending...");
      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: kindSelect.value,
          name: name,
          email: email,
          message: message,
          website: form.elements.website.value,
          elapsed: Date.now() - shownAt
        })
      }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (data) {
          sendBtn.disabled = false;
          if (res.ok) {
            form.reset();
            setKind("product");
            setStatus("");
            fieldsBox.hidden = true;
            doneBox.hidden = false;
            doneBox.focus();
            return;
          }
          fail((data && data.error) || "That did not send. Please try again, or email whythatproduct@gmail.com.", data && data.field);
        });
      }).catch(function () {
        sendBtn.disabled = false;
        fail("I could not reach the server. Check your connection, or email whythatproduct@gmail.com.");
      });
    });

    document.getElementById("send-another").addEventListener("click", function () {
      doneBox.hidden = true;
      fieldsBox.hidden = false;
      shownAt = Date.now();
      form.elements.name.focus();
    });
  }
})();
