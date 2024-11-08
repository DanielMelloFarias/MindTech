import React, { useState } from 'react';
import { auth, provider } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Login bem-sucedido');
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setError('Email ou senha incorretos. Tente novamente.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      console.log('Login com Google bem-sucedido');
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      setError('Erro ao autenticar com Google. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
          {/* Logo Section */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text">
              Mind Tech
            </h1>
            <p className="text-slate-600 text-sm md:text-base">
              Transformando sessões em insights
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div className="relative flex items-center">
              <Mail className="absolute left-3 text-slate-400 w-5 h-5" />
              <input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-slate-600 placeholder:text-slate-400"
              />
            </div>

{/* Password Input */}
<div className="relative flex items-center">
  <Lock className="absolute left-3 text-slate-400 w-5 h-5" />
  <input
    type={showPassword ? "text" : "password"}
    placeholder="Sua senha"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-slate-600 placeholder:text-slate-400"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-auto bottom-0 flex items-center justify-center bg-transparent border-none text-slate-400 hover:text-purple-500 hover:bg-transparent transition-colors group focus:outline-none"
    tabIndex="-1"
    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
  >
    {showPassword ? (
      <EyeOff className="w-5 h-5" />
    ) : (
      <Eye className="w-5 h-5" />
    )}
  </button>
</div>



            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <a href="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700">
                Esqueceu a senha?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 text-white py-2.5 rounded-lg font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transform hover:-translate-y-0.5 transition-all duration-200 mt-6"
            >
              Entrar
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">ou continue com</span>
            </div>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 p-2.5 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span>Entrar com Google</span>
          </button>

          {/* Register Link */}
          <p className="text-center text-slate-600 text-sm mt-8">
            Não tem uma conta?{' '}
            <a
              href="/register"
              className="font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              Registre-se
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;