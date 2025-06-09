import { SignInButton, SignUpButton, UserButton, currentUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Code, Users, Zap, Shield, Globe, Rocket } from 'lucide-react';

export default async function Home() {
  const user = await currentUser();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Code className="h-8 w-8 text-blue-400" />
          <span className="text-2xl font-bold text-white">DSA IDE</span>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-medium transition"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <SignInButton mode="modal">
                <button className="text-white hover:text-blue-400 transition">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-medium transition">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Code. Collaborate. <span className="text-blue-400">Create.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            The ultimate online IDE for Data Structures and Algorithms with real-time collaboration, 
            instant execution, and powerful debugging tools.
          </p>
          {!user && (
            <SignUpButton mode="modal">
              <button className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-white text-lg font-semibold transition transform hover:scale-105">
                Start Coding for Free
              </button>
            </SignUpButton>
          )}
          {user && (
            <Link 
              href="/dashboard"
              className="inline-block bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-white text-lg font-semibold transition transform hover:scale-105"
            >
              Go to Dashboard
            </Link>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <Zap className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Instant Execution</h3>
            <p className="text-gray-300">
              Run your code instantly with support for multiple programming languages including Python, JavaScript, C++, and Java.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <Users className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Real-time Collaboration</h3>
            <p className="text-gray-300">
              Share your projects with teammates and collaborate in real-time with live editing and commenting features.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <Shield className="h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Secure & Private</h3>
            <p className="text-gray-300">
              Your code is secure with enterprise-grade authentication and privacy controls for all your projects.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <Globe className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Share Anywhere</h3>
            <p className="text-gray-300">
              Generate shareable links for your projects with customizable permissions for viewing or editing.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <Code className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Advanced Editor</h3>
            <p className="text-gray-300">
              Monaco editor with syntax highlighting, auto-completion, and debugging tools for a premium coding experience.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <Rocket className="h-12 w-12 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Always Free</h3>
            <p className="text-gray-300">
              Core features are completely free forever. No hidden costs, no execution limits for personal use.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-12 border border-white/20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to start coding?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of developers who trust DSA IDE for their coding projects.
          </p>
          {!user && (
            <SignUpButton mode="modal">
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 rounded-lg text-white text-lg font-semibold transition transform hover:scale-105">
                Create Free Account
              </button>
            </SignUpButton>
          )}
        </div>
      </div>
    </main>
  );
}