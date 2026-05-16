import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, ArrowRight, ChevronDown, DollarSign, Clock, BarChart3, Shield,
    Database, Settings2, Eye, Zap, Lock, Calculator, ClipboardList, Target,
    UserCheck, Globe, Server, TrendingUp
} from 'lucide-react';

// ─── Scroll Reveal Hook ─────────────────────────────────────────────────────
const useScrollReveal = () => {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('sr-visible'); }),
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
        document.querySelectorAll('.sr').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);
};

// ─── Animated Counter ───────────────────────────────────────────────────────
export const Counter = ({ target, suffix = '', prefix = '' }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                let current = 0;
                const steps = 55;
                const inc = target / steps;
                const timer = setInterval(() => {
                    current += inc;
                    if (current >= target) { setCount(target); clearInterval(timer); }
                    else setCount(Math.floor(current));
                }, 2000 / steps);
            }
        }, { threshold: 0.5 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target]);
    return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// ─── Shared CSS ─────────────────────────────────────────────────────────────
const LandingStyles = () => (
    <style>{`
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Scroll Progress Bar ─────────────────────── */
        .lp-progress {
            position: fixed; top: 0; left: 0; height: 3px; z-index: 200;
            background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
            transition: width 0.08s linear;
            box-shadow: 0 0 12px rgba(99,102,241,0.7);
        }

        /* ── Section Nav Dots ────────────────────────── */
        .lp-dots {
            position: fixed; right: 24px; top: 50%; transform: translateY(-50%);
            z-index: 50; display: flex; flex-direction: column; gap: 10px;
        }
        .lp-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: rgba(255,255,255,0.18);
            border: 1px solid rgba(255,255,255,0.1);
            cursor: pointer; transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .lp-dot:hover { background: rgba(255,255,255,0.45); transform: scale(1.3); }
        .lp-dot.active {
            background: #6366f1; border-color: #8b5cf6;
            box-shadow: 0 0 10px rgba(99,102,241,0.7);
            transform: scale(1.4);
        }

        /* ── Enhanced Scroll Reveal ─── 3D perspective ── */
        .sr {
            opacity: 0;
            transform: perspective(900px) rotateX(14deg) translateY(50px);
            transition: opacity 1s cubic-bezier(0.16,1,0.3,1),
                        transform 1s cubic-bezier(0.16,1,0.3,1);
            will-change: opacity, transform;
        }
        .sr-left {
            transform: perspective(900px) translateX(-70px) rotateY(10deg) !important;
        }
        .sr-right {
            transform: perspective(900px) translateX(70px) rotateY(-10deg) !important;
        }
        .sr-scale {
            transform: perspective(900px) scale(0.8) !important;
            opacity: 0 !important;
        }
        .sr-visible {
            opacity: 1 !important;
            transform: perspective(900px) rotateX(0deg) translateY(0) translateX(0) rotateY(0deg) scale(1) !important;
        }

        /* Stagger children inside a revealed container */
        .stagger-children > * {
            opacity: 0;
            transform: perspective(900px) translateY(30px) rotateX(8deg);
            transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .stagger-children.sr-visible > *:nth-child(1) { opacity:1; transform:none; transition-delay: 0ms; }
        .stagger-children.sr-visible > *:nth-child(2) { opacity:1; transform:none; transition-delay: 90ms; }
        .stagger-children.sr-visible > *:nth-child(3) { opacity:1; transform:none; transition-delay: 180ms; }
        .stagger-children.sr-visible > *:nth-child(4) { opacity:1; transform:none; transition-delay: 270ms; }

        /* ── Orb Animations ──────────────────────────── */
        @keyframes float-a { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(30px,-28px) scale(1.04)} 70%{transform:translate(-18px,18px) scale(0.97)} }
        @keyframes float-b { 0%,100%{transform:translate(0,0)} 35%{transform:translate(-25px,22px)} 70%{transform:translate(18px,-15px)} }
        @keyframes float-c { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,24px) scale(1.06)} }
        .orb-a { animation: float-a 14s ease-in-out infinite; }
        .orb-b { animation: float-b 18s ease-in-out infinite; }
        .orb-c { animation: float-c 22s ease-in-out infinite 3s; }

        /* ── Pulse / Bounce ──────────────────────────── */
        @keyframes pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.6)} 50%{box-shadow:0 0 0 8px rgba(99,102,241,0)} }
        .pulse-dot { animation: pulse-dot 2s ease infinite; }
        @keyframes bounce-y { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        .bounce { animation: bounce-y 1.9s ease-in-out infinite; }

        /* ── Shimmer line across sections ────────────── */
        @keyframes shimmer-line { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
        .section-shimmer {
            position: relative; overflow: hidden;
        }
        .section-shimmer::after {
            content:''; position:absolute; top:0; left:0; height:1px; width:25%;
            background: linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent);
            animation: shimmer-line 3s ease-in-out infinite;
        }

        /* ── Gradient text ───────────────────────────── */
        .g-text { background: linear-gradient(135deg,#fff 0%,#c4b5fd 45%,#818cf8 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .g-text-primary { background: linear-gradient(135deg,#a5b4fc,#8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

        /* ── Nav ─────────────────────────────────────── */
        .lp-nav { position:fixed; top:0; left:0; right:0; z-index:100; transition: background 0.4s, box-shadow 0.4s; }
        .lp-nav.scrolled { background:rgba(9,9,15,0.95); backdrop-filter:blur(30px); box-shadow: 0 1px 0 rgba(99,102,241,0.15), 0 8px 32px rgba(0,0,0,0.4); }
        .lp-nav.top { background:rgba(9,9,15,0.5); backdrop-filter:blur(12px); border-bottom:1px solid rgba(255,255,255,0.04); }
        .lp-nav-inner { max-width:1100px; margin:0 auto; height:66px; display:flex; align-items:center; justify-content:space-between; padding:0 40px; }
        .lp-nav-link { color:rgba(255,255,255,0.6); font-size:0.88rem; font-weight:500; cursor:pointer; transition:color 0.2s; background:none; border:none; padding:0; font-family:inherit; }
        .lp-nav-link:hover { color:#fff; }

        /* ── Buttons ─────────────────────────────────── */
        .lp-btn { padding:13px 26px; border-radius:12px; font-weight:700; font-size:0.9rem; cursor:pointer; transition:all 0.3s; display:inline-flex; align-items:center; gap:8px; font-family:inherit; }
        .lp-btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none; color:#fff; box-shadow:0 8px 24px rgba(99,102,241,0.35); }
        .lp-btn-primary:hover { transform:translateY(-2px) scale(1.02); box-shadow:0 16px 40px rgba(99,102,241,0.55); }
        .lp-btn-ghost { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); color:#fff; }
        .lp-btn-ghost:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.28); transform:translateY(-2px); }

        /* ── Sections ────────────────────────────────── */
        .lp-section { max-width:1100px; margin:0 auto; padding:120px 40px; }
        .section-pill { display:inline-flex; align-items:center; gap:7px; padding:5px 15px; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.22); border-radius:100px; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#a5b4fc; margin-bottom:1.25rem; }

        /* ── Wave divider ────────────────────────────── */
        .wave-div { display:block; width:100%; overflow:hidden; line-height:0; }
        .wave-div svg { display:block; width:100%; }

        /* ── Grid ────────────────────────────────────── */
        .features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        .db-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }

        /* ── Feature card ────────────────────────────── */
        .feat-card { padding:1.75rem; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:20px; transition: border-color 0.35s, box-shadow 0.35s, background 0.35s, opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1); }
        .feat-card:hover { background:rgba(99,102,241,0.06); border-color:rgba(99,102,241,0.3); transform:translateY(-6px) !important; box-shadow:0 28px 56px rgba(99,102,241,0.14); }

        /* ── DB card ─────────────────────────────────── */
        .db-card { padding:1.75rem; background:rgba(255,255,255,0.025); border-radius:18px; cursor:default; transition: border-color 0.3s, box-shadow 0.3s, opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1); }
        .db-card:hover { transform:translateY(-5px) scale(1.02) !important; box-shadow: 0 24px 48px rgba(0,0,0,0.2); }

        /* ── Hero stat ───────────────────────────────── */
        .hero-stat { background:rgba(255,255,255,0.06); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:14px 20px; transition: transform 0.3s, box-shadow 0.3s; }
        .hero-stat:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(99,102,241,0.2); }

        @media(max-width:768px) {
            .features-grid,.db-grid { grid-template-columns:1fr !important; }
            .lp-nav-inner { padding:0 20px; }
            .lp-section { padding:80px 20px; }
            .lp-nav-links { display:none; }
            .lp-dots { display:none; }
        }
    `}</style>
);

// ─── Scroll helpers ─────────────────────────────────────────────────────────
const useScrollProgress = () => {
    const [p, setP] = useState(0);
    useEffect(() => {
        const h = () => {
            const total = document.documentElement.scrollHeight - window.innerHeight;
            setP(total > 0 ? (window.scrollY / total) * 100 : 0);
        };
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);
    return p;
};

const useSectionTracker = (ids) => {
    const [active, setActive] = useState(ids[0]);
    useEffect(() => {
        const obs = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
            { threshold: 0.35 }
        );
        ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, []);
    return active;
};

const useNavScroll = () => {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);
    return scrolled;
};

// ─── Wave SVG Divider ────────────────────────────────────────────────────────
const Wave = ({ flip = false }) => (
    <div className="wave-div" style={{ background: flip ? 'rgba(99,102,241,0.02)' : '#09090f' }}>
        <svg viewBox="0 0 1440 72" preserveAspectRatio="none" style={{ transform: flip ? 'scaleX(-1)' : 'none' }}>
            <path d="M0,36 C240,72 480,0 720,36 C960,72 1200,0 1440,36 L1440,72 L0,72 Z"
                fill={flip ? '#09090f' : 'rgba(99,102,241,0.02)'} />
        </svg>
    </div>
);


// ─── NAVBAR ─────────────────────────────────────────────────────────────────
const Navbar = ({ navigate }) => {
    const scrolled = useNavScroll();
    const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    return (
        <nav className={`lp-nav ${scrolled ? 'scrolled' : 'top'}`}>
            <div className="lp-nav-inner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={18} color="#fff" />
                    </div>
                    <span style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                        SmartHR<span style={{ color: '#8b5cf6' }}>+</span>
                    </span>
                </div>
                <div className="lp-nav-links" style={{ display: 'flex', gap: '2rem' }}>
                    {[['Features', 'features'], ['How It Works', 'howitworks'], ['Database', 'database'], ['Stats', 'stats']].map(([l, id]) => (
                        <button key={id} className="lp-nav-link" onClick={() => scrollTo(id)}>{l}</button>
                    ))}
                </div>
                <button className="lp-btn lp-btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }} onClick={() => navigate('/login')}>
                    Login <ArrowRight size={15} />
                </button>
            </div>
        </nav>
    );
};

// ─── SECTION 1: HERO ────────────────────────────────────────────────────────
const HeroSection = ({ navigate }) => (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', paddingTop: '66px' }}>
        {/* Animated orbs */}
        <div className="orb-a" style={{ position: 'absolute', top: '8%', left: '-4%', width: '520px', height: '520px', background: 'radial-gradient(circle,rgba(99,102,241,0.16) 0%,transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div className="orb-b" style={{ position: 'absolute', top: '35%', right: '-6%', width: '450px', height: '450px', background: 'radial-gradient(circle,rgba(139,92,246,0.14) 0%,transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div className="orb-c" style={{ position: 'absolute', bottom: '5%', left: '38%', width: '320px', height: '320px', background: 'radial-gradient(circle,rgba(99,102,241,0.09) 0%,transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Dot grid — needs both webkit and standard mask for cross-browser */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(99,102,241,0.12) 1px, transparent 1px)', backgroundSize: '36px 36px', pointerEvents: 'none', WebkitMaskImage: 'radial-gradient(ellipse at center,black 30%,transparent 80%)', maskImage: 'radial-gradient(ellipse at center,black 30%,transparent 80%)' }} />

        <div className="lp-section" style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', paddingTop: '60px', paddingBottom: '60px' }}>
            {/* Live badge */}
            <div className="sr sr-scale" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 20px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '100px' }}>
                    <div className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        Enterprise HR & Payroll System · Powered by Azure SQL
                    </span>
                </div>
            </div>

            {/* Headline */}
            <h1 className="sr" style={{ transitionDelay: '100ms', fontSize: 'clamp(2.6rem, 5.5vw, 4.8rem)', fontWeight: '900', lineHeight: 1.06, letterSpacing: '-0.03em', margin: '0 auto 1.75rem', maxWidth: '860px' }}>
                <span className="g-text">The Future of</span>
                <br />
                <span style={{ color: '#fff' }}>HR Management</span>
                <br />
                <span className="g-text">Starts Here</span>
            </h1>

            {/* Sub */}
            <p className="sr" style={{ transitionDelay: '200ms', fontSize: 'clamp(1rem, 1.8vw, 1.15rem)', color: 'rgba(255,255,255,0.52)', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.8 }}>
                SmartHR+ unifies attendance, payroll, recruitment, performance, and workforce analytics into one intelligent platform — backed by enterprise-grade SQL stored procedures, triggers, and real-time views.
            </p>

            {/* CTAs */}
            <div className="sr" style={{ transitionDelay: '300ms', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}>
                <button className="lp-btn lp-btn-primary" onClick={() => navigate('/login')}>
                    Launch Dashboard <ArrowRight size={17} />
                </button>
                <button className="lp-btn lp-btn-ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                    Explore Features <ChevronDown size={17} />
                </button>
            </div>

            {/* Floating stat pills */}
            <div className="sr stagger-children" style={{ transitionDelay: '400ms', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '5rem' }}>
                {[
                    { icon: <Users size={16} color="#6366f1" />, label: 'Employees Managed', val: '500+' },
                    { icon: <DollarSign size={16} color="#10b981" />, label: 'Payroll Automated', val: '100%' },
                    { icon: <Clock size={16} color="#f59e0b" />, label: 'Attendance Real-time', val: 'Live' },
                    { icon: <BarChart3 size={16} color="#8b5cf6" />, label: 'Analytics Views', val: '3 SQL' },
                ].map(({ icon, label, val }) => (
                    <div key={label} className="hero-stat" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#fff' }}>{val}</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Scroll indicator */}
            <div className="bounce" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll</span>
                <ChevronDown size={18} />
            </div>
        </div>
    </section>
);

// ─── SECTION 2: FEATURES ────────────────────────────────────────────────────
const FeaturesSection = () => {
    const features = [
        { icon: <Clock size={24} />, color: '#6366f1', title: 'Smart Attendance', desc: 'Clock-in/out via stored procedures. Working hours auto-calculated. Punctuality leaderboards via SQL views.' },
        { icon: <DollarSign size={24} />, color: '#10b981', title: 'Automated Payroll', desc: 'One-click salary generation via sp_GenerateMonthlyPayroll. Tax computed by fn_CalculateTax. Bonuses & deductions managed.' },
        { icon: <Users size={24} />, color: '#8b5cf6', title: 'Recruitment Pipeline', desc: 'Kanban-style applicant tracking. Interview scheduling. One-click hire enrolls via sp_AddEmployee with full validation.' },
        { icon: <BarChart3 size={24} />, color: '#f59e0b', title: 'Workforce Analytics', desc: 'Real-time productivity scores, burnout risk detection, and attrition prediction — all powered by SQL views and aggregations.' },
        { icon: <Shield size={24} />, color: '#ec4899', title: 'Role-Based Access', desc: 'JWT-secured routes. Admin, HR Director, Finance, and Employee roles — each with scoped data visibility.' },
        { icon: <BarChart3 size={24} />, color: '#06b6d4', title: 'Performance & KPIs', desc: 'Review scores, reward points, KPI definitions, and the vw_ProductivityScore view surface actionable employee insights.' },
    ];

    return (
        <section id="features" className="section-shimmer" style={{ background: 'rgba(99,102,241,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Wave />
            <div className="lp-section">
                <div className="sr sr-scale" style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <div className="section-pill"><BarChart3 size={11} /> Core Modules</div>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                        Everything HR Needs,<br /><span className="g-text">In One Platform</span>
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.75 }}>
                        Every module is backed by SQL stored procedures, real database logic — not just UI.
                    </p>
                </div>

                <div className="features-grid stagger-children sr">
                    {features.map(({ icon, color, title, desc }, i) => (
                        <div key={title} className="feat-card" style={{ borderLeft: `3px solid ${color}` }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: '1.25rem' }}>
                                {icon}
                            </div>
                            <h3 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.6rem', color: '#fff' }}>{title}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75 }}>{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
            <Wave flip />
        </section>
    );
};



// ─── SECTION 3: HOW IT WORKS ────────────────────────────────────────────────
const HowItWorksSection = () => {
    const steps = [
        { n: '01', color: '#6366f1', icon: <ClipboardList size={26} color="#fff" />, title: 'Post a Job Opening', desc: 'HR creates a job listing on the public portal. Candidates apply through the self-service form — no login required. Applications land directly in the SQL Applicants table.', dir: 'left' },
        { n: '02', color: '#8b5cf6', icon: <Target size={26} color="#fff" />, title: 'Screen & Interview', desc: 'HR reviews applications in the Kanban pipeline. Schedule interviews with a single click — dates recorded in the Interviews table. Score candidates inline.', dir: 'right' },
        { n: '03', color: '#10b981', icon: <UserCheck size={26} color="#fff" />, title: 'Hire & Enroll', desc: 'Click "Hire" to trigger sp_AddEmployee — a transactional stored procedure that creates the employee record, user account, and fires the audit trigger atomically.', dir: 'left' },
        { n: '04', color: '#f59e0b', icon: <DollarSign size={26} color="#fff" />, title: 'Run Payroll', desc: 'Each month, one click calls sp_GenerateMonthlyPayroll. It reads salary structures, bonuses, deductions, and computes tax via fn_CalculateTax. Pay slips generated instantly.', dir: 'right' },
    ];

    return (
        <section id="howitworks" style={{ background: '#09090f' }}>
            <div className="lp-section">
                <div className="sr sr-scale" style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <div className="section-pill"><Zap size={11} /> Workflow</div>
                    <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                        From Application<br /><span className="g-text">to Payslip</span>
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.75 }}>
                        The entire HR lifecycle handled in one connected flow — each step backed by real SQL logic.
                    </p>
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {/* Center spine */}
                    <div className="steps-center-spine" style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'linear-gradient(to bottom, rgba(99,102,241,0.6), rgba(139,92,246,0.3), transparent)', transform: 'translateX(-50%)' }} />

                    {steps.map(({ n, color, icon, title, desc, dir }, i) => (
                        <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '2rem', marginBottom: i < steps.length - 1 ? '3rem' : 0 }}>
                            {/* Left side */}
                            {dir === 'left' ? (
                                <div className="sr sr-left" style={{ transitionDelay: `${i * 100}ms` }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`, borderRadius: '20px', padding: '2rem', marginRight: '1rem' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>Step {n}</div>
                                        <h3 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.6rem' }}>{title}</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75 }}>{desc}</p>
                                    </div>
                                </div>
                            ) : <div />}

                            {/* Center node */}
                            <div className="sr sr-scale" style={{ transitionDelay: `${i * 100}ms`, width: '56px', height: '56px', borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 8px ${color}18, 0 0 0 16px ${color}08`, flexShrink: 0, zIndex: 1 }}>
                                {icon}
                            </div>

                            {/* Right side */}
                            {dir === 'right' ? (
                                <div className="sr sr-right" style={{ transitionDelay: `${i * 100}ms` }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`, borderRadius: '20px', padding: '2rem', marginLeft: '1rem' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>Step {n}</div>
                                        <h3 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.6rem' }}>{title}</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75 }}>{desc}</p>
                                    </div>
                                </div>
                            ) : <div />}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── SECTION 4: DATABASE ARCHITECTURE ──────────────────────────────────────
const DatabaseSection = () => {
    const objects = [
        { icon: <Database size={22} />, count: '17', label: 'Relational Tables', color: '#6366f1', desc: 'Employees, Payroll, Attendance, Leaves, Interviews, KPIs, Shifts & more — fully normalized.' },
        { icon: <Settings2 size={22} />, count: '3', label: 'Stored Procedures', color: '#8b5cf6', desc: 'sp_AddEmployee, sp_MarkAttendance, sp_GenerateMonthlyPayroll — transactional & parameterized.' },
        { icon: <Calculator size={22} />, count: '2', label: 'Scalar Functions', color: '#ec4899', desc: 'fn_CalculateTax computes progressive tax. fn_GetLeaveBalance enforces leave quotas.' },
        { icon: <Eye size={22} />, count: '3', label: 'SQL Views', color: '#10b981', desc: 'vw_ProductivityScore, vw_BurnoutRisk, vw_AttritionRisk — powering the analytics dashboard.' },
        { icon: <Zap size={22} />, count: '1', label: 'Trigger', color: '#f59e0b', desc: 'trg_UpdateEmployeeHistory fires AFTER UPDATE — automatic audit trail for every department or designation change.' },
        { icon: <Lock size={22} />, count: '100%', label: 'Parameterized Queries', color: '#06b6d4', desc: 'Zero raw SQL concatenation. All inputs are bound parameters — immune to SQL injection.' },
    ];

    return (
        <section id="database" style={{ background: 'rgba(99,102,241,0.02)' }}>
            <Wave />
            <div className="lp-section">
                <div className="sr sr-scale" style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <div className="section-pill"><Database size={11} /> Database</div>
                    <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                        Enterprise-Grade<br /><span className="g-text">SQL Architecture</span>
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.75 }}>
                        SmartHR+ is not a spreadsheet wrapper. Every operation invokes real SQL objects on <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Azure SQL</strong>.
                    </p>
                </div>

                <div className="db-grid stagger-children sr">
                    {objects.map(({ icon, count, label, color, desc }, i) => (
                        <div key={label} className="db-card" style={{ border: `1px solid ${color}20` }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: '0.75rem' }}>{icon}</div>
                            <div style={{ fontWeight: '900', fontSize: '2rem', color, lineHeight: 1, marginBottom: '4px' }}>{count}</div>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.6rem', color: '#fff' }}>{label}</div>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Azure badge */}
                <div className="sr sr-scale" style={{ marginTop: '4rem', display: 'flex', justifyContent: 'center', transitionDelay: '300ms' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '12px 24px', background: 'rgba(0,120,212,0.1)', border: '1px solid rgba(0,120,212,0.25)', borderRadius: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg,#0078d4,#00b7c3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', color: '#fff' }}>Az</div>
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#60a5fa' }}>Hosted on Microsoft Azure SQL</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Production database · Always-on availability</div>
                        </div>
                    </div>
                </div>
            </div>
            <Wave flip />
        </section>
    );
};

// ─── SECTION 5: STATS ───────────────────────────────────────────────────────
const StatsSection = () => (
    <section id="stats" style={{ background: '#09090f' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))', borderTop: '1px solid rgba(99,102,241,0.12)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <div className="lp-section" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
                <div className="sr sr-scale" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <div className="section-pill"><BarChart3 size={11} /> By The Numbers</div>
                    <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        Real Scale. <span className="g-text">Real Impact.</span>
                    </h2>
                </div>
                <div className="sr stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(255,255,255,0.07)', borderRadius: '20px', overflow: 'hidden' }}>
                    {[
                        { val: 17, suffix: '', label: 'Database Tables', sub: 'Fully normalized schema', color: '#6366f1' },
                        { val: 8, suffix: '', label: 'SQL Modules', sub: 'SPs, Functions & Views', color: '#8b5cf6' },
                        { val: 10, suffix: '+', label: 'API Endpoints', sub: 'Per module', color: '#10b981' },
                        { val: 6, suffix: '', label: 'Access Roles', sub: 'JWT-enforced', color: '#f59e0b' },
                    ].map(({ val, suffix, label, sub, color }) => (
                        <div key={label} style={{ background: '#09090f', padding: '3rem 2rem', textAlign: 'center' }}>
                            <div style={{ fontWeight: '900', fontSize: 'clamp(2.5rem,5vw,4rem)', color, lineHeight: 1, marginBottom: '0.5rem' }}>
                                <Counter target={val} suffix={suffix} />
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{sub}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </section>
);

// ─── SECTION 6: CTA ─────────────────────────────────────────────────────────
const CTASection = ({ navigate }) => (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#09090f', paddingBottom: '0' }}>
        <div className="orb-a" style={{ position: 'absolute', top: '-30%', left: '20%', width: '600px', height: '600px', background: 'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <Wave />
        <div className="lp-section" style={{ textAlign: 'center', position: 'relative', zIndex: 1, background: 'rgba(99,102,241,0.02)' }}>
            <div className="sr sr-scale">
                <div className="section-pill" style={{ marginBottom: '2rem' }}><TrendingUp size={11} /> Get Started</div>
                <h2 style={{ fontSize: 'clamp(2.2rem,5vw,3.8rem)', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '1.5rem', lineHeight: 1.1 }}>
                    Ready to Transform<br /><span className="g-text">Your HR Operations?</span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.8 }}>
                    Log in to your dashboard and experience the full power of SmartHR+ — from payroll automation to predictive workforce intelligence.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
                    <button className="lp-btn lp-btn-primary" style={{ padding: '16px 36px', fontSize: '1rem' }} onClick={() => navigate('/login')}>
                        Launch Dashboard <ArrowRight size={20} />
                    </button>
                    <button className="lp-btn lp-btn-ghost" style={{ padding: '16px 36px', fontSize: '1rem' }} onClick={() => navigate('/apply')}>
                        View Open Positions
                    </button>
                </div>
                {/* Trust badges */}
                <div className="sr stagger-children" style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[
                        { icon: <Lock size={13} />, label: 'JWT Auth' },
                        { icon: <Database size={13} />, label: 'Azure SQL' },
                        { icon: <Server size={13} />, label: 'Serverless API' },
                        { icon: <Globe size={13} />, label: 'Vercel Deployed' },
                    ].map(({ icon, label }) => (
                        <span key={label} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            {icon} {label}
                        </span>
                    ))}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4rem 40px', textAlign: 'center', background: 'rgba(99,102,241,0.02)' }}>
            <div className="sr sr-scale" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={13} color="#fff" />
                </div>
                <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>SmartHR<span style={{ color: '#8b5cf6' }}>+</span></span>
            </div>
            <p className="sr" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', transitionDelay: '100ms' }}>
                Built as a DBMS Project · Powered by Azure SQL, Node.js & React
            </p>
        </div>
    </section>
);

// ─── MAIN LANDING PAGE ───────────────────────────────────────────────────────
const Landing = () => {
    const navigate = useNavigate();
    useScrollReveal();
    const progress = useScrollProgress();
    const activeSection = useSectionTracker(['hero', 'features', 'howitworks', 'database', 'stats']);

    return (
        <div style={{ background: '#09090f', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
            <LandingStyles />
            
            {/* Scroll Progress Bar */}
            <div className="lp-progress" style={{ width: `${progress}%` }} />

            {/* Section Dots */}
            <div className="lp-dots">
                {['hero', 'features', 'howitworks', 'database', 'stats'].map(id => (
                    <div
                        key={id}
                        className={`lp-dot ${activeSection === id ? 'active' : ''}`}
                        onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                        title={id.charAt(0).toUpperCase() + id.slice(1)}
                    />
                ))}
            </div>

            <Navbar navigate={navigate} />
            
            <div id="hero">
                <HeroSection navigate={navigate} />
            </div>
            <FeaturesSection />
            <HowItWorksSection />
            <DatabaseSection />
            <StatsSection />
            <CTASection navigate={navigate} />
        </div>
    );
};

export default Landing;

