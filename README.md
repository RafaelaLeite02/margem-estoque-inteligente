# Margem Estoque Inteligente

Prompt para colar na ferramenta: "Crie um Dashboard moderno de Análise de Operações e Vendas com Inteligência Artificial em Português (PT-BR), com tema escuro/limpo e layout profissional.

Funcionalidades obrigatórias:

Upload de CSV + Dados de Exemplo: Um botão para fazer upload de um arquivo .csv (colunas: data, produto, categoria, quantidade_vendida, preco_unitario, custo_unitario, estoque_atual, estoque_minimo) e um botão 'Carregar Dados de Demonstração' já preenchido para que qualquer recrutador que abrir o link consiga testar sem ter um arquivo em mãos.

KPIs no Topo: Faturamento Total, Lucro Líquido Total, Margem Média (%) e Total de Itens em Estoque Crítico.

Gráficos Interativos: Um gráfico de barras mostrando Faturamento vs. Lucro por Produto e um gráfico de rosca mostrando participação por Categoria.

Tabela de Estoque e Rentabilidade: Tabela listando os produtos com badges de status ('Crítico' em vermelho quando estoque_atual <= estoque_minimo, e 'Normal' em verde).

Analista de Operações IA (Integração Gemini API): Um painel lateral ou seção destacada com um campo para inserir a API Key do Gemini (com opção de usar uma variável de ambiente VITE_GEMINI_API_KEY se configurada) e um botão 'Gerar Diagnóstico Estratégico'. Ao clicar, envie o resumo dos dados da tabela para o modelo gemini-2.5-flash pedindo: (a) 3 alertas urgentes de reposição de estoque, (b) os 2 produtos mais lucrativos para escalar marketing, e (c) 3 ações práticas para aumentar a margem operacional esta semana. Exiba a resposta formatada em cards limpos."

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7326ab34-fa41-40c5-b9e4-9f3cc9dc8c61).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
