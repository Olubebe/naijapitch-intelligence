
import React, { useEffect, useState } from 'react';
import { useAuthData } from '@neondatabase/neon-js/auth/react';
import { authClient, getAuthToken } from '../lib/auth';
import { Trophy, Building2, ShieldCheck, Upload, ArrowRight, CheckCircle2, LogOut, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SignedIn, UserButton } from '@neondatabase/neon-js/auth/react/ui';

export function RegisterClub() {
  const { data: session } = useAuthData({ queryFn: () => authClient.getSession() });
  const user = (session as any)?.user;
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    npflId: '',
    logoUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<any>(null);

  const handleLogoUpload = async (file: File | null) => {
    if (!file) {
      setFormData((current) => ({ ...current, logoUrl: '' }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }

    if (file.size > 1_500_000) {
      toast.error('Logo image must be smaller than 1.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((current) => ({
        ...current,
        logoUrl: typeof reader.result === 'string' ? reader.result : ''
      }));
    };
    reader.onerror = () => {
      toast.error('Could not read the selected image.');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const loadRequestStatus = async () => {
      if (!session) return;
      const idToken = await getAuthToken(session);
      if (!idToken) return;

      try {
        const res = await fetch('/api/clubs/my-request', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        setRequestStatus(data);
        if (data.club?.status === 'PENDING' || data.club?.status === 'REJECTED') {
          setStep(3);
        }
      } catch (err) {
        console.error('Failed to load request status', err);
      }
    };

    loadRequestStatus();
  }, [session]);

  const handleRegister = async () => {
    if (!user) {
      toast.error('You must be signed in to register a club.');
      return;
    }

    const idToken = await getAuthToken(session);
    if (!idToken) {
      console.error('No valid token found in session:', session);
      toast.error('Authentication session is invalid. Please sign out and sign in again.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/admin/register-club', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      toast.success('Club submitted for approval.');
      setRequestStatus({
        club: {
          id: data.clubId,
          name: formData.name,
          status: data.status,
          submitted_at: data.submittedAt,
          review_due_at: data.reviewDueAt,
          is_active: false
        },
        userStatus: 'PENDING_APPROVAL',
        role: 'USER'
      });
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Failed to register club. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="bg-green-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-green-100">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Registration</h1>
          <p className="text-gray-500">Please sign in first to register your football club.</p>
          <Link 
            to="/auth/signin" 
            className="inline-block bg-green-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-800 transition-all"
          >
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FBF9]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-green-700 p-1.5 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent">
                NaijaPitch Intelligence
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <SignedIn>
                <button 
                  onClick={() => authClient.signOut().then(() => window.location.href = '/')}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-600 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      <div className="py-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                step >= i ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'bg-white text-gray-400 border-2 border-gray-200'
              }`}
            >
              {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 p-8 md:p-12 border border-gray-100">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">Club Information</h2>
                <p className="text-gray-500">Tell us about your organization to get started.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Official Club Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Kano Pillars FC"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">NPFL ID / License Number (Optional)</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      value={formData.npflId}
                      onChange={(e) => setFormData({...formData, npflId: e.target.value})}
                      placeholder="NPFL-XXX-000"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                disabled={!formData.name}
                className="w-full bg-green-700 text-white font-bold py-5 rounded-2xl hover:bg-green-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                Next Step <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">Branding & Finalize</h2>
                <p className="text-gray-500">Upload your club logo and confirm your details.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Club Logo</label>
                  <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-5 transition-all hover:border-green-400 hover:bg-green-50/40">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-gray-200">
                      <Upload className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-900">Upload logo image</div>
                      <div className="text-xs text-gray-500">PNG, JPG, or WEBP up to 1.5MB</div>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                  {formData.logoUrl && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Logo Preview</div>
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                          <img
                            src={formData.logoUrl}
                            alt="Club logo preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData((current) => ({ ...current, logoUrl: '' }))}
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove logo
                        </button>
                      </div>
                    </div>
                  )}
                  {!formData.logoUrl && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <ImageIcon className="w-4 h-4" />
                      Optional: You can add this later in settings.
                    </div>
                  )}
                </div>

                <div className="p-6 bg-green-50 rounded-2xl border border-green-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Club Name:</span>
                    <span className="font-bold text-green-800">{formData.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Admin Email:</span>
                    <span className="font-bold text-green-800">{user.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Logo Status:</span>
                    <span className="font-bold text-green-800">{formData.logoUrl ? 'Image selected' : 'No logo uploaded'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-5 rounded-2xl hover:bg-gray-200 transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={handleRegister}
                  disabled={isSubmitting}
                  className="flex-[2] bg-green-700 text-white font-bold py-5 rounded-2xl hover:bg-green-800 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-8 animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12 text-amber-700" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">
                  {requestStatus?.club?.status === 'REJECTED' ? 'Club Request Rejected' : 'Club Under Review'}
                </h2>
                <p className="text-gray-500">
                  {requestStatus?.club?.status === 'REJECTED'
                    ? (requestStatus?.club?.rejection_reason || 'Your request was reviewed and rejected. Please update your details and submit again.')
                    : 'Your club is registered but inactive until a super admin approves it. Review takes 24 to 72 hours.'}
                </p>
              </div>
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-left space-y-3">
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500">Club:</span>
                  <span className="font-bold text-amber-900">{requestStatus?.club?.name || formData.name}</span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-bold text-amber-900">{requestStatus?.club?.status || 'PENDING'}</span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500">Submitted:</span>
                  <span className="font-bold text-amber-900">
                    {requestStatus?.club?.submitted_at ? new Date(requestStatus.club.submitted_at).toLocaleString() : 'Just now'}
                  </span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500">Review By:</span>
                  <span className="font-bold text-amber-900">
                    {requestStatus?.club?.review_due_at ? new Date(requestStatus.club.review_due_at).toLocaleString() : 'Within 72 hours'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-900 text-white font-bold py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-100"
              >
                Return to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
