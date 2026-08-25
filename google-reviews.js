(function () {
  "use strict";

  const config = window.GOOGLE_REVIEWS_CONFIG || {};
  const carousels = Array.from(document.querySelectorAll("[data-google-reviews]"));
  if (!carousels.length || !config.apiKey || !config.placeId) return;

  function loadGoogleMaps() {
    if (window.google && window.google.maps) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const callback = "initBrianHallerGoogleReviews";
      window[callback] = resolve;
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(config.apiKey) + "&loading=async&callback=" + callback;
      script.async = true;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function buildCard(review) {
    const card = makeElement("article", "google-review-card");
    const authorRow = makeElement("div", "google-review-author");
    const author = review.authorAttribution || {};
    if (author.photoURI) {
      const avatar = makeElement("img", "google-review-avatar");
      avatar.src = author.photoURI;
      avatar.alt = "";
      avatar.referrerPolicy = "no-referrer";
      authorRow.appendChild(avatar);
    }
    const authorText = makeElement("div");
    const authorLink = makeElement("a", "", author.displayName || "Google reviewer");
    authorLink.href = author.uri || review.googleMapsURI || "https://www.google.com/maps";
    authorLink.target = "_blank";
    authorLink.rel = "noopener";
    authorText.appendChild(authorLink);
    authorText.appendChild(makeElement(
      "span",
      "google-review-date",
      review.relativePublishTimeDescription || "Google review"
    ));
    authorRow.appendChild(authorText);
    card.appendChild(authorRow);

    const rating = Math.max(0, Math.min(5, Math.round(review.rating || 0)));
    const stars = makeElement("div", "google-review-stars", "★".repeat(rating) + "☆".repeat(5 - rating));
    stars.setAttribute("aria-label", rating + " out of 5 stars");
    card.appendChild(stars);
    card.appendChild(makeElement("p", "google-review-text", review.text || "Rating-only review"));

    const source = makeElement("a", "google-review-source", "View this review on Google Maps");
    source.href = review.googleMapsURI || author.uri || "https://www.google.com/maps";
    source.target = "_blank";
    source.rel = "noopener";
    card.appendChild(source);
    return card;
  }

  function initializeCarousel(root, reviews, attributions) {
    const stage = root.querySelector(".google-review-stage");
    const controls = root.querySelector(".google-review-controls");
    const dots = root.querySelector(".google-review-dots");
    let active = 0;
    let timer;

    function show(index) {
      active = (index + reviews.length) % reviews.length;
      stage.replaceChildren(buildCard(reviews[active]));
      Array.from(dots.children).forEach((dot, dotIndex) => {
        dot.setAttribute("aria-current", String(dotIndex === active));
      });
    }

    reviews.forEach((review, index) => {
      const dot = makeElement("button", "google-review-dot");
      dot.type = "button";
      dot.setAttribute("aria-label", "Show review " + (index + 1));
      dot.addEventListener("click", () => show(index));
      dots.appendChild(dot);
    });
    root.querySelector("[data-review-prev]").addEventListener("click", () => show(active - 1));
    root.querySelector("[data-review-next]").addEventListener("click", () => show(active + 1));
    controls.hidden = reviews.length < 2;

    if (attributions && attributions.length) {
      root.appendChild(makeElement("div", "google-review-notice", attributions.join(" · ")));
    }

    function start() {
      if (reviews.length > 1) timer = window.setInterval(() => show(active + 1), 7000);
    }
    function stop() { window.clearInterval(timer); }
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);
    show(0);
    start();
  }

  async function init() {
    try {
      await loadGoogleMaps();
      const { Place } = await google.maps.importLibrary("places");
      const place = new Place({ id: config.placeId });
      await place.fetchFields({ fields: ["reviews"] });
      const reviews = place.reviews || [];
      if (!reviews.length) return;
      carousels.forEach((root) => initializeCarousel(root, reviews, place.attributions));
    } catch (error) {
      console.error("Google reviews could not be loaded.", error);
    }
  }
  init();
}());
