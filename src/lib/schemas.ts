import { z } from "zod";

// ─── Validador de CPF (dígitos verificadores) ─────────────────────────────────
function validarCPF(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, "");
  if (nums.length !== 11) return false;
  if (/^(\d)\1+$/.test(nums)) return false; // todos iguais (000...000)

  const calc = (fator: number) => {
    let soma = 0;
    for (let i = 0; i < fator - 1; i++) soma += parseInt(nums[i]) * (fator - i);
    const resto = (soma * 10) % 11;
    return resto === 10 || resto === 11 ? 0 : resto;
  };

  return calc(10) === parseInt(nums[9]) && calc(11) === parseInt(nums[10]);
}

// ─── Campo CPF reutilizável ───────────────────────────────────────────────────
const cpfField = z
  .string()
  .min(11, "CPF inválido")
  .refine((v) => validarCPF(v), "CPF inválido — verifique os dígitos");

// ─── Schema de cadastro ───────────────────────────────────────────────────────
export const schemaCadastro = z
  .object({
    nome_completo: z.string().min(3, "Nome muito curto").max(100, "Nome muito longo").trim(),
    apelido: z.string().min(2, "Apelido muito curto").max(40, "Apelido muito longo").trim(),
    cpf: cpfField,
    data_nascimento: z.string().min(1, "Informe a data de nascimento"),
    profissao: z.string().max(60, "Profissão muito longa").trim().optional(),
    telefone: z
      .string()
      .min(10, "Telefone inválido")
      .max(20, "Telefone inválido")
      .regex(/^[\d\s\-\(\)\+]+$/, "Telefone inválido"),
    posicao: z.string().min(1, "Selecione uma posição"),
    numero_camisa: z.coerce.number().min(1).max(200).optional().or(z.literal("")),
    email: z.string().email("E-mail inválido").max(100, "E-mail muito longo").toLowerCase().trim(),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .max(72, "Senha muito longa")
      .regex(/[A-Za-z]/, "A senha deve conter pelo menos uma letra")
      .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
    confirmar_password: z.string(),
  })
  .refine((d) => d.password === d.confirmar_password, {
    message: "As senhas não coincidem",
    path: ["confirmar_password"],
  });

export type CadastroForm = z.infer<typeof schemaCadastro>;

// ─── Schema de inscrição ──────────────────────────────────────────────────────
export const schemaInscricao = z.object({
  nome_completo: z.string().min(3, "Nome muito curto").max(100, "Nome muito longo").trim(),
  apelido: z.string().min(2, "Apelido muito curto").max(40, "Apelido muito longo").trim(),
  cpf: cpfField,
  telefone: z
    .string()
    .min(10, "Telefone inválido")
    .max(20, "Telefone inválido")
    .regex(/^[\d\s\-\(\)\+]+$/, "Telefone inválido"),
  data_nascimento: z.string().min(1, "Informe a data de nascimento"),
  profissao: z.string().max(60, "Profissão muito longa").trim().optional(),
  posicao: z.string().min(1, "Selecione uma posição"),
  email: z.string().email("E-mail inválido").max(100, "E-mail muito longo").toLowerCase().trim(),
  quem_indicou: z.string().min(2, "Informe quem te indicou").max(100, "Nome muito longo").trim(),
});

export type InscricaoForm = z.infer<typeof schemaInscricao>;

// ─── Schema de sugestão ───────────────────────────────────────────────────────
export const schemaSugestao = z.object({
  tipo: z.enum(["sugestao", "comentario", "ideia"]),
  mensagem: z
    .string()
    .min(5, "Mensagem muito curta — escreva pelo menos 5 caracteres")
    .max(500, "Mensagem muito longa — máximo 500 caracteres")
    .trim(),
  anonimo: z.boolean(),
});

export type SugestaoForm = z.infer<typeof schemaSugestao>;
