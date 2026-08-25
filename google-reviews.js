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
      const avatarWrap = makeElement("span", "google-review-avatar-wrap");
      const avatar = makeElement("img", "google-review-avatar");
      avatar.src = author.photoURI;
      avatar.alt = "";
      avatar.referrerPolicy = "no-referrer";
      avatarWrap.appendChild(avatar);
      const avatarGoogle = makeElement("img", "google-review-avatar-google");
      avatarGoogle.src = "images/google-g.png";
      avatarGoogle.alt = "";
      avatarWrap.appendChild(avatarGoogle);
      authorRow.appendChild(avatarWrap);
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

    const source = makeElement("a", "google-review-source", "Read more on Google");
    source.href = review.googleMapsURI || author.uri || "https://www.google.com/maps";
    source.target = "_blank";
    source.rel = "noopener";
    card.appendChild(source);
    return card;
  }

  function initializeCarousel(root, reviews, attributions, overallRating, reviewCount) {
    const stage = root.querySelector(".google-review-stage");
    const controls = root.querySelector(".google-review-controls");
    const dots = root.querySelector(".google-review-dots");
    let active = 0;
    let timer;

    if (overallRating) {
      const summary = makeElement("div", "google-review-summary");
      const ratingGroup = makeElement("div", "google-review-summary-rating");
      ratingGroup.appendChild(makeElement("strong", "", Number(overallRating).toFixed(1)));
      const summaryStars = makeElement("span", "google-review-summary-stars", "★★★★★");
      summaryStars.setAttribute("aria-label", overallRating + " out of 5 stars");
      ratingGroup.appendChild(summaryStars);
      if (reviewCount) {
        ratingGroup.appendChild(makeElement("span", "google-review-summary-count", reviewCount + " reviews on"));
        const googleLogo = makeElement("img", "google-review-summary-logo");
        googleLogo.src = "https://www.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png";
        googleLogo.alt = "Google";
        ratingGroup.appendChild(googleLogo);
      }
      summary.appendChild(ratingGroup);
      const reviewButton = makeElement("a", "google-review-summary-button", "Leave a review on Google");
      reviewButton.href = "https://g.page/r/CfdBVK6ZZjJREAI/review";
      reviewButton.target = "_blank";
      reviewButton.rel = "noopener";
      summary.appendChild(reviewButton);
      root.insertBefore(summary, stage);
    }

    function show(index) {
      active = (index + reviews.length) % reviews.length;
      const visibleCount = window.matchMedia("(max-width: 700px)").matches ? 1 : Math.min(2, reviews.length);
      const visibleCards = [];
      for (let offset = 0; offset < visibleCount; offset += 1) {
        visibleCards.push(buildCard(reviews[(active + offset) % reviews.length]));
      }
      stage.replaceChildren(...visibleCards);
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
      if (reviews.length > 1) timer = window.setInterval(() => show(active + 1), 3000);
    }
    function stop() { window.clearInterval(timer); }
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);
    window.addEventListener("resize", () => show(active));
    show(0);
    start();
  }

  async function init() {
    try {
      await loadGoogleMaps();
      const { Place } = await google.maps.importLibrary("places");
      const place = new Place({ id: config.placeId });
      await place.fetchFields({ fields: ["rating", "userRatingCount", "reviews"] });
      const reviews = place.reviews || [];
      if (!reviews.length) return;
      carousels.forEach((root) => initializeCarousel(
        root,
        reviews,
        place.attributions,
        place.rating,
        place.userRatingCount
      ));
    } catch (error) {
      console.error("Google reviews could not be loaded.", error);
    }
  }
  init();
}());
