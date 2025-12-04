import Image from 'next/image';
import { ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';

interface LandingPageProps {
    onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center relative overflow-hidden selection:bg-blue-500/30">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />

            <div className="max-w-5xl mx-auto px-6 text-center relative z-10 py-20">
                {/* Logo/Icon */}
                <div className="mb-8 flex justify-center">
                    <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 rotate-3 hover:rotate-6 transition-transform duration-500 border border-white/10 group">
                        <Image
                            src="/logo.png"
                            alt="DocuScan AI Logo"
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                            priority
                            sizes="128px"
                        />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                        DocuScan AI
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                    Transform your physical documents into perfect digital copies with the power of
                    <span className="text-blue-400 font-medium"> Advanced AI</span>.
                </p>

                {/* CTA Button */}
                <button
                    onClick={onStart}
                    className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full text-lg font-bold hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
                >
                    Start Scanning
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left">
                    <FeatureCard
                        icon={<Sparkles className="w-6 h-6 text-blue-400" />}
                        title="AI Enhancement"
                        desc="Intelligent edge detection and perspective correction powered by Vision LLMs."
                    />
                    <FeatureCard
                        icon={<Zap className="w-6 h-6 text-purple-400" />}
                        title="Instant Processing"
                        desc="Real-time client-side cropping and optimization using WebAssembly."
                    />
                    <FeatureCard
                        icon={<Shield className="w-6 h-6 text-green-400" />}
                        title="Privacy First"
                        desc="Your documents are processed securely with enterprise-grade standards."
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-gray-600 text-sm">
                Powered by Advanced Vision AI
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm group">
            <div className="mb-4 p-3 bg-white/5 rounded-xl w-fit group-hover:scale-110 transition-transform">{icon}</div>
            <h3 className="text-lg font-bold mb-2 text-gray-100">{title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">{desc}</p>
        </div>
    )
}
