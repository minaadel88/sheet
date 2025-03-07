import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import BalanceSheet from './components/BalanceSheet';
import BalanceSheetHistory from './components/BalanceSheetHistory';
import SignIn from './components/SignIn';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <SignIn />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-lg mb-4">
          <div className="max-w-[800px] mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="text-xl font-bold text-gray-800">ميزانية عمارة 32</div>
              <div className="flex gap-4 items-center">
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  الميزانية الحالية
                </Link>
                <Link
                  to="/history"
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  سجل الميزانيات
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-red-600 hover:text-red-700 transition-colors"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<BalanceSheet />} />
          <Route path="/history" element={<BalanceSheetHistory />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;