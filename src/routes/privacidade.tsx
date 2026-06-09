import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  component: PrivacidadePage,
  head: () => ({
    meta: [{ title: "Política de Privacidade — Aliança do Campo Grande" }],
  }),
});

function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background px-5 py-16">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-8 shadow-xl">
        <Link to="/" className="text-sm text-primary hover:underline">← Voltar ao site</Link>

        <h1 className="mt-6 text-3xl font-bold text-foreground">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>

        <div className="mt-8 space-y-8 text-sm text-foreground/80 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Quem somos</h2>
            <p>
              O <strong>Aliança do Campo Grande Esporte Clube</strong> é um clube de futebol amador localizado
              em Campo Grande, São Paulo. Este site é mantido de forma voluntária pela diretoria do clube
              e tem como objetivo conectar jogadores, torcedores e a comunidade.
            </p>
            <p className="mt-2">
              Dúvidas sobre esta política podem ser enviadas para:{" "}
              <a href="mailto:aliancacgec2004@gmail.com" className="text-primary hover:underline">
                aliancacgec2004@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Quais dados coletamos</h2>
            <p>Coletamos apenas os dados necessários para o funcionamento do clube:</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li><strong>Dados de cadastro:</strong> nome completo, apelido, CPF, data de nascimento, telefone, e-mail, posição e número de camisa.</li>
              <li><strong>Dados de inscrição:</strong> os mesmos acima, mais quem indicou o jogador.</li>
              <li><strong>Conteúdo enviado:</strong> fotos, vídeos e mensagens enviados voluntariamente pelo usuário.</li>
              <li><strong>Dados de acesso:</strong> endereço IP e data/hora de acesso, coletados automaticamente pela infraestrutura Cloudflare.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Para que usamos seus dados</h2>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>Gerenciar inscrições e cadastros de jogadores</li>
              <li>Organizar campeonatos e partidas</li>
              <li>Comunicar informações sobre o clube</li>
              <li>Exibir fotos e vídeos no carrossel do site (após aprovação)</li>
              <li>Prevenir abusos e garantir a segurança do sistema</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Base legal (LGPD)</h2>
            <p>
              O tratamento de dados é realizado com base no <strong>consentimento</strong> do titular
              (Art. 7º, I da Lei 13.709/2018), obtido no momento do cadastro, e no
              <strong> legítimo interesse</strong> do clube para gestão das atividades esportivas
              (Art. 7º, IX da LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Compartilhamento de dados</h2>
            <p>
              Seus dados <strong>não são vendidos</strong> a terceiros. Utilizamos os seguintes
              serviços para operação do site, cada um com sua própria política de privacidade:
            </p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li><strong>Supabase</strong> — banco de dados e autenticação (supabase.com)</li>
              <li><strong>Cloudflare</strong> — hospedagem e proteção contra bots (cloudflare.com)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Por quanto tempo guardamos seus dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Dados de jogadores
              inativos são mantidos por até 2 anos para fins históricos do clube, após o que
              são anonimizados ou excluídos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Seus direitos</h2>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li><strong>Acesso:</strong> saber quais dados temos sobre você</li>
              <li><strong>Correção:</strong> corrigir dados incompletos ou incorretos</li>
              <li><strong>Exclusão:</strong> solicitar a exclusão dos seus dados pessoais</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
              <li><strong>Revogação do consentimento:</strong> retirar seu consentimento a qualquer momento</li>
            </ul>
            <p className="mt-2">
              Para exercer qualquer um desses direitos, envie um e-mail para{" "}
              <a href="mailto:aliancacgec2004@gmail.com" className="text-primary hover:underline">
                aliancacgec2004@gmail.com
              </a>{" "}
              com o assunto <em>"Direitos LGPD"</em>. Responderemos em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Segurança</h2>
            <p>
              Adotamos medidas técnicas para proteger seus dados, incluindo criptografia em
              trânsito (HTTPS), controle de acesso por autenticação e proteção contra bots
              via Cloudflare Turnstile.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Cookies</h2>
            <p>
              Este site utiliza apenas cookies essenciais para manter sua sessão autenticada.
              Não utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Alterações nesta política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. A data da última atualização
              está sempre indicada no topo desta página.
            </p>
          </section>

        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <Link to="/" className="text-sm text-primary hover:underline">← Voltar ao site</Link>
        </div>
      </div>
    </div>
  );
}
