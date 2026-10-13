const steps = document.querySelectorAll("#processSteps .process-step");
const cards = [
  document.getElementById("card1"),
  document.getElementById("card2"),
  document.getElementById("card3"),
];

// preload every image so swaps are instant
steps.forEach((step) => {
  step.dataset.images.split(",").forEach((src) => {
    const img = new Image();
    img.src = src.trim();
  });
});

function setActive(step) {
  if (step.classList.contains("active")) return;

  steps.forEach((s) => {
    s.classList.remove("active");
    s.querySelector("h3").classList.add("text-neutral-600");
  });
  step.classList.add("active");
  step.querySelector("h3").classList.remove("text-neutral-600");

  const images = step.dataset.images.split(",").map((s) => s.trim());
  cards.forEach((card, i) => {
    card.classList.add("swapping");
    setTimeout(() => {
      card.src = images[i];
      card.classList.remove("swapping");
    }, 200 + i * 80); // small stagger between cards
  });
}

// change on hover/click
steps.forEach((step) => {
  step.addEventListener("mouseenter", () => setActive(step));
  step.addEventListener("click", () => setActive(step));
});

// change on scroll (step crossing the middle of the screen)
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target);
    });
  },
  { rootMargin: "-45% 0px -45% 0px" }
);
steps.forEach((step) => observer.observe(step));