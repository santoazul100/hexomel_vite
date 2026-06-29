const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } = require('docx');

async function generateDoc() {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "Resumo Executivo e Tecnológico: Hexomel",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "O projeto Hexomel é um website de comércio eletrónico de mel português, desenvolvido com foco em performance, design minimalista e interatividade dinâmica. Utiliza arquitetura SPA no frontend com Vanilla JavaScript e Vite, e uma API RESTful Node.js/Express no backend conectada a uma base de dados MySQL.", size: 24 }),
                    ],
                    spacing: { after: 400 },
                }),
                new Paragraph({
                    text: "1. Tecnologias Core",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "- Frontend:", bold: true, size: 24 }),
                        new TextRun({ text: " HTML5, CSS3, Vanilla JavaScript, Vite, View Transitions API.", size: 24 }),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "- Backend:", bold: true, size: 24 }),
                        new TextRun({ text: " Node.js, Express, JWT, Multer, Nodemailer.", size: 24 }),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "- Base de Dados:", bold: true, size: 24 }),
                        new TextRun({ text: " MySQL 8.0.", size: 24 }),
                    ],
                    spacing: { after: 400 },
                }),
                
                new Paragraph({
                    text: "2. Principais Funcionalidades",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "BeeAnimator:", bold: true, size: 24 }),
                        new TextRun({ text: " Sistema procedimental de abelhas com efeito parallax.", size: 24 }),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Experiência SPA Nativa:", bold: true, size: 24 }),
                        new TextRun({ text: " Transições sem cintilação entre páginas.", size: 24 }),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Autenticação e 2FA:", bold: true, size: 24 }),
                        new TextRun({ text: " Segurança no checkout com códigos OTP enviados por email.", size: 24 }),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Experiência 3D Interativa:", bold: true, size: 24 }),
                        new TextRun({ text: " Frasco de mel renderizado em Three.js simulando diferentes tipos de mel.", size: 24 }),
                    ],
                    spacing: { after: 400 },
                }),

                new Paragraph({
                    text: "3. Interfaces do Projeto",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({ text: "Página Inicial (Homepage)", heading: HeadingLevel.HEADING_3 }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: fs.readFileSync("./estudo/prints_projeto/homepage_hexomel.png"),
                            transformation: { width: 600, height: 350 }
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }),
                new Paragraph({ text: "Loja Interativa", heading: HeadingLevel.HEADING_3 }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: fs.readFileSync("./estudo/prints_projeto/shop_hexomel.png"),
                            transformation: { width: 600, height: 350 }
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }),
                new Paragraph({ text: "Curiosidades em 3D", heading: HeadingLevel.HEADING_3 }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: fs.readFileSync("./estudo/prints_projeto/curiosidades_hexomel.png"),
                            transformation: { width: 600, height: 350 }
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }),
                new Paragraph({ text: "Dashboard de Administração", heading: HeadingLevel.HEADING_3 }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: fs.readFileSync("./estudo/prints_projeto/admin_hexomel.png"),
                            transformation: { width: 600, height: 350 }
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                })
            ]
        }]
    });

    Packer.toBuffer(doc).then((buffer) => {
        fs.writeFileSync("./estudo/relatorio/Relatorio_Final_Hexomel.docx", buffer);
        console.log("Documento gerado com sucesso em: ./estudo/relatorio/Relatorio_Final_Hexomel.docx");
    }).catch(err => {
        console.error("Erro a gerar documento:", err);
    });
}

generateDoc();
