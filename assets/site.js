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
})();
