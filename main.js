/* Levi Henry Group — site interactions */
(function () {
  "use strict";

  /* ---- current year ---- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---- mobile nav ---- */
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- scroll reveal ---- */
  var revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealables.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var el = e.target;
            var delay = el.getAttribute("data-delay") || 0;
            setTimeout(function () {
              el.classList.add("in");
            }, delay);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealables.forEach(function (el) {
      io.observe(el);
    });
    // Safety net: never leave content stuck invisible if the observer
    // hasn't fired (e.g. loaded in a background tab that never composites).
    setTimeout(function () {
      revealables.forEach(function (el) {
        el.classList.add("in");
      });
    }, 2600);
  } else {
    revealables.forEach(function (el) {
      el.classList.add("in");
    });
  }

  /* ---- portfolio filter ---- */
  var filters = document.querySelectorAll(".filter");
  var works = document.querySelectorAll(".work[data-cats]");
  if (filters.length && works.length) {
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.getAttribute("data-filter");
        filters.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        works.forEach(function (w) {
          var cats = w.getAttribute("data-cats") || "";
          var show = cat === "all" || cats.indexOf(cat) !== -1;
          w.classList.toggle("hidden", !show);
        });
      });
    });
  }

  /* ---- testimonial videos (lazy: load only on play) ---- */
  document.querySelectorAll(".testi").forEach(function (card) {
    var video = card.querySelector("video");
    var poster = card.querySelector(".poster");
    if (!video || !poster) return;
    poster.addEventListener("click", function () {
      card.classList.add("playing");
      video.setAttribute("controls", "");
      video.muted = false;
      try { video.currentTime = 0; } catch (e) {}
      video.play();
    });
    video.addEventListener("ended", function () {
      card.classList.remove("playing");
    });
  });

  /* ---- contact form (no backend wired yet) ---- */
  var form = document.querySelector("form[data-contact]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      if (status) {
        status.textContent =
          "Thanks — this form isn't wired to a backend yet. Reach out directly at the email above and I'll get right back to you.";
        status.style.color = "var(--terracotta-deep)";
      }
    });
  }
})();
