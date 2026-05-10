// Shared JavaScript for all pages

// Tab switching functionality
(function() {
  document.querySelectorAll("[data-tabs]").forEach(box => {
    const btns = box.querySelectorAll("button");
    const panes = box.querySelectorAll("pre");
    btns.forEach(b => b.addEventListener("click", () => {
      btns.forEach(x => x.classList.remove("on"));
      panes.forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      panes[+b.dataset.t].classList.add("on");
    }));
  });
})();
