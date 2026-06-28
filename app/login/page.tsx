"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";

interface FormValues {
  email: string;
  password: string;
  fullName: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: { email: "", password: "", fullName: "" },
    validate: {
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : "E-mail inválido"),
      password: (value) => (value.length >= 6 ? null : "Mínimo de 6 caracteres"),
      fullName: (value) =>
        mode === "sign-up" && value.trim() === "" ? "Informe seu nome" : null,
    },
  });

  async function handleSubmit(values: FormValues) {
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from("team_members").upsert({
            id: data.user.id,
            full_name: values.fullName,
            email: values.email,
          });
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          notifications.show({
            title: "Confirme seu e-mail",
            message: "Enviamos um link de confirmação para o e-mail informado.",
          });
        }
      }
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Erro",
        message: getErrorMessage(err, "Não foi possível continuar."),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container size={420} my={80}>
      <Title ta="center">SEICO</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {mode === "sign-in" ? "Entre na sua conta" : "Crie sua conta"}
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {mode === "sign-up" && (
              <TextInput
                label="Nome completo"
                placeholder="Seu nome"
                {...form.getInputProps("fullName")}
              />
            )}
            <TextInput
              label="E-mail"
              placeholder="voce@exemplo.com"
              {...form.getInputProps("email")}
            />
            <PasswordInput
              label="Senha"
              placeholder="Sua senha"
              {...form.getInputProps("password")}
            />
            <Button type="submit" loading={loading} fullWidth mt="md">
              {mode === "sign-in" ? "Entrar" : "Criar conta"}
            </Button>
          </Stack>
        </form>

        <Text ta="center" size="sm" mt="md">
          {mode === "sign-in" ? (
            <>
              Ainda não tem conta?{" "}
              <Anchor onClick={() => setMode("sign-up")}>Criar conta</Anchor>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <Anchor onClick={() => setMode("sign-in")}>Entrar</Anchor>
            </>
          )}
        </Text>
      </Paper>
    </Container>
  );
}
