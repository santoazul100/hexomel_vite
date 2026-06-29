# Explicação do Dashboard Financeiro e Monetização do Hexomel

Este documento explica de forma detalhada o funcionamento das métricas financeiras apresentadas no Painel de Administração do **Hexomel**, a lógica de comissões e custos associados, e como o novo simulador interativo ajuda a projetar a rentabilidade do negócio com base no estudo de monetização.

---

## 1. Métricas Principais do Dashboard

No topo do Dashboard e na aba **Vendas & Lucro**, são apresentadas as seguintes métricas calculadas em tempo real a partir das encomendas registadas no sistema (excluindo encomendas canceladas):

*   **Vendas Brutas / Receita Total (GMV - Gross Merchandise Value)**: 
    Representa o valor total acumulado de todas as transações realizadas no marketplace pelos clientes.
    $$\text{GMV} = \sum \text{Valor das Encomendas Ativas}$$

*   **Ticket Médio**:
    Indica o valor médio gasto pelos clientes por cada encomenda concluída na plataforma.
    $$\text{Ticket Médio} = \frac{\text{GMV}}{\text{Número de Encomendas Ativas}}$$

---

## 2. Estrutura de Monetização (Modelo de Negócio)

Conforme as diretrizes do **Estudo de Monetização**, a plataforma Hexomel adota um modelo baseado em comissões sobre as vendas de mel e workshops, estruturado da seguinte forma:

1.  **Taxa de Comissão (Take Rate) — 10%**:
    A principal fonte de receita do marketplace. Uma comissão de **10%** é cobrada sobre o valor bruto de cada transação do apicultor.
    $$\text{Receita de Comissão} = \text{GMV} \times 0.10$$

2.  **Custos de Gateway de Pagamento — 2%**:
    Taxas variáveis cobradas pelas entidades processadoras de pagamentos (Stripe, MB Way, Referência Multibanco, etc.), estimadas em **2%** do valor bruto da transação.
    $$\text{Custos de Gateway} = \text{GMV} \times 0.02$$

3.  **Margem de Contribuição / Receita Líquida da Plataforma — 8%**:
    O valor real que sobra para a plataforma após a dedução dos custos financeiros de transação, antes de pagar os custos fixos.
    $$\text{Receita Líquida} = \text{Receita de Comissão} - \text{Custos de Gateway} = \text{GMV} \times 0.08$$

4.  **Custos Operacionais Fixos — €2.000,00/mês**:
    Custos fixos de manutenção da plataforma, incluindo alojamento web (servidores cloud), licenças de software, suporte e marketing digital.

5.  **Balanço / Lucro Líquido**:
    O ganho final obtido pelo operador da plataforma após a liquidação de todos os custos fixos e variáveis.
    $$\text{Lucro Líquido} = \text{Receita Líquida (8\%)} - \text{Custos Fixos (€2.000)}$$

---

## 3. Ponto de Equilíbrio (Break-Even Point)

O ponto de equilíbrio representa o volume de vendas brutas (GMV) mensais necessário para que a plataforma atinja um lucro líquido de **€0,00** (ou seja, quando as receitas líquidas cobrem exatamente os custos operacionais fixos).

Para cobrir os custos fixos de **€2.000,00/mês** com uma margem de contribuição líquida de **8%**:
$$\text{GMV de Break-Even} = \frac{\text{Custos Fixos}}{\text{Margem Líquida (\%)}} = \frac{€2.000,00}{0.08} = €25.000,00$$

*   **Abaixo de €25.000,00/mês em vendas**: A plataforma opera em prejuízo (balanço líquido negativo).
*   **Acima de €25.000,00/mês em vendas**: A plataforma começa a gerar lucro líquido real.

---

## 4. O Novo Painel "Vendas & Lucro"

Para dar total visibilidade financeira ao administrador, foi criada a aba **Vendas & Lucro** no painel lateral de administração, que disponibiliza:

### A. Cartões de Métricas Financeiras Reais
*   **Vendas Brutas (GMV)** reais acumuladas na base de dados.
*   **Comissão Bruta (10%)** que a plataforma reteve.
*   **Custos de Gateway (2%)** estimados.
*   **Receita Líquida (8%)** ganha pela plataforma antes de deduzir custos fixos.

### B. Histórico Detalhado de Encomendas
Uma tabela completa com a divisão exata de cada venda:
$$\text{Bruto} \rightarrow 10\% \text{ Comissão} \rightarrow 2\% \text{ Gateway} \rightarrow 8\% \text{ Plataforma} \rightarrow 90\% \text{ Apicultor}$$

### C. Simulador de Lucro Mensal Interativo
Um formulário que permite simular metas financeiras futuras:
*   Insira a meta de **GMV Mensal** desejado.
*   Ajuste os **Custos Fixos** previstos.
*   O sistema calcula instantaneamente a comissão bruta, os custos de gateway, a margem líquida e o **Lucro Líquido Final**, indicando visualmente se a plataforma estará acima ou abaixo do **Ponto de Equilíbrio**.
