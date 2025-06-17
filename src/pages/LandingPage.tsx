import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import HeroScene from '../components/three/HeroScene';
import { LandingParticleBackground, PARTICLE_THEMES } from '../components/three/LandingParticleBackground.tsx';
import { ArrowRight, Camera, CloudCog, Share2, ShieldCheck, Mail, Phone } from 'lucide-react';

// DemoRequestModal component
const DemoRequestModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventDate: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const submitData = new FormData();
      submitData.append('form-name', 'demo-request');
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('eventDate', formData.eventDate);
      submitData.append('message', formData.message);

      const response = await fetch('/', {
        method: 'POST',
        body: submitData
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', phone: '', eventDate: '', message: '' });
        setTimeout(() => {
          onClose();
          setSubmitStatus('idle');
        }, 2000);
      } else {
        throw new Error('Form submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      window.location.href = `mailto:info@fusion-events.ca?subject=Demo Request&body=Name: ${formData.name}%0AEmail: ${formData.email}%0APhone: ${formData.phone}%0AEvent Date: ${formData.eventDate}%0AMessage: ${formData.message}`;
      setSubmitStatus('success');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-black bg-opacity-75 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-900 border border-gray-700 shadow-xl rounded-2xl sm:max-w-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Request Demo</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-900/50 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-center">Thank you! We'll contact you soon to schedule your demo.</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="(416) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Event Date</label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Additional Details</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Tell us about your event (optional)"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || submitStatus === 'success'}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-all duration-200"
            >
              {isSubmitting ? 'Sending...' : 'Request Demo'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              We'll contact you within 24 hours to schedule your personalized demo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  
  // State for particle theme - shared between HeroScene and LandingParticleBackground
  const [particleTheme, setParticleTheme] = useState(PARTICLE_THEMES[0]);

  // Handle theme changes from HeroScene
  const handleThemeChange = (newTheme: typeof PARTICLE_THEMES[0]) => {
    setParticleTheme(newTheme);
  };

  return (
    <Layout>
      {/* Subtle Particle Background - Fixed behind all content */}
      <LandingParticleBackground particleTheme={particleTheme} />

      {/* Hero Section with WebGL Background ONLY */}
      <div className="relative overflow-hidden min-h-[100vh] flex items-center">
        {/* WebGL Scene Background */}
        <div className="absolute inset-0 w-full h-full">
          <HeroScene onThemeChange={handleThemeChange} />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32 pointer-events-none">
          <div className="text-center lg:text-left lg:w-1/2">
            {/* Abstract diffused gradient overlay behind text */}
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-radial from-black/50 via-black/30 to-transparent opacity-80 blur-xl"></div>
              <div className="absolute -inset-4 bg-gradient-to-br from-black/40 via-transparent to-black/20 opacity-60 blur-lg"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-black/30 via-black/10 to-transparent opacity-70 blur-md"></div>
              
              <div className="relative">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 drop-shadow-lg">
                    Share Your Memories
                  </span>
                  <span className="block drop-shadow-lg">In Beautiful 3D</span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-200 mb-8 drop-shadow-lg">
                  Create stunning 3D photo collages and share them with friends and family.
                  Easy to use - no technical skills required!
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4 pointer-events-auto">
                  <button
                    onClick={() => setIsDemoModalOpen(true)}
                    className="px-8 py-3 text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 transition-colors flex items-center justify-center shadow-lg hover:shadow-purple-500/25"
                  >
                    Request Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                  <Link
                    to="/join"
                    className="px-8 py-3 text-base font-medium rounded-md text-white bg-black/50 backdrop-blur-sm border border-white/30 hover:bg-white/20 transition-colors flex items-center justify-center shadow-lg"
                  >
                    Join Existing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Scroll Hint - Only show on mobile */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center z-10 pointer-events-none md:hidden">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="text-white/80 text-sm mb-2">Swipe up to explore features</div>
            <div className="animate-bounce flex justify-center">
              <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Interaction Hint - Only show on desktop */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center z-10 pointer-events-none hidden md:block">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="text-white/80 text-sm mb-2">Drag to explore • Auto-rotating showcase</div>
            <div className="animate-bounce flex justify-center">
              <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-black/40 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">How It Works</h2>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
              Easy to use - no technical skills required! Browser-based platform that works with your existing AV equipment.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-full p-3 inline-block mb-4">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Upload Photos</h3>
              <p className="text-gray-400">
                Upload high-quality photos in large batches from professional photographers and photobooths. Browser-based - no technical skills required!
              </p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-full p-3 inline-block mb-4">
                <CloudCog className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Auto Arrangement</h3>
              <p className="text-gray-400">
                Choose from multiple animations and patterns. Adjust camera angles, lighting, photo size, and more using simple sliders - no design skills needed!
              </p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-full p-3 inline-block mb-4">
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Display & Share</h3>
              <p className="text-gray-400">
                Full moderation controls - you decide what images are displayed. Add text to images. Easy to use with your existing AV equipment!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Event Solutions Section */}
      <div className="py-20 bg-gradient-to-b from-black/20 to-black/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Perfect for Event Professionals</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Easy add-on for DJs, event planners, festival organizers, restaurants, bands, and AV companies. Works with professional photographers and photobooths - upload high-quality photos in large batches!
            </p>
          </div>

          {/* Video and Image Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Video Section */}
            <div className="space-y-6">
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
                <iframe
                  src="https://www.youtube.com/embed/96PSJYnYzhI"
                  title="3D Selfie Holosphere Demo"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-white mb-2">See It In Action</h3>
                <p className="text-gray-400">Watch how our 3D technology brings photos to life at events</p>
              </div>
            </div>

            {/* Image Section */}
            <div className="space-y-6">
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <img
                  src="https://www.fusion-events.ca/wp-content/uploads/2025/06/3d-Selfies-1.png"
                  alt="3D Selfie Holosphere Setup"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-white mb-2">Easy Setup</h3>
                <p className="text-gray-400">Use state-of-the-art equipment for your flat-screen at home</p>
              </div>
            </div>
          </div>

          {/* Event Use Cases - The 4 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gradient-to-br from-purple-900/30 to-black/50 backdrop-blur-sm p-6 rounded-lg border border-purple-500/20">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Full Customization Control</h3>
              <p className="text-gray-400 text-sm">Multiple animations and patterns. Change camera angles, lighting, photo size, speed - all with simple sliders in real-time.</p>
            </div>

            <div className="bg-gradient-to-br from-blue-900/30 to-black/50 backdrop-blur-sm p-6 rounded-lg border border-blue-500/20">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Professional Photography</h3>
              <p className="text-gray-400 text-sm">Perfect for professional photographers and photobooths. Upload high-quality photos in large batches effortlessly.</p>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-black/50 backdrop-blur-sm p-6 rounded-lg border border-green-500/20">
              <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Moderation & Safety</h3>
              <p className="text-gray-400 text-sm">Full moderation controls - you decide what images are displayed. Add text to images. Coming soon: AI photo generation!</p>
            </div>

            <div className="bg-gradient-to-br from-pink-900/30 to-black/50 backdrop-blur-sm p-6 rounded-lg border border-pink-500/20">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-600 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Brandable & Customizable</h3>
              <p className="text-gray-400 text-sm">Add your logo with transparency support. Create branded collages that match your event or business.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Large 3D UI Sections */}
      <div className="py-20 bg-gradient-to-b from-black/60 to-black/40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Easy to Use - No Technical Skills Required</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Browser-based technology that anyone can use. Works with professional photographers and photobooths - upload high-quality photos in large batches with ease.
            </p>
          </div>

          {/* Phone Photo Preview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">Real-Time Customization Controls</h3>
              <p className="text-lg text-gray-300 mb-8">
                Easy to use with powerful customization! Choose from multiple animations and patterns. Change camera angles, floor/background colors, photo sizes, camera speed, lighting and so much more - simply using sliders to change the scene in real-time.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-300">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center mr-4 text-white text-sm font-bold">✓</div>
                  Multiple animations and patterns to choose from
                </li>
                <li className="flex items-center text-gray-300">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center mr-4 text-white text-sm font-bold">✓</div>
                  Real-time scene changes using simple sliders
                </li>
                <li className="flex items-center text-gray-300">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center mr-4 text-white text-sm font-bold">✓</div>
                  Camera angles, lighting, speed, and photo size controls
                </li>
                <li className="flex items-center text-gray-300">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center mr-4 text-white text-sm font-bold">✓</div>
                  Full moderation controls over displayed images
                </li>
              </ul>
            </div>
            
            {/* Large 3D Phone with Photo Preview */}
            <div className="flex justify-center">
              <div className="w-[320px] h-[560px] relative phone-float-animation">
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-700 rounded-[35px] relative shadow-[0_40px_80px_rgba(0,0,0,0.5)] border-4 border-gray-600">
                  <div className="absolute top-6 left-4 right-4 bottom-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[25px] overflow-hidden flex flex-col">
                    <div className="h-10 bg-black/50 flex items-center justify-between px-4 border-b border-white/10">
                      <div className="text-white text-xs font-semibold">9:41</div>
                      <div className="text-white text-xs">📶 📶 🔋</div>
                    </div>
                    <div className="flex-1 flex flex-col p-4">
                      <div className="text-white text-base font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4 text-center">Photo Preview</div>
                      
                      {/* Photo Preview Area */}
                      <div className="flex-1 bg-white/10 rounded-xl border-2 border-white/20 overflow-hidden mb-4 relative">
                        <img 
                          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                          alt="Young professional woman smiling"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                          <span className="text-white text-xs font-medium">✓ Ready</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl text-white font-semibold text-sm shadow-lg hover:shadow-purple-500/30 transition-all">
                          Submit to Collage
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button className="py-2 bg-white/10 border border-white/30 rounded-lg text-white text-xs backdrop-blur-md">
                            Retake
                          </button>
                          <button className="py-2 bg-white/10 border border-white/30 rounded-lg text-white text-xs backdrop-blur-md">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Computer Collage Editor Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Large 3D Computer with Collage Editor */}
            <div className="flex justify-center">
              <div className="w-[580px] h-[380px] relative computer-float-animation">
                <div className="w-full h-[85%] bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl relative shadow-[0_40px_80px_rgba(0,0,0,0.5)] border-6 border-gray-600">
                  <div className="absolute top-3 left-3 right-3 bottom-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="h-12 bg-black/50 flex items-center px-4 border-b border-white/10">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounde