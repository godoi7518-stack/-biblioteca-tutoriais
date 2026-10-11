import { useState, useEffect } from "react";
import { login, register, getCurrentUser } from "../services/api";
import { APP_NAME, APP_INITIALS } from "../config/brand";

// Texto exato que o backend devolve em POST /auth/register quando o e-mail
// já existe (routers/auth.py). Se mudar lá, mudar aqui também: é por ele
// que a tela sabe quando oferecer "Entrar com este e-mail".
const EMAIL_TAKEN = "E-mail já cadastrado";

// Depois de quanto tempo esperando a resposta mostramos o aviso de que o
// servidor está iniciando (hospedagem grátis "dorme" e leva ~1 min para
// acordar na primeira requisição).
const SLOW_AFTER_MS = 5000;

/**
 * Tela de entrada com dois modos no mesmo cartão: "login" e "register"
 * (cadastro). A troca é feita por estado local, sem mudar de página no
 * App.jsx — o usuário ainda não está logado, então não há "view" para
 * navegar, e assim os dois formulários compartilham o mesmo visual.
 *
 * `notice` é um aviso vindo de fora (ex.: "Sua sessão expirou"), mostrado
 * em azul, diferente dos erros (vermelho).
 */
export default function Login({ onLogin, notice: externalNotice = "" }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  // Aviso informativo (não é erro). Começa com o que veio do App.jsx.
  const [notice, setNotice] = useState(externalNotice);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  const isRegister = mode === "register";

  // Se a resposta demorar, avisa que o servidor está iniciando, para a
  // pessoa não achar que travou e sair clicando de novo.
  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  /** Alterna entre login e cadastro, limpando avisos e senhas digitadas. */
  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
  }

  /** Vai para o modo login mantendo o e-mail (usado no "e-mail já cadastrado"). */
  function goToLoginWithEmail() {
    setMode("login");
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
  }

  /**
   * Devolve um onChange que atualiza o campo e apaga o erro: assim que a
   * pessoa começa a corrigir, a mensagem antiga some da tela.
   */
  function editField(setter) {
    return (e) => {
      setter(e.target.value);
      if (error) setError("");
    };
  }

  /**
   * Login em dois passos: primeiro troca email/senha por um token (e o
   * salva), depois usa esse token pra buscar os dados reais do usuário via
   * GET /auth/me. Se o segundo passo falhar, apaga o token: senão ele
   * ficaria salvo sem a pessoa estar de fato dentro do site.
   */
  async function doLogin() {
    const { access_token } = await login(email, password);
    localStorage.setItem("bt_token", access_token);

    try {
      const user = await getCurrentUser();
      onLogin(user);
    } catch (err) {
      localStorage.removeItem("bt_token");
      throw err;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    // "Confirmar senha" é só conferência de digitação, por isso fica no
    // frontend. As regras de verdade (tamanho, campos obrigatórios,
    // e-mail/matrícula únicos) são validadas pelo backend.
    if (isRegister && password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    // Marca se a conta chegou a ser criada, para saber o que dizer caso o
    // login automático logo depois falhe.
    let registered = false;
    try {
      if (isRegister) {
        await register(name, email, matricula, password);
        registered = true;
      }
      // Depois de cadastrar, já entra com os mesmos dados — evita obrigar
      // o usuário a digitar tudo de novo na tela de login.
      await doLogin();
    } catch (err) {
      const message = err.message || "Não foi possível concluir. Tente novamente.";
      if (registered) {
        // A conta existe; só o login automático falhou. Fica no modo
        // login (com e-mail e senha preenchidos) para a pessoa só clicar
        // em "Entrar" — no modo cadastro ela receberia "E-mail já
        // cadastrado" ao tentar de novo.
        setMode("login");
        setConfirmPassword("");
        setNotice("Conta criada! Clique em Entrar para acessar.");
        setError(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  const showLoginWithEmail = isRegister && error === EMAIL_TAKEN;

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="mark">{APP_INITIALS}</div>
          <div>
            <div className="name">{APP_NAME}</div>
            <div className="sub">{isRegister ? "Criar uma conta" : "Acesso ao grupo de trabalho"}</div>
          </div>
        </div>

        {notice && <div className="login-info" role="status">{notice}</div>}
        {error && (
          <div className="login-error" role="alert">
            {error}
            {showLoginWithEmail && (
              <>
                {" "}
                <button type="button" className="link-button" onClick={goToLoginWithEmail}>
                  Entrar com este e-mail
                </button>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={editField(setName)}
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
              onChange={editField(setEmail)}
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
                onChange={editField(setMatricula)}
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
              onChange={editField(setPassword)}
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
                onChange={editField(setConfirmPassword)}
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
          {slow && (
            <p className="login-note" role="status">
              O servidor está iniciando, isso pode levar até 1 minuto…
            </p>
          )}
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
