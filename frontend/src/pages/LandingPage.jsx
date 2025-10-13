import React from 'react';

const LandingPage = ({ onGetStarted }) => {

    return (
        <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 overflow-x-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/4 left-10 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl"></div>
            </div>

            <main className="min-h-screen relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center">

                    <section className="w-full py-8 sm:py-16 lg:py-24">
                        {/* Mobile Layout (single column) - Content First, Then Mascot */}
                        <div className="lg:hidden">
                            {/* Content First on Mobile */}
                            <div className="text-center animate-fade-in-up mb-8">
                                {/* Badge/Pill */}
                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-sm font-medium mb-6 border border-amber-200/50">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    AI-Powered Learning
                                </div>

                                {/* Main Headline */}
                                <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight leading-tight mb-6">
                                    Your AI-powered
                                    <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                                        {" "}study coach{" "}
                                    </span>
                                    for any content
                                </h1>

                                {/* Subheadline */}
                                <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8 max-w-2xl mx-auto">
                                    Transform any webpage or PDF into personalized, adaptive quizzes.
                                    <span className="font-medium text-slate-700"> Private, fast, and adaptive learning</span> with AI.
                                </p>

                                {/* Mascot for Mobile - Appears After Content */}
                                <div className="flex justify-center relative mb-8">
                                    {/* Decorative background circle */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-72 h-72 sm:w-80 sm:h-80 bg-gradient-to-br from-amber-100/50 to-orange-100/50 rounded-full blur-2xl"></div>
                                    </div>

                                    {/* Mascot Image */}
                                    <div className="relative z-10 animate-float">
                                        <img
                                            src="/assets/i3.png"
                                            alt="Friendly AI mascot with cape, your study companion"
                                            className="w-64 sm:w-72 drop-shadow-2xl filter brightness-105"
                                            loading="eager"
                                            decoding="async"
                                        />
                                    </div>

                                    {/* Floating UI Elements for Mobile */}
                                    <div className="absolute top-4 right-4 animate-bounce">
                                        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2.5 shadow-lg border border-white/20">
                                            <div className="flex items-center space-x-2 text-xs">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <span className="text-slate-700 font-medium">AI Quiz Generated!</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-16 left-4 animate-pulse">
                                        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2.5 shadow-lg border border-white/20">
                                            <div className="text-xs text-slate-600 mb-1">Your Progress</div>
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
                                                <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA Section */}
                                <div className="mb-6">
                                    <button
                                        onClick={onGetStarted}
                                        className="group relative inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-xl shadow-amber-600/25 hover:shadow-amber-600/40 hover:scale-105 transform transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 w-full"
                                    >
                                        <span className="flex items-center">
                                            Get Started Free
                                            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </span>
                                    </button>
                                </div>

                                {/* Trust Indicators */}
                                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-slate-500">
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                        </svg>
                                        Secure & Private
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Smart AI
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" />
                                        </svg>
                                        Free to use
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Layout (two columns) */}
                        <div className="hidden lg:grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                            {/* Left Column: Content */}
                            <div className="text-left animate-fade-in-up">
                                {/* Badge/Pill */}
                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-sm font-medium mb-6 border border-amber-200/50">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Gemini-Powered Learning
                                </div>

                                {/* Main Headline */}
                                <h1 className="text-6xl font-display font-bold tracking-tight leading-tight mb-6">
                                    Your Gemini-powered
                                    <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                                        {" "}study coach{" "}
                                    </span>
                                    for any content
                                </h1>   

                                {/* Subheadline */}
                                <p className="text-xl text-slate-600 leading-relaxed mb-8">
                                    Transform any content into personalized, adaptive quizzes.
                                    <span className="font-medium text-slate-700"> Private, fast, and adaptive learning</span> with AI.
                                </p>

                                {/* CTA Section */}
                                <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
                                    <button
                                        onClick={onGetStarted}
                                        className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-xl shadow-amber-600/25 hover:shadow-amber-600/40 hover:scale-105 transform transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 min-h-[3rem] w-full sm:w-auto"
                                    >
                                        <span className="flex items-center">
                                            Get Started Free
                                            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </span>
                                    </button>
                                </div>

                                {/* Trust Indicators */}
                                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                        </svg>
                                        Secure & Private
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Smart AI
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" />
                                        </svg>
                                        Free to use
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Mascot */}
                            <div className="flex justify-end relative">
                                {/* Decorative background circle */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-96 h-96 bg-gradient-to-br from-amber-100/50 to-orange-100/50 rounded-full blur-2xl"></div>
                                </div>

                                {/* Mascot Image */}
                                <div className="relative z-10 animate-float">
                                    <img
                                        src="/assets/i3.png"
                                        alt="Friendly AI mascot with cape, your study companion"
                                        className="w-96 drop-shadow-2xl filter brightness-105"
                                        loading="eager"
                                        decoding="async"
                                    />
                                </div>

                                {/* Floating UI Elements for Desktop */}
                                <div className="absolute top-16 right-8 animate-bounce">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/20">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-slate-700 font-medium">AI Quiz Generated!</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-20 left-8 animate-pulse">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/20">
                                        <div className="text-xs text-slate-600 mb-1">Your Progress</div>
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                            <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
                                            <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </section>
                </div>
            </main>

            {/* Add custom styles for animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(-2deg); }
                    50% { transform: translateY(-20px) rotate(2deg); }
                }
                
                @keyframes fadeInUp {
                    0% { opacity: 0; transform: translateY(30px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                
                .animate-fade-in-up {
                    animation: fadeInUp 0.8s ease-out;
                }
            `}</style>
        </div>
    );
};

export default LandingPage;