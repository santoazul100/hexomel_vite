
import mysql from "mysql2/promise";
import { getServerDbConfig } from "../config/env.js";

const setupCommunityTables = async () => {
  let connection;
  try {
    connection = await mysql.createConnection(getServerDbConfig({ multipleStatements: true }));

    const sql = `
USE \`hexomel\`;

CREATE TABLE IF NOT EXISTS \`pergunta_comunidade\` (
  \`ID_Pergunta\` int(10) NOT NULL AUTO_INCREMENT,
  \`ID_Cliente\` int(10) NOT NULL,
  \`Texto\` text NOT NULL,
  \`Votos\` int(11) DEFAULT 0,
  \`Data_Criacao\` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (\`ID_Pergunta\`),
  KEY \`ID_Cliente\` (\`ID_Cliente\`),
  CONSTRAINT \`fk_pergunta_cliente\` FOREIGN KEY (\`ID_Cliente\`) REFERENCES \`cliente\` (\`ID_Cliente\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`resposta_comunidade\` (
  \`ID_Resposta\` int(10) NOT NULL AUTO_INCREMENT,
  \`ID_Pergunta\` int(10) NOT NULL,
  \`ID_Cliente\` int(10) NOT NULL,
  \`Texto\` text NOT NULL,
  \`Votos\` int(11) DEFAULT 0,
  \`Melhor_Resposta\` tinyint(1) DEFAULT 0,
  \`Data_Criacao\` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (\`ID_Resposta\`),
  KEY \`ID_Pergunta\` (\`ID_Pergunta\`),
  KEY \`ID_Cliente\` (\`ID_Cliente\`),
  CONSTRAINT \`fk_resposta_pergunta\` FOREIGN KEY (\`ID_Pergunta\`) REFERENCES \`pergunta_comunidade\` (\`ID_Pergunta\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_resposta_cliente\` FOREIGN KEY (\`ID_Cliente\`) REFERENCES \`cliente\` (\`ID_Cliente\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`voto_pergunta\` (
  \`ID_Cliente\` int(10) NOT NULL,
  \`ID_Pergunta\` int(10) NOT NULL,
  PRIMARY KEY (\`ID_Cliente\`, \`ID_Pergunta\`),
  CONSTRAINT \`fk_voto_pergunta_cliente\` FOREIGN KEY (\`ID_Cliente\`) REFERENCES \`cliente\` (\`ID_Cliente\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_voto_pergunta_pergunta\` FOREIGN KEY (\`ID_Pergunta\`) REFERENCES \`pergunta_comunidade\` (\`ID_Pergunta\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`voto_resposta\` (
  \`ID_Cliente\` int(10) NOT NULL,
  \`ID_Resposta\` int(10) NOT NULL,
  PRIMARY KEY (\`ID_Cliente\`, \`ID_Resposta\`),
  CONSTRAINT \`fk_voto_resposta_cliente\` FOREIGN KEY (\`ID_Cliente\`) REFERENCES \`cliente\` (\`ID_Cliente\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_voto_resposta_resposta\` FOREIGN KEY (\`ID_Resposta\`) REFERENCES \`resposta_comunidade\` (\`ID_Resposta\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    console.log("Adding community tables...");
    await connection.query(sql);
    console.log("Successfully added pergunta_comunidade and resposta_comunidade.");
    
    await connection.end();
  } catch (error) {
    console.error("Error adding community tables:", error);
    if (connection) await connection.end();
  }
};

setupCommunityTables();
