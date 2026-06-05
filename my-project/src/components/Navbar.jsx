import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCertificationsOpen, setIsCertificationsOpen] = useState(false);
  const [userCertificates, setUserCertificates] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const certButtonRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleAuthChange = () => checkAuthStatus();

    window.addEventListener('scroll', handleScroll);
    checkAuthStatus();
    loadCertificates();

    window.addEventListener('certificatesUpdated', loadCertificates);
    window.addEventListener('storage', loadCertificates);
    window.addEventListener('authStateChanged', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    window.updateAuthState = (loggedIn, email) => {
      setIsLoggedIn(loggedIn);
      if (loggedIn && email) {
        setUserName(email.split('@')[0]);
      } else {
        setUserName('');
        setUserCertificates([]);
      }
    };

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('certificatesUpdated', loadCertificates);
      window.removeEventListener('storage', loadCertificates);
      window.removeEventListener('authStateChanged', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const checkAuthStatus = () => {
    try {
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      const userEmail = localStorage.getItem('userEmail');
      if (isAuthenticated === 'true' && userEmail) {
        setIsLoggedIn(true);
        setUserName(userEmail.split('@')[0]);
      } else {
        setIsLoggedIn(false);
        setUserName('');
        setUserCertificates([]);
      }
    } catch (error) {
      setIsLoggedIn(false);
      setUserName('');
      setUserCertificates([]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isCertificationsOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        certButtonRef.current &&
        !certButtonRef.current.contains(event.target)
      ) {
        setIsCertificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCertificationsOpen]);

  const loadCertificates = () => {
    try {
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      const userEmail = localStorage.getItem('userEmail');

      if (!isAuthenticated || isAuthenticated !== 'true' || !userEmail) {
        setUserCertificates([]);
        return;
      }

      const currentUserName = userEmail.split('@')[0].toLowerCase();
      const certificatesData = localStorage.getItem('userCertificates');

      if (!certificatesData) {
        setUserCertificates([]);
        return;
      }

      let certificates = [];
      try {
        certificates = JSON.parse(certificatesData);
        if (!Array.isArray(certificates)) certificates = [];
      } catch (parseError) {
        setUserCertificates([]);
        return;
      }

      const userSpecificCerts = certificates
        .filter(cert =>
          cert &&
          cert.userName &&
          cert.domain &&
          cert.score !== undefined &&
          cert.totalQuestions !== undefined &&
          cert.userName.toLowerCase() === currentUserName
        )
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      setUserCertificates(userSpecificCerts);
    } catch (error) {
      console.error('❌ Error in loadCertificates:', error);
      setUserCertificates([]);
    }
  };

  const navLinks = [
    { name: 'Home', href: '/', type: 'route' },
    { name: 'Domains', href: '/domains', type: 'route' },
    { name: 'Certifications', href: '#certifications', type: 'certifications' },
    { name: 'Community', href: '/community', type: 'route' },
    { name: 'Contact Us', href: '/contact', type: 'route' }
  ];

  const handleNavClick = (link, e) => {
    if (link.type === 'route') {
      e.preventDefault();
      navigate(link.href);
    } else if (link.type === 'section') {
      e.preventDefault();
      const element = document.getElementById(link.href.substring(1));
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else if (link.type === 'certifications') {
      e.preventDefault();
      handleCertificationClick(e);
    }
    setIsMobileMenuOpen(false);
  };

  const handleCertificationClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !isCertificationsOpen;
    setIsCertificationsOpen(newState);
    if (newState) loadCertificates();
  };

  const handleAuthClick = () => {
    if (isLoggedIn) {
      handleLogout();
    } else {
      navigate('/login');
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');

    setIsLoggedIn(false);
    setUserName('');
    setUserCertificates([]);
    setIsCertificationsOpen(false);
    setIsMobileMenuOpen(false);

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { isLoggedIn: false }
    }));

    if (window.updateAuthState) {
      window.updateAuthState(false, null);
    }

    navigate('/');
  };

  const handleProfileClick = () => navigate('/profile');

  const handleViewCertificate = async (certificate) => {
    if (isGenerating) return;
    try {
      setIsGenerating(true);
      setIsCertificationsOpen(false);
      await generateCertificateHTML(certificate, 'view');
    } catch (error) {
      alert('❌ Error viewing certificate.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCertificate = async (certificate) => {
    if (isGenerating) return;
    try {
      setIsGenerating(true);
      setIsCertificationsOpen(false);
      await generateCertificateHTML(certificate, 'print');
    } catch (error) {
      alert('❌ Error downloading certificate.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCertificateHTML = (certificate, action) => {
    return new Promise((resolve, reject) => {
      try {
        const percentage = Math.round((certificate.score / certificate.totalQuestions) * 100);
        const performance = certificate.score >= certificate.totalQuestions * 0.8 ? 'Excellent' :
                            certificate.score >= certificate.totalQuestions * 0.6 ? 'Good' : 'Pass';
        const certificateId = certificate.id ? certificate.id.slice(-8) : Date.now().toString(36);

        const printScript = action === 'print' ? `
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 900);
            };
          <\/script>` : '';

        const certificateHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Certificate - ${certificate.userName}</title>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .certificate {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 800px;
      width: 100%;
      text-align: center;
      border: 8px solid #f59e0b;
      position: relative;
    }
    .inner-border {
      position: absolute;
      inset: 6px;
      border: 4px solid #fcd34d;
      border-radius: 14px;
      pointer-events: none;
    }
    .logo { font-size: 24px; font-weight: 900; color: #1e293b; margin-bottom: 10px; }
    .title { font-size: 36px; font-weight: 800; color: #1e293b; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px; }
    .subtitle { font-size: 18px; color: #64748b; margin-bottom: 20px; font-weight: 500; }
    .username { font-size: 48px; font-weight: 900; color: #d97706; margin: 30px 0; text-transform: uppercase; letter-spacing: 1px; }
    .achievement { font-size: 22px; color: #374151; margin-bottom: 16px; font-weight: 600; line-height: 1.5; }
    .achievement strong { font-size: 26px; color: #1e293b; }
    .score { font-size: 20px; color: #059669; font-weight: 700; margin: 16px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; background: #f8fafc; padding: 20px; border-radius: 12px; }
    .detail-item { text-align: center; }
    .detail-label { font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .detail-value { font-size: 18px; color: #1e293b; font-weight: 700; }
    .date { font-size: 15px; color: #6b7280; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature { text-align: center; }
    .signature-line { width: 180px; height: 1px; background: #374151; margin: 0 auto 8px; }
    .signature-text { font-size: 14px; color: #374151; }
    @media print {
      @page { size: A4 landscape; margin: 0; }
      body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 10px; min-height: unset; }
      .certificate { box-shadow: none !important; max-width: 100% !important; width: 100% !important; border-radius: 12px !important; padding: 30px !important; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="inner-border"></div>
    <div class="logo">🎓 Tech Fusion</div>
    <h1 class="title">Certificate of Completion</h1>
    <p class="subtitle">This is to certify that</p>
    <div class="username">${certificate.userName}</div>
    <div class="achievement">
      has successfully completed the<br>
      <strong>${certificate.domain} Quiz</strong>
    </div>
    <div class="score">Score: ${certificate.score} out of ${certificate.totalQuestions} (${percentage}%)</div>
    <div class="details-grid">
      <div class="detail-item">
        <div class="detail-label">Domain</div>
        <div class="detail-value">${certificate.domain}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Performance</div>
        <div class="detail-value">${performance}</div>
      </div>
    </div>
    <div class="date">Awarded on: ${certificate.date}</div>
    <div class="footer">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-text">Tech Fusion Team</div>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-text">Certificate ID: ${certificateId}</div>
      </div>
    </div>
  </div>
  ${printScript}
</body>
</html>`;

        const newWindow = window.open('', '_blank', 'width=1000,height=750');
        newWindow.document.write(certificateHTML);
        newWindow.document.close();
        newWindow.focus();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch (error) {
      return dateString || 'N/A';
    }
  };

  const handleHomeClick = () => navigate('/');

  return (
    <>
      <nav className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-500
        ${isScrolled
          ? 'bg-slate-900/95 backdrop-blur-2xl border-b border-white/10 shadow-2xl'
          : 'bg-slate-900/90 backdrop-blur-lg'
        }
      `}>
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleHomeClick}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-white font-bold text-sm">TF</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Tech Fusion
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
              <div className="flex items-center space-x-1 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl px-4 py-2">
                {navLinks.map((link) => (
                  <a  // ✅ FIXED - yahan <a tag tha jo cut ho gaya tha
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleNavClick(link, e)}
                    ref={link.name === 'Certifications' ? certButtonRef : null}
                    className="px-4 py-2 rounded-xl text-white hover:text-white hover:bg-white/10 transition-all duration-300 font-medium text-sm relative group"
                  >
                    {link.name}
                    {link.name === 'Certifications' && userCertificates.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    )}
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 group-hover:w-3/4"></span>
                  </a>
                ))}
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-sm">{userName}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500/20 border border-red-400/30 text-red-300 font-semibold rounded-xl hover:bg-red-500/30 transition-all duration-300"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAuthClick}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 relative overflow-hidden group"
                >
                  <span className="relative z-10">Login / Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              )}

              <button
                className="md:hidden p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                  <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                  <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Certifications Dropdown */}
        {isCertificationsOpen && (
          <div
            ref={dropdownRef}
            className="hidden md:block absolute top-full left-0 right-0 bg-slate-800/95 backdrop-blur-2xl border-b border-white/10 shadow-2xl z-50"
          >
            <div className="container mx-auto px-6 py-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-xl">My Certificates</h3>
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-500 text-white text-sm px-3 py-1 rounded-full">
                    {userCertificates.length} earned
                  </span>
                  <button
                    onClick={loadCertificates}
                    disabled={isGenerating}
                    className="text-xs text-gray-400 hover:text-white transition-colors p-1 disabled:opacity-50"
                    title="Refresh certificates"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {!isLoggedIn ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-5xl mb-4">🔒</div>
                  <p className="text-lg">Please login to view certificates</p>
                  <div className="mt-4">
                    <button
                      onClick={() => { navigate('/login'); setIsCertificationsOpen(false); }}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Login
                    </button>
                  </div>
                </div>
              ) : userCertificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userCertificates.map((certificate) => (
                    <div
                      key={certificate.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-white font-semibold text-lg flex items-center">
                          <span className="mr-2">📜</span>
                          {certificate.domain}
                        </h4>
                        <span className="text-green-400 text-sm font-bold bg-green-400/20 px-2 py-1 rounded-full">
                          {certificate.score}/{certificate.totalQuestions}
                        </span>
                      </div>

                      <p className="text-gray-300 text-sm mb-3">
                        Earned by <span className="text-white font-medium">{certificate.userName}</span>
                      </p>

                      <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
                        <span>{formatDate(certificate.date)}</span>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                          Certificate
                        </span>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewCertificate(certificate)}
                          disabled={isGenerating}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white py-2 px-3 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                        >
                          {isGenerating ? <span>⏳</span> : <><span>👁️</span><span>View</span></>}
                        </button>
                        <button
                          onClick={() => handleDownloadCertificate(certificate)}
                          disabled={isGenerating}
                          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white py-2 px-3 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                        >
                          {isGenerating ? <span>⏳</span> : <><span>📥</span><span>Download PDF</span></>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-5xl mb-4">📜</div>
                  <p className="text-lg">No certificates earned yet</p>
                  <p className="text-sm mt-2">Complete quizzes to earn certificates!</p>
                  <div className="mt-4">
                    <button
                      onClick={() => { navigate('/domains'); setIsCertificationsOpen(false); }}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Browse Domains
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        <div className={`
          md:hidden absolute top-full left-0 right-0
          bg-slate-900/95 backdrop-blur-2xl border-b border-white/10
          transition-all duration-500 overflow-hidden
          ${isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <div className="container mx-auto px-6 py-4">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <a  // ✅ FIXED - yahan bhi <a tag cut ho gaya tha
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleNavClick(link, e)}
                  className="px-4 py-3 rounded-xl text-white hover:text-white hover:bg-white/10 transition-all duration-300 font-medium border border-white/10 flex items-center justify-between"
                >
                  <span>{link.name}</span>
                  {link.name === 'Certifications' && userCertificates.length > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1">
                      {userCertificates.length}
                    </span>
                  )}
                </a>
              ))}

              {/* Mobile Certificates - sirf logged in users ke liye */}
              {isLoggedIn && userCertificates.length > 0 && (
                <div className="border-t border-white/10 pt-4 mt-2">
                  <h3 className="text-white font-bold mb-3 flex items-center">
                    <span className="mr-2">🎓</span>
                    My Certificates ({userCertificates.length})
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {userCertificates.slice(0, 3).map((certificate) => (
                      <div
                        key={certificate.id}
                        className="bg-white/5 border border-white/10 rounded-xl p-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-semibold text-sm">{certificate.domain}</h4>
                          <span className="text-green-400 text-xs font-bold bg-green-400/20 px-2 py-1 rounded-full">
                            {certificate.score}/{certificate.totalQuestions}
                          </span>
                        </div>
                        <p className="text-gray-300 text-xs mb-2">
                          {certificate.userName} • {formatDate(certificate.date)}
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => { handleViewCertificate(certificate); setIsMobileMenuOpen(false); }}
                            disabled={isGenerating}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white py-1.5 px-2 rounded text-xs transition-colors"
                          >
                            {isGenerating ? '⏳' : 'View'}
                          </button>
                          <button
                            onClick={() => { handleDownloadCertificate(certificate); setIsMobileMenuOpen(false); }}
                            disabled={isGenerating}
                            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white py-1.5 px-2 rounded text-xs transition-colors"
                          >
                            {isGenerating ? '⏳' : 'Download PDF'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {userCertificates.length > 3 && (
                      <div className="text-center text-gray-400 text-sm">
                        +{userCertificates.length - 3} more certificates
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/10">
                {isLoggedIn ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{userName}</div>
                        <div className="text-gray-400 text-sm">Logged In</div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 bg-red-500/20 border border-red-400/30 text-red-300 font-semibold rounded-xl hover:bg-red-500/30 transition-all duration-300"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAuthClick}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                  >
                    Login / Get Started
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="h-16 md:h-20"></div>
      {isCertificationsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsCertificationsOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Navbar;