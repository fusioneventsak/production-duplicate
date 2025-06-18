// src/pages/JoinCollage.tsx - FIXED: Use uppercase codes consistently
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Layout from '../components/layout/Layout';

const JoinCollage: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!code.trim()) {
      setError('Please enter a collage code');
      return;
    }
    
    // FIXED: Navigate with uppercase code to match database format
    const normalizedCode = code.trim().toUpperCase();
    console.log('🔍 Navigating to photobooth with code:', normalizedCode);
    navigate(`/photobooth/${normalizedCode}`);
  };

  // Auto-convert input to uppercase for better UX
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCode(value);
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-lg shadow-xl border border-white/20">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Join a Collage</h1>
            <p className="mt-2 text-gray-300">
              Enter the code to join and contribute to a 3D photo collage
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-200">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-2">
                Collage Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={handleInputChange}
                placeholder="Enter code (e.g. ABC12345)"
                className="w-full p-3 bg-black/30 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase tracking-wider"
                maxLength={8}
              />
              <p className="text-xs text-gray-400 mt-1">
                Codes are automatically converted to uppercase
              </p>
            </div>
            
            <button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Join Collage
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Don't have a code?{' '}
              <button
                onClick={() => navigate('/')}
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Create your own collage
              </button>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default JoinCollage;