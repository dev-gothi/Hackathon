import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, Shield, Lock, Mail, User, Phone, CheckCircle, ArrowRight } from 'lucide-react';

export const AuthPage = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({ email, password, full_name: fullName, phone });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      background: 'radial-gradient(circle at 50% 10%, #f0fdfa, #f8fafc 60%)'
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 10px 20px rgba(13, 148, 136, 0.25)',
          marginBottom: '16px'
        }}>
          <Heart size={30} fill="#ffffff" />
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
          Care<span style={{ color: '#0d9488' }}>Circle</span>
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', marginTop: '4px' }}>
          Connected Elderly Care, Medication Escalation & Wellbeing
        </p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        padding: '32px',
        overflow: 'hidden'
      }}>
        {/* Tab switch */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => { setIsRegister(false); setError(''); }}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              background: !isRegister ? '#ffffff' : 'transparent',
              color: !isRegister ? '#0f172a' : '#64748b',
              boxShadow: !isRegister ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(''); }}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              background: isRegister ? '#ffffff' : 'transparent',
              color: isRegister ? '#0f172a' : '#64748b',
              boxShadow: isRegister ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#b91c1c',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Miller"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 40px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 40px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 40px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Phone Number (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 40px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '13px',
              borderRadius: '10px',
              background: '#0d9488',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* Demo Fast Logins Section */}
        <div style={{ marginTop: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            ⚡ 1-Click Demo Evaluation Roles
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => handleDemoLogin('john@example.com', 'password123')}
              disabled={loading}
              style={{
                textAlign: 'left',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #ccfbf1',
                background: '#f0fdfa',
                color: '#0f766e',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              👨‍⚕️ Primary Caretaker
              <span style={{ display: 'block', fontSize: '10px', color: '#14b8a6', fontWeight: 500 }}>John (Tier 1)</span>
            </button>

            <button
              onClick={() => handleDemoLogin('sarah@example.com', 'password123')}
              disabled={loading}
              style={{
                textAlign: 'left',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #e0f2fe',
                background: '#f0f9ff',
                color: '#0369a1',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              👩‍⚕️ Secondary Caretaker
              <span style={{ display: 'block', fontSize: '10px', color: '#0ea5e9', fontWeight: 500 }}>Sarah (Tier 2)</span>
            </button>

            <button
              onClick={() => handleDemoLogin('emily@example.com', 'password123')}
              disabled={loading}
              style={{
                textAlign: 'left',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #f1f5f9',
                background: '#f8fafc',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              👁️ Family Viewer
              <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 500 }}>Emily (Read-only)</span>
            </button>

            <button
              onClick={() => handleDemoLogin('grandma@example.com', 'password123')}
              disabled={loading}
              style={{
                textAlign: 'left',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #ede9fe',
                background: '#faf5ff',
                color: '#6d28d9',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              👵 Elderly Patient
              <span style={{ display: 'block', fontSize: '10px', color: '#8b5cf6', fontWeight: 500 }}>Rose (Patient UI)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
