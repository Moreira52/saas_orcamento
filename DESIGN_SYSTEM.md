# Budget Box - Design System

Este documento serve como referência única para a identidade visual, paleta de cores, tipografia e componentes padrão do projeto **Budget Box**.

---

## 🎨 Paleta de Cores

O sistema utiliza variáveis CSS nativas (Tailwind v4) definidas em `app/globals.css`.

### Cores Principais (Tema Claro)

| Nome Variável             | Class Tailwind         | Hex Code  | Uso Principal                          |
| ------------------------- | ---------------------- | --------- | -------------------------------------- |
| `--color-bg-light`        | `bg-bg-light`          | `#F7F8FA` | Fundo geral da aplicação (Cinza Gelo)  |
| `--color-card-light`      | `bg-card-light`        | `#FFFFFF` | Fundo de Cards e Paineis (Branco)      |
| `--color-card-hover-light`| `bg-card-hover-light`  | `#F0F2F5` | Estado hover em linhas de tabela/cards |
| `--color-border-light`    | `border-border-light`  | `#E2E8F0` | Bordas sutis e divisores               |

### Cores de Texto

| Nome Variável                | Class Tailwind           | Hex Code  | Uso Principal                          |
| ---------------------------- | ------------------------ | --------- | -------------------------------------- |
| `--color-text-primary-light` | `text-text-primary-light`| `#2D3748` | Títulos, Cabeçalhos, Texto Forte (Dark)|
| `--color-text-muted-light`   | `text-text-muted-light`  | `#6B7280` | Subtítulos, Legendas, Ícones inativos  |

### Cores de Destaque (Accents)

| Nome Variável            | Class Tailwind       | Hex Code  | Uso Principal                            |
| ------------------------ | -------------------- | --------- | ---------------------------------------- |
| `--color-accent-primary` | `bg-accent-primary`  | `#C3F53B` | **Verde Neon** - Ações principais, Botões|
| `--color-accent-orange`  | `bg-accent-orange`   | `#FF9F2D` | Avisos, Gráficos, Destaques secundários  |

---

## 🔡 Tipografia

A fonte padrão é definida automaticamente pelo `next/font` (Geist Sans) mas a estética do projeto pede:

*   **Títulos de Seção / Headers**:
    *   Estilo: `uppercase`
    *   Tracking: `tracking-wide` ou `tracking-tight`
    *   Peso: `font-bold`
    *   Cor: `text-text-primary-light`

---

## 🧩 Componentes Padrão

Adote estes estilos ao criar novas telas para manter a consistência.

### 1. Botões de Ação (Primary)
Botões principais como "Novo Item", "Entrar", "Salvar".
*   **Classes**: `rounded-full bg-accent-primary text-black font-bold h-12 hover:bg-[#B2E030] shadow-[0_0_15px_rgba(195,245,59,0.3)] transition-all`
*   **Ícones**: Geralmente acompanhados de ícones da `lucide-react` (ex: Plus, Chevron).

### 2. Inputs e Campos de Texto
*   **Classes**: `h-12 rounded-xl bg-white border-border-light focus:ring-accent-primary focus:border-accent-primary`
*   **Estado**: Devem ter uma leve sombra ou borda mais forte no foco.

### 3. Cards e Paineis (Containers)
Qualquer agrupamento de informação (Login, Tabelas, Métricas).
*   **Classes**: `bg-card-light border border-border-light rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.05)]`
*   **Notas**: Bordas bem arredondadas (`rounded-3xl`) são a assinatura visual do projeto.

### 4. Tabelas
*   **Header**: Texto uppercase, menor (`text-xs`), cor muted (`text-text-muted-light`).
*   **Linhas**: Hover effect (`hover:bg-card-hover-light`), borda inferior sutil.

---

## 🛠 Configuração Técnica (Tailwind v4)

O projeto utiliza a nova engine do Tailwind 4. As variáveis não estão em `tailwind.config.js`, mas sim diretamente no bloco `@theme` dentro de `app/globals.css`.

Para adicionar novas cores:
1.  Abra `app/globals.css`.
2.  Insira a variável dentro do bloco `@theme inline { ... }`.
3.  O Tailwind detectará automaticamente a nova classe.
