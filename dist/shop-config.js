/*
  Moving Cyanotypes shop: prices and Stripe Payment Links.
  Edit only this file. Leave a link empty ("") and its button shows "Available soon".
  Prices are shown exactly as written, e.g. "€45".
*/
window.SHOP = {
  "a-candle-flame-or-a-wildfire": {
    digital:  { price: "", link: "" },
    physical: { price: "", link: "" }
  },
  "finding-your-own-path": {
    digital:  { price: "", link: "" },
    physical: { price: "", link: "" }
  },
  "like-roots": {
    digital:  { price: "", link: "" },
    physical: { price: "", link: "" }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-pack][data-edition]").forEach((el) => {
    const item = (window.SHOP[el.dataset.pack] || {})[el.dataset.edition] || {};
    const price = el.querySelector("[data-price]");
    const buy = el.querySelector("[data-buy]");
    if (price) price.textContent = item.price || "Price soon";
    if (!buy) return;
    if (item.link) {
      buy.href = item.link;
      buy.target = "_blank";
      buy.rel = "noopener noreferrer";
    } else {
      buy.removeAttribute("href");
      buy.setAttribute("aria-disabled", "true");
      buy.classList.add("is-soon");
      buy.firstChild.textContent = "Available soon ";
    }
  });
});
