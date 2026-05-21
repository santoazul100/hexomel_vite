// Contact page JavaScript - handles functional form submissions
import "./styles/index.css";
import { toast } from "./toast.js";
import { API_URL } from "./api.js";

// Contact form handler
const contactForm = document.getElementById("contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Get form data using the IDs defined in contact.html
    const formData = {
      name: document.getElementById("contactName").value,
      email: document.getElementById("contactEmail").value,
      subject: document.getElementById("contactSubject").value,
      message: document.getElementById("contactMessage").value,
    };

    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Enviando...';

      const response = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || "Mensagem enviada com sucesso!", "Mensagem Enviada");
        contactForm.reset();
      } else {
        toast.error(result.error || "Ocorreu um erro ao enviar a mensagem.", "Erro no Envio");
      }
    } catch (error) {
      console.error("Contact form error:", error);
      toast.error("Não foi possível ligar ao servidor. Verifique a sua ligação.", "Erro de Rede");
    } finally {
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// Helper function for newsletter (re-implemented from legacy if needed)
const newsletterForm = document.getElementById("newsletter-form");
if (newsletterForm) {
  newsletterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("newsletter-email")?.value;
    if (email) {
      toast.success("Obrigado por subscrever a nossa newsletter!", "Subscrição Ativa");
      newsletterForm.reset();
    }
  });
}

console.log("Contact page module initialized! 📧");
