import { useMemo, useState } from "react";
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type Time,
  type TimeJogador,
  type JogadorLite,
  useJogadores,
  useTimeJogadores,
  useTimes,
} from "@/hooks/use-campeonato";

function Player({ j, source }: { j: JogadorLite; source: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${source}:${j.id}`,
    data: { jogadorId: j.id, source },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium select-none ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {j.apelido}
      <span className="ml-2 text-xs text-muted-foreground">{j.posicao}</span>
    </div>
  );
}

function Column({
  id,
  title,
  color,
  children,
}: {
  id: string;
  title: string;
  color?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 min-h-[280px] transition-colors ${
        isOver ? "border-accent bg-accent/10" : "border-white/10 bg-white/5"
      }`}
      style={color ? { borderTopWidth: 4, borderTopColor: color } : undefined}
    >
      <p className="mb-3 text-sm font-bold uppercase tracking-wider">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function DraftBoard({ campeonatoId }: { campeonatoId: string }) {
  const qc = useQueryClient();
  const { data: times = [] } = useTimes(campeonatoId);
  const { data: tjs = [] } = useTimeJogadores(campeonatoId);
  const { data: jogadores = [] } = useJogadores();
  const [busy, setBusy] = useState(false);

  const assignedMap = useMemo(() => {
    const m = new Map<string, string>(); // jogadorId -> timeId
    tjs.forEach((tj) => m.set(tj.jogador_id, tj.time_id));
    return m;
  }, [tjs]);

  const disponiveis = jogadores.filter((j) => !assignedMap.has(j.id));

  async function move(jogadorId: string, destTimeId: string | null) {
    setBusy(true);
    try {
      const current = tjs.find((x) => x.jogador_id === jogadorId);
      if (current && destTimeId === current.time_id) return;
      if (current) {
        const { error } = await supabase.from("time_jogadores").delete().eq("id", current.id);
        if (error) throw error;
      }
      if (destTimeId) {
        const { error } = await supabase
          .from("time_jogadores")
          .insert({ time_id: destTimeId, jogador_id: jogadorId, campeonato_id: campeonatoId });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["time-jogadores", campeonatoId] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      toast.error(`Erro ao mover: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const data = e.active.data.current as { jogadorId: string; source: string } | undefined;
    if (!data) return;
    const dest = String(e.over.id);
    const destTimeId = dest === "disponiveis" ? null : dest;
    void move(data.jogadorId, destTimeId);
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className={`grid gap-4 lg:grid-cols-5 ${busy ? "opacity-70" : ""}`}>
        <Column id="disponiveis" title={`Disponíveis (${disponiveis.length})`}>
          {disponiveis.length === 0 && (
            <p className="text-xs text-muted-foreground">Todos escalados.</p>
          )}
          {disponiveis.map((j) => (
            <Player key={j.id} j={j} source="disponiveis" />
          ))}
        </Column>
        {times.map((t: Time) => {
          const elenco = tjs
            .filter((x) => x.time_id === t.id)
            .map((x) => jogadores.find((j) => j.id === x.jogador_id))
            .filter(Boolean) as JogadorLite[];
          return (
            <Column
              key={t.id}
              id={t.id}
              title={`${t.nome} (${elenco.length})`}
              color={t.cor ?? undefined}
            >
              {elenco.map((j) => (
                <Player key={j.id} j={j} source={t.id} />
              ))}
            </Column>
          );
        })}
      </div>
    </DndContext>
  );
}