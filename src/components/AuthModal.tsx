import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '../types';
import { X, Mail, Lock, User as UserIcon, Briefcase, Store } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotPassword, setForgotPassword] = useState(false);

  if (!isOpen) return null;

  // Load or create user profile
  const loadOrCreateUser = async (userId: string, userEmail: string, userName?: string): Promise<User> => {
    try {
      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingUser) {
        return existingUser as User;
      }

      // Create new user if doesn't exist
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            name: userName || userEmail.split('@')[0] || 'User',
            email: userEmail,
            role: role,
            avatar_url: null,
            manufacturer_id: null,
            created_at: new Date().toISOString(),
            status: 'active'
          }
        ])
        .select('*')
        .single();

      if (createError) throw createError;
      if (!newUser) throw new Error('Failed to create user profile');

      return newUser as User;
    } catch (error) {
      console.error('Error in loadOrCreateUser:', error);
      throw error;
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
      setForgotPassword(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      toast.error('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  // Handle auth submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (forgotPassword) {
        await handleForgotPassword();
        return;
      }

      if (isLogin) {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });

        if (error) throw error;

        if (!data.user) {
          throw new Error('No user data returned');
        }

        // Load or create user profile
        const user = await loadOrCreateUser(data.user.id, data.user.email || email);
        onSuccess(user);
        
        toast.success(`Welcome back, ${user.name}!`);
        onClose();
      } else {
        // SIGN UP
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
              role: role
            }
          }
        });

        if (error) throw error;

        if (!data.user) {
          throw new Error('No user data returned');
        }

        // Load or create user profile
        const user = await loadOrCreateUser(data.user.id, data.user.email || email, name);
        onSuccess(user);
        
        toast.success(`Welcome to DirectSource, ${user.name}! Account created successfully.`);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const errorMessage = err.message || 'Authentication failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setRole(UserRole.CUSTOMER);
    setError(null);
    setForgotPassword(false);
  };

  // Toggle between login/signup
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  // Handle forgot password click
  const handleForgotPasswordClick = () => {
    setForgotPassword(true);
    setError(null);
  };

  // Handle back to login
  const handleBackToLogin = () => {
    setForgotPassword(false);
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl font-black">DS</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {forgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Join DirectSource'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {forgotPassword 
                    ? 'Enter your email to reset password' 
                    : 'Direct factory access for everyone.'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !forgotPassword && (
              <>
                {/* Name Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    I want to join as:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.CUSTOMER)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        role === UserRole.CUSTOMER
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Store className="w-5 h-5" />
                      <span className="text-sm font-bold">Consumer</span>
                      <span className="text-xs text-slate-500">Buy products</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.MANUFACTURER)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        role === UserRole.MANUFACTURER
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Briefcase className="w-5 h-5" />
                      <span className="text-sm font-bold">Manufacturer</span>
                      <span className="text-xs text-slate-500">Sell products</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Email Field (always shown except forgot password back button) */}
            {!forgotPassword ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Enter your email address to reset password
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            )}

            {/* Password Field (only for login/signup) */}
            {!forgotPassword && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            )}

            {/* Forgot Password Link (only on login) */}
            {isLogin && !forgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
                loading
                  ? 'bg-slate-400 cursor-wait'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {forgotPassword ? 'Sending...' : 'Processing...'}
                </span>
              ) : forgotPassword ? (
                'Send Reset Link'
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Toggle between auth modes */}
          {!forgotPassword ? (
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-slate-600 text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="ml-2 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          ) : (
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← Back to Sign In
              </button>
            </div>
          )}

          {/* Terms and Privacy */}
          {!isLogin && !forgotPassword && (
            <div className="mt-6">
              <p className="text-xs text-slate-500 text-center">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-indigo-600 font-bold hover:underline">Terms</a> and{' '}
                <a href="#" className="text-indigo-600 font-bold hover:underline">Privacy Policy</a>
              </p>
            </div>
          )}

          {/* Demo Credentials */}
          {isLogin && !forgotPassword && (
            <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-700 mb-1">Demo Credentials:</p>
              <div className="text-xs text-slate-600 space-y-1">
                <p>Email: demo@directsource.com</p>
                <p>Password: demopassword123</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;


// import React, { useState } from 'react';
// import { supabase } from '@/lib/supabase';
// import { User, UserRole } from '../types';

// interface AuthModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onSuccess: (user: User) => void;
// }

// const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
//   const [isLogin, setIsLogin] = useState(true);
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [name, setName] = useState('');
//   const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   if (!isOpen) return null;

// const loadOrCreateProfile = async (
//   userId: string,
//   defaultData?: Partial<User>
// ): Promise<User> => {
//   if (!defaultData?.email) {
//     throw new Error('Cannot create profile without an email.');
//   }

//   // 1️⃣ Check if profile exists by user ID
//   const { data: existingById, error: errorById } = await supabase
//     .from('profiles')
//     .select('*')
//     .eq('id', userId)
//     .maybeSingle();

//   if (errorById) throw errorById;
//   if (existingById) return existingById as User;

//   // 2️⃣ Check if profile exists by email (to avoid duplicate email)
//   const { data: existingByEmail, error: errorByEmail } = await supabase
//     .from('profiles')
//     .select('*')
//     .eq('email', defaultData.email)
//     .maybeSingle();

//   if (errorByEmail) throw errorByEmail;
//   if (existingByEmail) return existingByEmail as User;

//   // 3️⃣ Insert new profile
//   const { data: newProfile, error: insertError } = await supabase
//     .from('profiles')
//     .insert([
//       {
//         id: userId,
//         name: defaultData.name || 'User',
//         email: defaultData.email,
//         role: defaultData.role || 'customer',
//         status: 'active',
//       },
//     ])
//     .select('*')
//     .maybeSingle();

//   if (insertError || !newProfile) throw insertError || new Error('Failed to create profile');

//   return newProfile as User;
// };

//   /* -----------------------------
//      Auth Submit
//   ----------------------------- */
//  const handleSubmit = async (e: React.FormEvent) => {
//   e.preventDefault();
//   setLoading(true);
//   setError(null);

//   try {
//     if (isLogin) {
//       /* ---------- LOGIN ---------- */
//       const { data, error } = await supabase.auth.signInWithPassword({ email, password });
//       if (error) throw error;

//       // ✅ FIX: Pass email as defaultData during login too
//       const user = await loadOrCreateProfile(data.user!.id, { email });
//       onSuccess(user);
//       onClose();
//     } else {
//       /* ---------- SIGN UP ---------- */
//       const { data, error } = await supabase.auth.signUp({ email, password });
//       if (error) throw error;

//       const authUser = data.user!;
//       const user = await loadOrCreateProfile(authUser.id, { name, email, role });
//       onSuccess(user);
//       onClose();
//     }
//   } catch (err: any) {
//     setError(err.message || 'Authentication failed');
//   } finally {
//     setLoading(false);
//   }
// };

//   /* -----------------------------
//      Helpers
//   ----------------------------- */
//   const createUserProfile = async (userId: string) => {
//     const { error } = await supabase.from('users').insert({
//       id: userId,
//       name,
//       email,
//       role,
//       status: 'active'
//     });

//     if (error) throw error;
//   };

//   // const loadUserProfile = async (userId: string): Promise<User> => {
//   //   const { data, error } = await supabase
//   //     .from('users')
//   //     .select('*')
//   //     .eq('id', userId)
//   //     .single();

//   //   if (error) throw error;
//   //   return data as User;
//   // };



//   const loadUserProfile = async (userId: string): Promise<User> => {
//   const { data, error } = await supabase
//     .from('users')
//     .select('*')
//     .eq('id', userId)
//     .maybeSingle();

//   if (error) throw error;
//   if (!data) throw new Error('User profile not found');

//   return data as User;
// };

//   /* -----------------------------
//      Render
//   ----------------------------- */
//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//       <div
//         className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
//         onClick={onClose}
//       />
//       <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
//         <div className="p-8">
//           <div className="text-center mb-8">
//             <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-xl">
//               <span className="text-white text-3xl font-black">DS</span>
//             </div>
//             <h2 className="text-2xl font-black">
//               {isLogin ? 'Welcome Back' : 'Join DirectSource'}
//             </h2>
//             <p className="text-slate-500 text-sm mt-1">
//               Direct factory access for everyone.
//             </p>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             {!isLogin && (
//               <>
//                 <div>
//                   <label className="block text-xs font-black text-slate-400 uppercase mb-1">
//                     Full Name
//                   </label>
//                   <input
//                     type="text"
//                     required
//                     value={name}
//                     onChange={e => setName(e.target.value)}
//                     className="w-full px-4 py-3 rounded-xl border"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-xs font-black text-slate-400 uppercase mb-2">
//                     Join As
//                   </label>
//                   <div className="grid grid-cols-2 gap-2">
//                     <button
//                       type="button"
//                       onClick={() => setRole(UserRole.CUSTOMER)}
//                       className={`py-2 rounded-xl text-xs font-black ${
//                         role === UserRole.CUSTOMER
//                           ? 'bg-indigo-600 text-white'
//                           : 'bg-slate-100'
//                       }`}
//                     >
//                       Consumer
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => setRole(UserRole.MANUFACTURER)}
//                       className={`py-2 rounded-xl text-xs font-black ${
//                         role === UserRole.MANUFACTURER
//                           ? 'bg-indigo-600 text-white'
//                           : 'bg-slate-100'
//                       }`}
//                     >
//                       Manufacturer
//                     </button>
//                   </div>
//                 </div>
//               </>
//             )}

//             <div>
//               <label className="block text-xs font-black text-slate-400 uppercase mb-1">
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 required
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 className="w-full px-4 py-3 rounded-xl border"
//               />
//             </div>

//             <div>
//               <label className="block text-xs font-black text-slate-400 uppercase mb-1">
//                 Password
//               </label>
//               <input
//                 type="password"
//                 required
//                 value={password}
//                 onChange={e => setPassword(e.target.value)}
//                 className="w-full px-4 py-3 rounded-xl border"
//               />
//             </div>

//             {isLogin && (
//               <div>
//                 <label className="block text-xs font-black text-slate-400 uppercase mb-2">
//                   Login Mode
//                 </label>
//                 <div className="grid grid-cols-3 gap-2">
//                   {Object.values(UserRole).map(r => (
//                     <button
//                       key={r}
//                       type="button"
//                       onClick={() => setRole(r)}
//                       className={`py-1.5 rounded-lg text-[10px] font-black ${
//                         role === r ? 'bg-slate-900 text-white' : 'bg-slate-100'
//                       }`}
//                     >
//                       {r}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {error && (
//               <p className="text-red-600 text-sm font-bold">{error}</p>
//             )}

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl mt-4 disabled:opacity-60"
//             >
//               {loading
//                 ? 'Processing...'
//                 : isLogin
//                 ? 'Sign In'
//                 : 'Create Account'}
//             </button>
//           </form>

//           <div className="mt-8 text-center">
//             <button
//               onClick={() => setIsLogin(!isLogin)}
//               className="text-sm font-bold text-indigo-600"
//             >
//               {isLogin
//                 ? "Don't have an account? Sign Up"
//                 : 'Already have an account? Sign In'}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AuthModal;
