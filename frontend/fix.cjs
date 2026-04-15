const fs = require('fs');

let content = fs.readFileSync('src/auth.js', 'utf8');

const regex = /Swal\.fire\(\{\s*icon:\s*"success",\s*title:\s*"Registo Concluído!",[\s\S]*?\}\);/;
const replacement = `localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          if (typeof updateNav === "function") {
            updateNav(data.user);
          }

          Swal.fire({
            icon: "success",
            title: "Conta criada!",
            text: "Bem-vindo(a) à Hexomel.",
            showConfirmButton: false,
            timer: 1500,
          }).then(() => {
            window.location.reload();
          });`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/auth.js', newContent, 'utf8');
console.log("Replaced:", newContent !== content);
