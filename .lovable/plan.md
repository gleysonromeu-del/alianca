
# Módulo Campeonato Mensal

Substituir a seção **"Nosso Impacto"** da home pela seção pública do **Campeonato Mensal** e adicionar um painel admin completo para gestão de times, draft, partidas, súmulas e estatísticas. Mantém todo o sistema existente (auth, tabela `jogadores`, layout, watermark).

## 1. Banco de dados (Supabase)

Criar 7 tabelas novas (nenhuma alteração nas existentes):

- `campeonato_mensal` — id, mes (date, primeiro dia do mês), status (`aberto` | `encerrado`), campeao_time_id, pagador_cerveja_time_id, created_at
- `times` — id, campeonato_id (fk), nome, escudo_url, capitao_id (fk jogadores), cor (hex), pontos (int), vitorias, empates, derrotas, gols_pro, gols_contra, saldo (int gerado), permanece (bool — marca o campeão que segue para o próximo mês)
- `time_jogadores` — id, time_id, jogador_id (fk jogadores), UNIQUE(campeonato_id, jogador_id) via trigger para evitar duplicação no mesmo mês
- `partidas` — id, campeonato_id, time_a_id, time_b_id, data, gols_a, gols_b, status (`agendada` | `finalizada`), observacoes
- `estatisticas_partida` — id, partida_id, jogador_id, time_id, gols, assistencias, amarelos, vermelhos, presente (bool)
- `sumulas` — id, partida_id, observacoes (text), created_by, created_at
- `historico_campeoes` — id, campeonato_id, time_id, mes, tipo (`campeao` | `pagador_cerveja`), nome_time_snapshot, jogadores_snapshot (jsonb)

RLS:
- SELECT público em todas (site público mostra classificação e campeão).
- INSERT/UPDATE/DELETE somente para `admin` via `has_role(auth.uid(), 'admin')`.

Função/Trigger:
- Trigger `recalcular_classificacao()` em `partidas` AFTER INSERT/UPDATE: recalcula pontos/saldo de todos os times do campeonato.
- Função `encerrar_campeonato(campeonato_id)`: marca campeão (1º lugar) + pagador de cerveja (último), salva em `historico_campeoes`, marca `permanece=true` no time campeão, cria próximo `campeonato_mensal` aberto e copia o time campeão (com seus jogadores) automaticamente. Os outros jogadores ficam livres.

## 2. Rotas novas

- `/campeonato` — página pública: classificação do mês, próximas partidas, últimos resultados, time campeão atual, hall da fama (histórico) + pagadores de cerveja.
- `/admin/campeonato` — dashboard admin protegido (usa `useIsAdmin` existente). Abas:
  - **Times**: criar/editar 4 times do mês (nome, escudo upload, capitão, cor).
  - **Draft**: drag-and-drop (lib `@dnd-kit/core`) — coluna "Disponíveis" + 4 colunas de times. Salva em `time_jogadores`.
  - **Partidas**: cadastrar jogos, lançar placar, status.
  - **Súmula**: por partida, registrar presença/gols/assistências/cartões por jogador + observações. Persiste em `estatisticas_partida` e `sumulas`.
  - **Encerrar mês**: botão com confirmação que chama `encerrar_campeonato`.

## 3. Componente na home

Substituir `<ImpactStats />` por `<CampeonatoMensalSection />`:
- Header dourado "Campeonato Mensal — {mês/ano}".
- Card grande do **Time Campeão Atual** (escudo + nome + capitão) à esquerda.
- Mini-tabela de classificação (4 linhas: time, P, SG, Pts) à direita.
- Faixa inferior: "🍺 Pagador de cerveja do mês passado: {time}".
- CTA dourado "Ver campeonato completo" → `/campeonato`.
- Realtime: `supabase.channel` em `times` e `partidas` → refetch via React Query.

## 4. Estrutura de arquivos

```
src/
  routes/
    campeonato.tsx                 (pública)
    admin.campeonato.tsx           (admin, gated)
  components/
    site/
      CampeonatoMensalSection.tsx  (substitui ImpactStats na home)
      ClassificacaoTable.tsx
      CampeaoCard.tsx
      HistoricoCampeoes.tsx
    admin/
      TimesManager.tsx
      DraftBoard.tsx               (dnd-kit)
      PartidasManager.tsx
      SumulaForm.tsx
      EncerrarMesButton.tsx
  hooks/
    use-campeonato.ts              (queries + realtime)
```

Edita `src/routes/index.tsx`: troca `<ImpactStats />` por `<CampeonatoMensalSection />`. `ImpactStats.tsx` permanece no repo (não removido) caso queiram reusar depois.

## 5. Dependências

- `@dnd-kit/core` + `@dnd-kit/sortable` (drag-and-drop do draft).
- Demais libs (React Query, Supabase, Framer Motion, shadcn) já estão no projeto.

## 6. Design

- Reusa tokens existentes (`--primary` azul escuro, `--accent` dourado, glass cards, `--shadow-elegant`).
- Campeão com glow dourado + badge "👑 Campeão do Mês".
- Pagador de cerveja com badge âmbar 🍺.
- Tudo responsivo mobile-first.

## Detalhes técnicos

- Queries via React Query + `supabase` client (browser).
- Mutations idem; invalidação por `queryKey` + canal realtime para sincronizar entre admins.
- Upload de escudo: bucket `escudos` (público), criado na migration.
- Validação: nenhum jogador em 2 times do mesmo `campeonato_id` (constraint + checagem na UI do draft).
- `useIsAdmin` já existente protege `/admin/campeonato` — redireciona para `/login` se não admin.
- Não toca em `jogadores`, auth, ou qualquer rota existente além de `index.tsx` (uma linha).

## Fora de escopo

- Edição em massa de jogadores (continua no fluxo atual).
- Notificações por WhatsApp/email.
- Exportação PDF da súmula (pode vir depois se quiserem).
