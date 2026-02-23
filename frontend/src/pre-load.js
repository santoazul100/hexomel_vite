(function () {
  const user = localStorage.getItem("user");
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");

  if (user) {
    document.documentElement.classList.add("auth-user-present");
  }

  if (cart.length > 0) {
    document.documentElement.classList.add("cart-items-present");
  }
})();
