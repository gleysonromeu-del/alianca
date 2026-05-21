import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type Partida,
  useJogadores,
  useTimeJogadores,
  useTimes,
} from "@/hooks/use-campeonato";

type Stat = {
  jogador_id: string;
  time_id: string;
  presente: boolean;
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
};

export function SumulaForm({ partida }: { partida: Partida }) {
  const qc = useQueryClient();
  const { data: times = [] } = useTimes(partida.campeonato_id);
  const { data: tjs = [] } = useTimeJogadores(partida.campeonato_id);
  const { data: jogadores = [] } = useJogadores();

  const elenco = tjs.filter(
    (x) => x.time_id === partida.time_a_id || x.time_id === partida.time_b_id,
  );

  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: existing } = await supabase
        .from("estatisticas_partida")
        .select("*")
        .eq("partida_id", partida.id);
      const { data: sum } = await supabase
        .from("sumulas")
        .select("observacoes")
        .eq("partida_id", partida.id)
        .maybeSingle();
      const map: Record<string, Stat> = {};
      elenco.forEach((tj) => {
        const e = existing?.find((x) => x.jogador_id === tj.jogador_id);
        map[tj.jogador_id] = {
          jogador_id: tj.jogador_id,
          time_id: tj.time_id,
          presente: e?.presente ?? true,
          gols: e?.gols ?? 0,
          assistencias: e?.assistencias ?? 0,
          amarelos: e?.amarelos ?? 0,
          vermelhos: e?.vermelhos ?? 0,
        };
      });
      setStats(map);
      setObs(sum?.observacoes ?? "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partida.id, tjs.length]);

  function upd(id: string, patch: Partial<Stat>) {
    setStats((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  }

  async function save() {
    setSaving(true);
    try {
      const rows = Object.values(stats).map((s) => ({ ...s, partida_id: partida.id }));
      await supabase.from("estatisticas_partida").delete().eq("partida_id", partida.id);
      if (rows.length > 0) {
        const { error } = await supabase.from("estatisticas_partida").insert(rows);
        if (error) throw error;
      }
      await supabase
        .from("sumulas")
        .upsert({ partida_id: partida.id, observacoes: obs }, { onConflict: "partida_id" });
      toast.success("Súmula salva!");
      qc.invalidateQueries({ queryKey: ["partidas"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      toast.error(`Erro: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  const jogById = new Map(jogadores.map((j) => [j.id, j]));
  const timeNome = (id: string) => times.find((t) => t.id === id)?.nome ?? "—";

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-white/5 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Jogador</th>
              <th className="px-2 py-2 text-left">Time</th>
              <th className="px-2 py-2">Presença</th>
              <th className="px-2 py-2">Gols</th>
              <th className="px-2 py-2">Ass.</th>
              <th className="px-2 py-2">CA</th>
              <th className="px-2 py-2">CV</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(stats).map((s) => (
              <tr key={s.jogador_id} className="border-t border-white/5">
                <td className="px-3 py-2 font-medium">
                  {jogById.get(s.jogador_id)?.apelido ?? "—"}
                </td>
                <td className="px-2 py-2 text-xs text-muted-foreground">
                  {timeNome(s.time_id)}
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={s.presente}
                    onChange={(e) => upd(s.jogador_id, { presente: e.target.checked })}
                  />
                </td>
                {(["gols", "assistencias", "amarelos", "vermelhos"] as const).map((k) => (
                  <td key={k} className="px-1 py-2">
                    <Input
                      type="number"
                      min={0}
                      value={s[k]}
                      onChange={(e) =>
                        upd(s.jogador_id, { [k]: Number(e.target.value) || 0 } as Partial<Stat>)
                      }
                      className="h-8 w-16"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        placeholder="Observações da partida"
        rows={3}
      />
      <Button onClick={save} disabled={saving}>
        {saving ? "Salvando…" : "Salvar súmula"}
      </Button>
    </div>
  );
}