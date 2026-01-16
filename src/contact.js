// Contact page JavaScript - handles form submissions
import "./styles/index.css";

// Contact form handler
const contactForm = document.getElementById("contact-form");
const formMessage = document.getElementById("form-message");

if (contactForm) {
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Get form data
    const formData = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      subject: document.getElementById("subject").value,
      message: document.getElementById("message").value,
      subscribe: document.getElementById("subscribe").checked,
    };

    // Validate
    if (!formData.name || !formData.email || !formData.message) {
      showMessage(formMessage, "Please fill in all required fields.", "error");
      return;
    }

    // Simulate sending (in real app, this would send to backend)
    console.log("Contact form submission:", formData);

    // Store in localStorage for demonstration
    const submissions = JSON.parse(
      localStorage.getItem("hexomel_contacts") || "[]"
    );
    submissions.push({
      ...formData,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("hexomel_contacts", JSON.stringify(submissions));

    // If subscribe is checked, also add to newsletter
    if (formData.subscribe) {
      addToNewsletter(formData.email);
    }

    // Show success message
    showMessage(
      formMessage,
      "✅ Thank you for your message! We'll get back to you soon.",
      "success"
    );

    // Reset form
    contactForm.reset();
  });
}

// Newsletter form handler
const newsletterForm = document.getElementById("newsletter-form");
const newsletterMessage = document.getElementById("newsletter-message");

if (newsletterForm) {
  newsletterForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("newsletter-email").value;

    if (!email || !isValidEmail(email)) {
      showMessage(
        newsletterMessage,
        "Please enter a valid email address.",
        "error"
      );
      return;
    }

    addToNewsletter(email);
    showMessage(
      newsletterMessage,
      "✅ Successfully subscribed! Welcome to the Hexomel family.",
      "success"
    );

    newsletterForm.reset();
  });
}

// Helper functions
function addToNewsletter(email) {
  const subscribers = JSON.parse(
    localStorage.getItem("hexomel_newsletter") || "[]"
  );

  // Check if already subscribed
  if (subscribers.includes(email)) {
    console.log("Already subscribed:", email);
    return;
  }

  subscribers.push(email);
  localStorage.setItem("hexomel_newsletter", JSON.stringify(subscribers));
  console.log("Added to newsletter:", email);
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.style.display = "block";
  element.style.padding = "1rem";
  element.style.borderRadius = "0.5rem";
  element.style.fontWeight = "500";

  if (type === "success") {
    element.style.background = "#d4edda";
    element.style.color = "#155724";
    element.style.border = "1px solid #c3e6cb";
  } else {
    element.style.background = "#f8d7da";
    element.style.color = "#721c24";
    element.style.border = "1px solid #f5c6cb";
  }

  // Hide after 5 seconds
  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

console.log("Contact page loaded! 📧");
