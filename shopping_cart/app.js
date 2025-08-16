let cart = [];

function addToCart(productName, price) {
  let existingItem = cart.find(item => item.name === productName);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name: productName, price: price, quantity: 1 });
  }

  renderCart();
}

function renderCart() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotalContainer = document.getElementById("cart-total");

  cartItemsContainer.innerHTML = "";

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `<div class="empty-cart">Cart is empty</div>`;
    cartTotalContainer.innerHTML = `<h3>Total: $0.00</h3>`;
    return;
  }

  let total = 0;

  cart.forEach(item => {
    total += item.price * item.quantity;

    let cartItem = document.createElement("div");
    cartItem.classList.add("cart-item");
    cartItem.innerHTML = `
      <span>${item.name}</span> 
      <span>$${item.price.toFixed(2)}</span> 
      <span>Qty: ${item.quantity}</span>
    `;
    cartItemsContainer.appendChild(cartItem);
  });

  cartTotalContainer.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
}
