import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader, ChevronRight, LogOut } from 'lucide-react';
import confetti from 'confetti-js';

export const Onboarding = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [username, setUsername] = useState('');
  const [usernameOptions, setUsernameOptions] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const triggerConfetti = () => {
    setShowConfetti(true);

    // Defer until the canvas is in the DOM
    requestAnimationFrame(() => {
      const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const confettiSettings = {
        target: canvas,
        max: 100,
        size: 1,
        animate: true,
        props: ['circle', 'square'],
        colors: [[165, 142, 251], [233, 212, 96], [72, 187, 120]],
        clock: 25,
        timings: 30
      };
      const confettiInstance = new confetti(confettiSettings);
      confettiInstance.render();

      setTimeout(() => {
        confettiInstance.clear();
        setShowConfetti(false);
      }, 3000);
    });
  };

  const generateUsernameOptions = async () => {
    if (!firstName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('https://stocial.eliverdiaz72.workers.dev/api/generate-usernames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName })
      });

      const data = await response.json();
      setUsernameOptions(data.usernames || []);
      setUsername(data.usernames?.[0] || '');
    } catch (err) {
      console.error('Error generating usernames:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 1 && !firstName.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (step === 1) {
      setError('');
      setStep(2);
    } else if (step === 2 && !lastName.trim()) {
      setError('El apellido es requerido');
      return;
    } else if (step === 2) {
      setError('');
      setStep(3);
    } else if (step === 3 && !birthDate) {
      setError('La fecha de nacimiento es requerida');
      return;
    } else if (step === 3) {
      setError('');
      await generateUsernameOptions();
      setStep(4);
    }
  };

  const handleUsernameSelect = (selected: string) => {
    setUsername(selected);
  };

  const handleCompleteOnboarding = async () => {
    if (!username.trim()) {
      setError('El nombre de usuario es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://stocial.eliverdiaz72.workers.dev/api/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user?.uid,
          email: user?.email,
          firstName,
          lastName,
          birthDate,
          username,
          profilePictureUrl: user?.photoURL
        })
      });

      if (response.ok) {
        // Refrescar el usuario en el contexto
        await refreshUser();
        triggerConfetti();
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError('Error al completar el onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Error al completar el onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-background/50 flex items-center justify-center px-4 py-12 relative">
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6 p-2 rounded-lg hover:bg-foreground/10 transition-colors"
        title="Cerrar sesión"
      >
        <LogOut className="w-5 h-5" />
      </button>

      <div className="w-full max-w-3xl flex flex-col items-center justify-center gap-8 text-center">
        {/* Progress bar */}
        <div className="w-full max-w-xl">
          <div className="flex justify-between mb-2 text-sm font-medium text-muted-foreground">
            <span>Paso {step} de 4</span>
            <span>{Math.round((step / 4) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        <div className="glass-card w-full max-w-xl p-10 rounded-3xl flex flex-col items-center gap-8">
          {/* Step 1: First Name */}
          {step === 1 && (
            <div className="animate-fade-in flex flex-col items-center text-center gap-4 w-full">
              <h2 className="text-3xl font-bold">¿Cuál es tu nombre?</h2>
              <p className="text-muted-foreground text-lg">Esto es lo que verán en tu perfil</p>
              <input
                type="text"
                placeholder="Tu nombre"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 bg-background border border-muted rounded-lg focus:outline-none focus:border-foreground transition-colors text-center text-lg"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}

          {/* Step 2: Last Name */}
          {step === 2 && (
            <div className="animate-fade-in flex flex-col items-center text-center gap-4 w-full">
              <h2 className="text-3xl font-bold">¿Cuál es tu apellido?</h2>
              <p className="text-muted-foreground text-lg">Completa tu nombre completo</p>
              <input
                type="text"
                placeholder="Tu apellido"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 bg-background border border-muted rounded-lg focus:outline-none focus:border-foreground transition-colors text-center text-lg"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}

          {/* Step 3: Birth Date */}
          {step === 3 && (
            <div className="animate-fade-in flex flex-col items-center text-center gap-4 w-full">
              <h2 className="text-3xl font-bold">¿Cuándo naciste?</h2>
              <p className="text-muted-foreground text-lg">Necesitamos tu fecha de nacimiento</p>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 bg-background border border-muted rounded-lg focus:outline-none focus:border-foreground transition-colors text-center text-lg"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}

          {/* Step 4: Username */}
          {step === 4 && (
            <div className="animate-fade-in flex flex-col items-center text-center gap-4 w-full">
              <h2 className="text-3xl font-bold">Elige tu nombre de usuario</h2>
              <p className="text-muted-foreground text-lg">Puedes cambiar esto más tarde</p>
              <div className="space-y-3 max-h-48 overflow-y-auto w-full">
                {usernameOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleUsernameSelect(option)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left font-medium ${username === option
                      ? 'border-foreground bg-foreground/5'
                      : 'border-muted hover:border-muted-foreground/50'
                      }`}
                  >
                    @{option}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 px-4 rounded-lg border border-muted hover:border-foreground transition-colors font-semibold"
              >
                Atrás
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <>Continuar <ChevronRight className="w-4 h-4" /></>}
              </button>
            ) : (
              <button
                onClick={handleCompleteOnboarding}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : '¡Empezar!'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showConfetti && (
        <canvas
          id="confetti-canvas"
          className="fixed inset-0 w-full h-full pointer-events-none z-50"
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
