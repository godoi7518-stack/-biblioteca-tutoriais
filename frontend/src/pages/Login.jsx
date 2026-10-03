import { useState } from "react";
import { login, register, getCurrentUser } from "../services/api";

/**
 * Tela de entrada com dois modos no mesmo cartão: "login" e "register"
 * (cadastro). A troca é feita por estado local, sem mudar de página no
 * App.jsx — o usuário ainda não está logado, então não há "view" para
 * navegar, e assim os dois formulários compartilham o mesmo visual.
 */
export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  /** Alterna entre login e cadastro, limpando erro e senhas digitadas. */
  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  /**
   * Login em dois passos: primeiro troca email/senha por um token (e o
   * salva), depois usa esse token pra buscar os dados reais do usuário via
   * GET /auth/me. O backend autentica por e-mail, não por um "username"
   * separado — não existe esse campo no model User.
   */
  async function doLogin() {
    const { access_token } = await login(email, password);
    localStorage.setItem("bt_token", access_token);

    const user = await getCurrentUser();
    onLogin(user);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // "Confirmar senha" é só conferência de digitação, por isso fica no
    // frontend. As regras de verdade (tamanho, campos obrigatórios,
    // e-mail/matrícula únicos) são validadas pelo backend.
    if (isRegister && password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(name, email, matricula, password);
      }
      // Depois de cadastrar, já entra com os mesmos dados — evita obrigar
      // o usuário a digitar tudo de novo na tela de login.
      await doLogin();
    } catch (err) {
      setError(err.message || "Não foi possível concluir. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="mark">BT</div>
          <div>
            <div className="name">Biblioteca de Tutoriais</div>
            <div className="sub">{isRegister ? "Criar uma conta" : "Acesso ao grupo de trabalho"}</div>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={120}
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete={isRegister ? "email" : "username"}
              required
            />
          </div>
          {isRegister && (
            <div className="field">
              <label htmlFor="matricula">Matrícula</label>
              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                maxLength={30}
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="pass">Senha</label>
            <input
              id="pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 6 : undefined}
              required
            />
          </div>
          {isRegister && (
            <div className="field">
              <label htmlFor="pass2">Confirmar senha</label>
              <input
                id="pass2"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          )}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading
              ? isRegister ? "Cadastrando…" : "Entrando…"
              : isRegister ? "Cadastrar" : "Entrar"}
          </button>
        </form>

        <p className="login-note">
          {isRegister ? "Já tem conta? " : "Não tem conta? "}
          <button type="button" className="link-button" onClick={switchMode}>
            {isRegister ? "Entrar" : "Cadastre-se"}
          </button>
        </p>
      </div>
    </div>
  );
}
