import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0f0f13] text-white flex flex-col font-sans selection:bg-indigo-500/30">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]"></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 text-xl">L</div>
                    <span className="font-bold text-2xl tracking-tight">LX<span className="text-gray-400 font-normal">Log</span></span>
                </div>
                <div className="flex gap-6 items-center">


                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto mt-[-5vh]">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-fade-in-up">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    v0.2.0 Now Available
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                    A new option for<br />
                    <span className="text-indigo-500">lighting documentation</span>
                </h1>

                <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed font-light">
                    Secure and Local First. LXLog brings an easy to use basic Lighting Documentation web app. No license or subscription required.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <Link
                        to="/app"
                        className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 group"
                    >
                        Launch Application
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>

                    <a
                        href="https://ko-fi.com/lxlog"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95 border border-zinc-700 hover:border-zinc-600 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5 text-[#FF5E5B]" fill="currentColor" viewBox="0 0 24 24"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 3.722-2.271 3.722-2.271l2.708-4.562s.467-2.859.219-4.646zm-5.065 10.508c-.284.444-1.921.284-3.513.298-2.528.023-11.396.059-11.344-.943.056-10.702.046-10.701.046-10.701h19.558c.28.066.381.566.273.861l-1.905 3.097c-1.353 2.193-2.451 4.542-3.115 6.649zm4.722-5.748s.527-1.396.121-2.235c-.244-.503-.984-.131-1.39-.028-1.574 2.536-1.916 5.86-1.916 5.86 3.654-.087 3.195-2.071 3.185-3.597z" /></svg>
                        Support on Ko-fi
                    </a>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-6 text-center text-zinc-600 text-sm">
                <p>&copy; {new Date().getFullYear()} Kaelen Perchuk. All rights reserved.</p>
            </footer>
        </div>
    );
}
